import { Router } from 'express';
import { query, execute } from '../database/init.js';

const router = Router();

// GET /api/attendance - Get attendance records with filters
router.get('/', async (req, res) => {
  try {
    const { member_id, service_id, start_date, end_date, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (member_id) {
      params.push(member_id);
      whereClause += ` AND a.member_id = $${params.length}`;
    }
    if (service_id) {
      params.push(service_id);
      whereClause += ` AND a.service_id = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND DATE(a.check_in_time) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND DATE(a.check_in_time) <= $${params.length}`;
    }

    const totalResult = await query(
      `SELECT COUNT(*) FROM attendance a WHERE ${whereClause}`,
      params
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT a.*, m.first_name || ' ' || m.last_name as member_name, s.service_name, s.service_day
       FROM attendance a
       JOIN members m ON a.member_id = m.id
       JOIN services s ON a.service_id = s.id
       WHERE ${whereClause}
       ORDER BY a.check_in_time DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      attendance: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance/check-in - Manual check-in
router.post('/check-in', async (req, res) => {
  try {
    const { member_id, service_id, check_in_method = 'manual' } = req.body;

    if (!member_id || !service_id) {
      return res.status(400).json({ message: 'member_id and service_id are required' });
    }

    // Check if already checked in today for this service
    const existing = await query(
      `SELECT * FROM attendance
       WHERE member_id = $1 AND service_id = $2 AND DATE(check_in_time) = CURRENT_DATE AND check_out_time IS NULL`,
      [member_id, service_id]
    );

    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ message: 'Already checked in for this service' });
    }

    const result = await execute(
      `INSERT INTO attendance (member_id, service_id, check_in_method, check_in_time, created_by)
       VALUES ($1, $2, $3, NOW(), $4) RETURNING *`,
      [member_id, service_id, check_in_method, req.user?.id || null]
    );

    res.status(201).json({ message: 'Checked in successfully', attendance: result.rows[0] });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Failed to check in' });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', async (req, res) => {
  try {
    const { attendance_id } = req.body;

    if (!attendance_id) {
      return res.status(400).json({ message: 'attendance_id is required' });
    }

    await execute(
      `UPDATE attendance SET check_out_time = NOW() WHERE id = $1 AND check_out_time IS NULL`,
      [attendance_id]
    );

    res.json({ message: 'Checked out successfully' });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Failed to check out' });
  }
});

// GET /api/attendance/qr/:memberId - Generate/retrieve QR code for member
router.get('/qr/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;

    // Verify member exists
    const memberResult = await query('SELECT * FROM members WHERE id = $1', [memberId]);
    if (!memberResult.rows || memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check for existing active QR code
    let qrResult = await query(
      `SELECT * FROM member_qr_codes
       WHERE member_id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())`,
      [memberId]
    );

    if (qrResult.rows && qrResult.rows.length > 0) {
      return res.json({ qrCode: qrResult.rows[0] });
    }

    // Generate new QR code (encrypt member ID + timestamp)
    const crypto = await import('crypto');
    const secret = process.env.QR_SECRET || 'change-this-secret';
    const payload = `${memberId}:${Date.now()}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    const codeValue = `CHCMS:${payload}:${signature}`;

    const newResult = await execute(
      `INSERT INTO member_qr_codes (member_id, code_value, is_active, created_at)
       VALUES ($1, $2, true, NOW()) RETURNING *`,
      [memberId, codeValue]
    );

    res.json({ qrCode: newResult.rows[0] });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// POST /api/attendance/verify-qr - Verify QR code and check in
router.post('/verify-qr', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'QR code is required' });
    }

    // Extract payload and signature
    const parts = code.split(':');
    if (parts.length !== 3 || parts[0] !== 'CHCMS') {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }

    const [_, payload, signature] = parts;
    const secret = process.env.QR_SECRET || 'change-this-secret';

    // Verify signature
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ message: 'Invalid QR code' });
    }

    // Extract member ID
    const [memberIdStr] = payload.split(':');
    const memberId = parseInt(memberIdStr, 10);

    if (!memberId) {
      return res.status(400).json({ message: 'Invalid member ID in QR' });
    }

    // Verify QR code is still valid
    const qrResult = await query(
      `SELECT * FROM member_qr_codes
       WHERE member_id = $1 AND code_value = $2 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [memberId, code]
    );

    if (!qrResult.rows || qrResult.rows.length === 0) {
      return res.status(400).json({ message: 'QR code expired or inactive' });
    }

    // Update last used
    await execute(
      'UPDATE member_qr_codes SET last_used_at = NOW() WHERE id = $1',
      [qrResult.rows[0].id]
    );

    // Get active service (today's service)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const serviceResult = await query(
      `SELECT * FROM services WHERE service_day = $1 AND is_active = true`,
      [dayOfWeek]
    );

    if (!serviceResult.rows || serviceResult.rows.length === 0) {
      return res.status(400).json({ message: 'No active service scheduled for today' });
    }

    const service = serviceResult.rows[0];

    // Check if already checked in
    const existingResult = await query(
      `SELECT * FROM attendance
       WHERE member_id = $1 AND service_id = $2 AND DATE(check_in_time) = CURRENT_DATE AND check_out_time IS NULL`,
      [memberId, service.id]
    );

    if (existingResult.rows && existingResult.rows.length > 0) {
      return res.status(400).json({ message: 'Member already checked in for this service' });
    }

    // Perform check-in
    const checkinResult = await execute(
      `INSERT INTO attendance (member_id, service_id, check_in_method, check_in_time, created_by)
       VALUES ($1, $2, 'qr_code', NOW(), $3) RETURNING *`,
      [memberId, service.id, req.user?.id || null]
    );

    res.json({
      message: 'Check-in successful',
      attendance: checkinResult.rows[0],
      service: { id: service.id, serviceName: service.service_name }
    });
  } catch (error) {
    console.error('QR verify error:', error);
    res.status(500).json({ message: 'Failed to verify QR code' });
  }
});

// GET /api/attendance/services - List all services
router.get('/services/list', async (req, res) => {
  try {
    const result = await query('SELECT * FROM services ORDER BY service_day, service_time');
    res.json({ services: result.rows });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Failed to fetch services' });
  }
});

// GET /api/attendance/my/qr - Get current user's QR code
router.get('/my/qr', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find member linked to this user (if any)
    const memberResult = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);

    if (!memberResult.rows || memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'No member profile linked to your account' });
    }

    const memberId = memberResult.rows[0].id;

    // Trigger QR generation via existing endpoint
    const qrResult = await query(
      `SELECT * FROM member_qr_codes
       WHERE member_id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())`,
      [memberId]
    );

    if (qrResult.rows && qrResult.rows.length > 0) {
      return res.json({ qrCode: qrResult.rows[0] });
    }

    // Generate new
    return res.redirect(`/api/attendance/qr/${memberId}`);
  } catch (error) {
    console.error('Get my QR error:', error);
    res.status(500).json({ message: 'Failed to get QR code' });
  }
});

export default router;
