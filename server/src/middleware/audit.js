import { query } from '../database/init.js';

// Audit logging middleware - logs all requests to audit_logs table
export async function auditLog(action, resourceType = null, resourceId = null, oldValues = null, newValues = null) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user ? req.user.id : null,
        action,
        resourceType,
        resourceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        '${req.ip}',
        '${req.get("user-agent")}'
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
    // Don't throw - audit failures shouldn't break requests
  }
}

// Create a wrapper for route handlers to auto-audit CRUD operations
export function withAudit(operation) {
  return async (req, res, next) => {
    // Capture original JSON method
    const oldJson = res.json.bind(res);

    let responseData = null;
    let statusCode = 200;

    // Intercept response
    res.json = function(data) {
      responseData = data;
      return oldJson(data);
    };

    // Intercept status
    res.status = function(code) {
      statusCode = code;
      return oldJson.bind(res);
    };

    try {
      await operation(req, res, next);
    } finally {
      // Log after response is sent
      if (req.user) {
        const resourceType = operation.name || 'unknown';
        const success = statusCode >= 200 && statusCode < 300;

        // Log the operation
        auditLog(
          success ? operation.name : `${operation.name}_failed`,
          resourceType,
          req.params.id || null,
          null,
          { success, status: statusCode }
        );
      }
    }
  };
}
