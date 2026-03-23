import AuditLog from '../models/AuditLog.js';

/**
 * Log an executive action to the audit trail.
 *
 * @param {string} actorId   - The executive's user ID
 * @param {string} action    - Action type (e.g. 'venue_approved')
 * @param {string} targetType - Target model name (e.g. 'FacilityBlock')
 * @param {string} targetId  - Target document ID
 * @param {object} metadata  - Additional context (reason, old/new values, etc.)
 */
export const logAction = async (actorId, action, targetType, targetId, metadata = {}) => {
    try {
        await AuditLog.create({
            actor: actorId,
            action,
            targetType,
            targetId,
            metadata
        });
    } catch (error) {
        // Audit logging must never break the main operation
        console.error('[AuditService] Failed to log action:', error.message);
    }
};
