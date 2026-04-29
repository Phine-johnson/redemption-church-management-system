import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/init.js';

const router = Router();

// ============================================
// CLUSTERS (Small Groups)
// ============================================

// GET /api/clusters
router.get('/', async (req, res) => {
  try {
    const { is_active = 'true', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];

    let whereClause = '1=1';
    if (is_active === 'true') {
      whereClause += ' AND c.is_active = true';
    }

    const totalResult = await query(
      `SELECT COUNT(*) FROM clusters c WHERE ${whereClause}`,
      params
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT c.*,
         l.first_name || ' ' || l.last_name as leader_name,
         dl.first_name || ' ' || dl.last_name as deputy_leader_name,
         COUNT(cm.id) as member_count
       FROM clusters c
       LEFT JOIN members l ON c.leader_id = l.id
       LEFT JOIN members dl ON c.deputy_leader_id = dl.id
       LEFT JOIN cluster_members cm ON c.id = cm.cluster_id AND cm.is_active = true
       WHERE ${whereClause}
       GROUP BY c.id, l.first_name, l.last_name, dl.first_name, dl.last_name
       ORDER BY c.cluster_name
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      clusters: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get clusters error:', error);
    res.status(500).json({ message: 'Failed to fetch clusters' });
  }
});

// GET /api/clusters/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
         l.first_name || ' ' || l.last_name as leader_name,
         l.email as leader_email,
         l.phone as leader_phone,
         dl.first_name || ' ' || dl.last_name as deputy_leader_name
       FROM clusters c
       LEFT JOIN members l ON c.leader_id = l.id
       LEFT JOIN members dl ON c.deputy_leader_id = dl.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    // Get members
    const membersResult = await query(
      `SELECT m.id, m.first_name, m.last_name, m.phone, m.email, cm.joined_at
       FROM cluster_members cm
       JOIN members m ON cm.member_id = m.id
       WHERE cm.cluster_id = $1 AND cm.is_active = true
       ORDER BY m.last_name, m.first_name`,
      [req.params.id]
    );

    const cluster = result.rows[0];
    res.json({ ...cluster, members: membersResult.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cluster' });
  }
});

