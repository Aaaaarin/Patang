import { errorResponse } from '../utils/apiResponse.js';

/**
 * Validate booking creation request body.
 */
export const validateBooking = (req, res, next) => {
    const { facilityId, slotId } = req.body;
    if (!facilityId) return errorResponse(res, 400, 'VALIDATION_ERROR', 'facilityId is required');
    if (!slotId) return errorResponse(res, 400, 'VALIDATION_ERROR', 'slotId is required');
    next();
};

/**
 * Validate subscription application (after multer processing).
 */
export const validateSubscriptionApply = (req, res, next) => {
    const { facilityType, plan } = req.body;
    if (!facilityType || !['Gym', 'SwimmingPool'].includes(facilityType)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'facilityType must be Gym or SwimmingPool');
    }
    if (!plan || !['Monthly', 'Semesterly', 'Yearly'].includes(plan)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'plan must be Monthly, Semesterly, or Yearly');
    }
    if (!req.files?.medicalCert?.[0]) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'medicalCert file is required');
    }
    if (!req.files?.paymentReceipt?.[0]) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'paymentReceipt file is required');
    }
    next();
};

/**
 * Validate event creation request body.
 */
export const validateEventCreate = (req, res, next) => {
    const { title, description, category, startTime, endTime, organizingClub } = req.body;
    const allowedCategories = ['Cultural', 'Technical', 'Sports', 'Notice', 'Other'];

    if (!title || title.length > 200) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'title is required and max 200 characters');
    }
    if (!description || description.length > 2000) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'description is required and max 2000 characters');
    }
    if (!category || !allowedCategories.includes(category)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', `category must be one of: ${allowedCategories.join(', ')}`);
    }
    if (!startTime || new Date(startTime) <= new Date()) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'startTime is required and must be in the future');
    }
    if (!endTime || new Date(endTime) <= new Date(startTime)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'endTime is required and must be after startTime');
    }
    if (!organizingClub) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'organizingClub is required');
    }
    next();
};

/**
 * Validate event update request body (partial — only validates fields that are present).
 */
export const validateEventUpdate = (req, res, next) => {
    const { title, description, category, startTime, endTime } = req.body;
    const allowedCategories = ['Cultural', 'Technical', 'Sports', 'Notice', 'Other'];

    if (title !== undefined && title.length > 200) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'title max 200 characters');
    }
    if (description !== undefined && description.length > 2000) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'description max 2000 characters');
    }
    if (category !== undefined && !allowedCategories.includes(category)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', `category must be one of: ${allowedCategories.join(', ')}`);
    }
    if (startTime !== undefined && new Date(startTime) <= new Date()) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'startTime must be in the future');
    }
    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'endTime must be after startTime');
    }
    next();
};

/**
 * Validate admin action request body (approve/reject/requestChanges).
 */
export const validateAdminAction = (req, res, next) => {
    const { action } = req.body;
    const validActions = ['approve', 'reject', 'requestChanges'];
    if (!action || !validActions.includes(action)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', `action must be one of: ${validActions.join(', ')}`);
    }
    if (action === 'reject' && !req.body.rejectionReason) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'rejectionReason is required when rejecting');
    }
    if (action === 'requestChanges' && !req.body.changeRequestNote) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'changeRequestNote is required when requesting changes');
    }
    next();
};

/**
 * Validate admin subscription action (approve/reject).
 */
export const validateSubscriptionAction = (req, res, next) => {
    const { action } = req.body;
    if (!action || !['approve', 'reject'].includes(action)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be approve or reject');
    }
    if (action === 'reject' && !req.body.rejectionReason) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'rejectionReason is required when rejecting');
    }
    next();
};
