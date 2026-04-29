import jwt from 'jsonwebtoken';
import { query } from '../database/init.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Authentication middleware - verifies JWT and attaches user to req.user
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database
    const result = await query(
      'SELECT id, uuid, email, first_name, last_name, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows && result.rows[0];

    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Role-based authorization middleware
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Super Admin has all permissions
    if (req.user.role === 'Super Admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

// Optional auth - doesn't fail if no token, but attaches user if present
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await query(
        'SELECT id, uuid, email, first_name, last_name, role FROM users WHERE id = $1 AND status = $2',
        [decoded.userId, 'active']
      );
      const user = result.rows && result.rows[0];
      if (user) {
        req.user = {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        };
      }
    }
  } catch (error) {
    // Silently ignore errors for optional auth
  }

  next();
}
