/**
 * Validation middleware for executive portal endpoints.
 * Separated from the shared validate.js to avoid merge conflicts.
 */

/**
 * Validate venue review request body.
 */
export const validateVenueReview = (req, res, next) => {
    const { action, reason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'action must be "approve" or "reject"'
            }
        });
    }

    if (action === 'reject' && (!reason || reason.trim().length === 0)) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'reason is required when rejecting a venue request'
            }
        });
    }

    next();
};

/**
 * Validate role update request body.
 */
export const validateRoleUpdate = (req, res, next) => {
    const { action, role } = req.body;

    if (!action || !['add', 'remove'].includes(action)) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'action must be "add" or "remove"'
            }
        });
    }

    if (!role || typeof role !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'role is required and must be a string'
            }
        });
    }

    next();
};

/**
 * Validate penalty clear request body.
 */
export const validatePenaltyClear = (req, res, next) => {
    const { action, reason } = req.body;

    if (action !== 'clear') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'action must be "clear"'
            }
        });
    }

    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'reason is required when clearing a penalty'
            }
        });
    }

    next();
};
