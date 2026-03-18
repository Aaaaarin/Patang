import Event from '../models/Event.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/v2/admin/events/pending
 * Get all events pending executive review.
 */
export const getPendingEvents = async (req, res) => {
    try {
        const events = await Event.find({ status: 'Pending' })
            .populate('createdBy', 'name email')
            .sort({ createdAt: 1 });

        return successResponse(res, 200, events);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/v2/admin/events/:eventId
 * Approve, reject, or request changes for an event.
 */
export const reviewEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { action, rejectionReason, changeRequestNote } = req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return errorResponse(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
        }

        if (!['Pending', 'ChangesRequested'].includes(event.status)) {
            return errorResponse(res, 400, 'CANNOT_REVIEW', 'Event is not in a reviewable state');
        }

        switch (action) {
            case 'approve':
                event.status = 'Approved';
                event.reviewedBy = req.user._id;
                event.reviewedAt = new Date();
                break;

            case 'reject':
                event.status = 'Rejected';
                event.rejectionReason = rejectionReason;
                event.reviewedBy = req.user._id;
                event.reviewedAt = new Date();
                break;

            case 'requestChanges':
                event.status = 'ChangesRequested';
                event.changeRequestNote = changeRequestNote;
                event.reviewedBy = req.user._id;
                event.reviewedAt = new Date();
                break;
        }

        await event.save();

        const message = action === 'approve' ? 'Event approved'
            : action === 'reject' ? 'Event rejected'
            : 'Changes requested for event';

        return successResponse(res, 200, {
            status: event.status,
            reviewedAt: event.reviewedAt
        }, message);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
