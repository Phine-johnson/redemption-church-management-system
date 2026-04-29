import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/init.js';

const router = Router();

// ============================================
// ANNOUNCEMENTS
// ============================================

// GET /api/announcements
router.get('/', async (req, res) => {
  try {
    const { is_published, target_audience, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (is_published !== undefined) {
      params.push(is_published === 'true');
      whereClause += ` AND is_published = $${params.length}`;
    }

    // Show based on user role - see target_audience filtering
    const dataResult = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE ${whereClause}
       ORDER BY a.priority DESC, a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // Filter by target_audience in JavaScript for flexibility
    let announcements = dataResult.rows;

    // Get total count
    const totalResult = await query(`SELECT COUNT(*) FROM announcements WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    res.json({
      announcements,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

// GET /api/announcements/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ announcement: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch announcement' });
  }
});

// POST /api/announcements
router.post('/', async (req, res) => {
  try {
    const { title, content, announcementType, targetAudience, priority, isPublished, expiresAt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }

    const uuid = uuidv4();
    const publishedAt = isPublished ? new Date() : null;

    const result = await execute(
      `INSERT INTO announcements (uuid, title, content, announcement_type, target_audience, priority, is_published, published_at, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        uuid, title, content, announcementType || null,
        targetAudience ? JSON.stringify(targetAudience) : null,
        priority || 0, isPublished || false, publishedAt, expiresAt || null, req.user.id
      ]
    );

    res.status(201).json({ message: 'Announcement created', announcement: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create announcement' });
  }
});

// PUT /api/announcements/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, content, announcementType, targetAudience, priority, isPublished, expiresAt } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 1;

    const fieldMap = {
      title: 'title', content: 'content', announcementType: 'announcement_type',
      priority: 'priority', expiresAt: 'expires_at'
    };

    for (const [reqField, dbField] of Object.entries(fieldMap)) {
      if (req.body[reqField] !== undefined) {
        updates.push(`${dbField} = $${paramCount}`);
        params.push(req.body[reqField]);
        paramCount++;
      }
    }

    if (targetAudience !== undefined) {
      updates.push(`target_audience = $${paramCount}`);
      params.push(JSON.stringify(targetAudience));
      paramCount++;
    }

    if (isPublished !== undefined) {
      updates.push(`is_published = $${paramCount}`);
      params.push(isPublished);
      if (isPublished) {
        updates.push(`published_at = NOW()`);
      }
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(req.params.id);
    await execute(`UPDATE announcements SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

    res.json({ message: 'Announcement updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update announcement' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
});

// GET /api/announcements/active - Get currently published announcements
router.get('/active/list', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM announcements
       WHERE is_published = true AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY priority DESC, created_at DESC
       LIMIT 10`
    );
    res.json({ announcements: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch active announcements' });
  }
});

export default router;
