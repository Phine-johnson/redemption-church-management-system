import { Router } from 'express';
import { query, execute } from '../database/init.js';

const router = Router();

// GET /api/profile - Get current user profile
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const result = await query(
      `SELECT id, uuid, email, first_name, last_name, role, status, phone, profile_photo_url, last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// PUT /api/profile - Update own profile
router.put('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { firstName, lastName, phone, profilePhotoUrl } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (firstName) { updates.push(`first_name = $${paramCount}`); params.push(firstName); paramCount++; }
    if (lastName) { updates.push(`last_name = $${paramCount}`); params.push(lastName); paramCount++; }
    if (phone !== undefined) { updates.push(`phone = $${paramCount}`); params.push(phone); paramCount++; }
    if (profilePhotoUrl !== undefined) { updates.push(`profile_photo_url = $${paramCount}`); params.push(profilePhotoUrl); paramCount++; }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.user.id);

    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// POST /api/profile/change-password
router.post('/change-password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords required' });
    }

    // Import bcrypt dynamically
    const bcrypt = await import('bcryptjs');

    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await execute('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    // Invalidate all tokens
    await execute('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

export default router;
