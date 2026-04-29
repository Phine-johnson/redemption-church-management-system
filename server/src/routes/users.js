import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/init.js';

const router = Router();

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (role) {
      params.push(role);
      whereClause += ` AND role = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM users WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT id, uuid, email, first_name, last_name, role, status, phone, profile_photo_url, last_login_at, created_at
       FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      users: dataResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, uuid, email, first_name, last_name, role, status, phone, profile_photo_url, last_login_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// POST /api/users - Create user
router.post('/', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const uuid = uuidv4();

    const result = await execute(
      `INSERT INTO users (uuid, email, password_hash, first_name, last_name, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, uuid, email, first_name, last_name, role, status, phone, profile_photo_url`,
      [uuid, email, passwordHash, firstName, lastName, role, phone || null]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        phone: user.phone,
        profilePhotoUrl: user.profile_photo_url
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, phone, status, password } = req.body;

    const updates = [];
    const params = [];

    if (email) {
      updates.push(`email = $${params.length + 1}`);
      params.push(email);
    }
    if (firstName) {
      updates.push(`first_name = $${params.length + 1}`);
      params.push(firstName);
    }
    if (lastName) {
      updates.push(`last_name = $${params.length + 1}`);
      params.push(lastName);
    }
    if (role) {
      updates.push(`role = $${params.length + 1}`);
      params.push(role);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${params.length + 1}`);
      params.push(phone);
    }
    if (status) {
      updates.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting self
    if (parseInt(req.user.id, 10) === parseInt(id, 10)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await execute('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// POST /api/users/:id/reset-password - Admin reset password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password required' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await execute(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    // Invalidate all sessions
    await execute('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

export default router;