// POST /api/clusters
router.post('/', async (req, res) => {
  try {
    const { clusterName, description, leaderId, deputyLeaderId, meetingDay, meetingTime, meetingLocation } = req.body;

    if (!clusterName) {
      return res.status(400).json({ message: 'clusterName is required' });
    }

    const uuid = uuidv4();
    const result = await execute(
      `INSERT INTO clusters (uuid, cluster_name, description, leader_id, deputy_leader_id, meeting_day, meeting_time, meeting_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [uuid, clusterName, description || null, leaderId || null, deputyLeaderId || null, meetingDay || null, meetingTime || null, meetingLocation || null]
    );

    res.status(201).json({ message: 'Cluster created', cluster: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create cluster' });
  }
});

// POST /api/clusters/:id/members - Add member to cluster
router.post('/:id/members', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ message: 'memberId is required' });
    }

    // Check if already in cluster
    const existing = await query(
      'SELECT id FROM cluster_members WHERE cluster_id = $1 AND member_id = $2 AND is_active = true',
      [clusterId, memberId]
    );

    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ message: 'Member already in cluster' });
    }

    await execute(
      'INSERT INTO cluster_members (cluster_id, member_id) VALUES ($1, $2)',
      [clusterId, memberId]
    );

    res.json({ message: 'Member added to cluster' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add member to cluster' });
  }
});

// DELETE /api/clusters/:id/members/:memberId - Remove member from cluster
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    await execute(
      'UPDATE cluster_members SET is_active = false WHERE cluster_id = $1 AND member_id = $2',
      [req.params.id, req.params.memberId]
    );
    res.json({ message: 'Member removed from cluster' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

// ============================================
// FOLLOW-UPS
// ============================================

// GET /api/follow-ups
router.get('/follow-ups', async (req, res) => {
  try {
    const { member_id, assigned_to, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (member_id) {
      params.push(member_id);
      whereClause += ` AND f.member_id = $${params.length}`;
    }
    if (assigned_to) {
      params.push(assigned_to);
      whereClause += ` AND f.assigned_to = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND f.status = $${params.length}`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM follow_ups f WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT f.*, m.first_name || ' ' || m.last_name as member_name,
         u.first_name || ' ' || u.last_name as assigned_to_name
       FROM follow_ups f
       JOIN members m ON f.member_id = m.id
       LEFT JOIN users u ON f.assigned_to = u.id
       WHERE ${whereClause}
       ORDER BY f.priority DESC, f.scheduled_for ASC, f.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      followUps: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({ message: 'Failed to fetch follow-ups' });
  }
});

// POST /api/follow-ups
router.post('/follow-ups', async (req, res) => {
  try {
    const { member_id, followUpType, priority, subject, description, assigned_to, scheduled_for } = req.body;

    if (!member_id || !followUpType || !subject) {
      return res.status(400).json({ message: 'member_id, followUpType, and subject are required' });
    }

    const uuid = uuidv4();
    const result = await execute(
      `INSERT INTO follow_ups (uuid, member_id, follow_up_type, priority, subject, description, assigned_to, scheduled_for, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [uuid, member_id, followUpType, priority || 'medium', subject, description || null, assigned_to || null, scheduled_for || null, req.user.id]
    );

    res.status(201).json({ message: 'Follow-up created', followUp: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create follow-up' });
  }
});

// PUT /api/follow-ups/:id/complete
router.put('/follow-ups/:id/complete', async (req, res) => {
  try {
    const { notes } = req.body;

    await execute(
      `UPDATE follow_ups SET status = 'completed', completed_at = NOW(), completed_notes = $1, updated_at = NOW() WHERE id = $2`,
      [notes || null, req.params.id]
    );

    res.json({ message: 'Follow-up marked complete' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete follow-up' });
  }
});

// ============================================
// PRAYER REQUESTS
// ============================================

// GET /api/prayer-requests
router.get('/prayer-requests', async (req, res) => {
  try {
    const { status, is_private, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    // Only show private to leaders
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Clerk' && req.user.role !== 'Pastor') {
      whereClause += ' AND (is_private = false OR assigned_to = $' + (params.length + 1) + ')';
      params.push(req.user.id);
    }

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }
    if (is_private !== undefined) {
      params.push(is_private);
      whereClause += ` AND is_private = $${params.length}`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM prayer_requests WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT pr.*, m.first_name || ' ' || m.last_name as member_name
       FROM prayer_requests pr
       LEFT JOIN members m ON pr.member_id = m.id
       WHERE ${whereClause}
       ORDER BY pr.is_urgent DESC, pr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      prayerRequests: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get prayer requests error:', error);
    res.status(500).json({ message: 'Failed to fetch prayer requests' });
  }
});

// POST /api/prayer-requests
router.post('/prayer-requests', async (req, res) => {
  try {
    const { memberId, requesterName, requesterEmail, requestText, isUrgent, isPrivate, category } = req.body;

    if (!requestText) {
      return res.status(400).json({ message: 'requestText is required' });
    }

    const uuid = uuidv4();
    const result = await execute(
      `INSERT INTO prayer_requests (uuid, member_id, requester_name, requester_email, request_text, is_urgent, is_private, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [uuid, memberId || null, requesterName || null, requesterEmail || null, requestText, isUrgent || false, isPrivate || false, category || null]
    );

    res.status(201).json({ message: 'Prayer request submitted', prayerRequest: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit prayer request' });
  }
});

// PUT /api/prayer-requests/:id/respond
router.put('/prayer-requests/:id/respond', async (req, res) => {
  try {
    const { responseText } = req.body;

    if (!responseText) {
      return res.status(400).json({ message: 'responseText is required' });
    }

    await execute(
      `UPDATE prayer_requests
       SET status = 'responded', response_text = $1, responded_at = NOW(), responded_by = $2
       WHERE id = $3`,
      [responseText, req.user.id, req.params.id]
    );

    res.json({ message: 'Prayer request responded to' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to respond to prayer request' });
  }
});

export default router;
