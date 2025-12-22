import AuditLog from '../models/AuditLog.js';

/**
 * Log audit events
 * @param {Object} req - Express request object
 * @param {Object} event - Event details
 * @param {string} event.action - Action performed (create, read, update, delete, access, etc.)
 * @param {string} event.resourceType - Type of resource (user, project, registry, etc.)
 * @param {string} event.resourceId - ID of the resource (optional)
 * @param {Object} event.details - Additional details about the event (optional)
 * @param {boolean} event.success - Whether the operation was successful
 */
export async function logAuditEvent(req, { action, resourceType, resourceId = null, details = {}, success = true }) {
  try {
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      action,
      resourceType,
      resourceId,
      details,
      success,
      projectId: req.projectId || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

export default { logAuditEvent };