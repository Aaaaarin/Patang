import FacilityBlock from '../models/FacilityBlock.js';
import Facility from '../models/Facility.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { logAction } from '../services/auditService.js';

/**
 * GET /api/executive/venues/pending
 * List venue booking requests awaiting executive approval.
 */
export const getPendingVenues = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

        const query = { status: 'pending' };

        const [venueRequests, total] = await Promise.all([
            FacilityBlock.find(query)
                .populate('facility', 'name location capacity facilityType')
                .populate('requestedBy', 'name email')
                .sort({ createdAt: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),
            FacilityBlock.countDocuments(query)
        ]);

        return successResponse(res, 200, {
            venueRequests,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[Executive/Venues] getPendingVenues error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/executive/venues/:blockId
 * Approve or reject a venue booking request.
 */
export const reviewVenue = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { action, reason } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be "approve" or "reject"');
        }

        if (action === 'reject' && !reason) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'reason is required when rejecting');
        }

        const block = await FacilityBlock.findById(blockId).populate('facility', 'name');

        if (!block) {
            return errorResponse(res, 404, 'BLOCK_NOT_FOUND', 'No venue booking request found with this ID');
        }

        if (block.status !== 'pending') {
            return errorResponse(res, 400, 'INVALID_STATUS', `Cannot review a request with status "${block.status}"`);
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        const updated = await FacilityBlock.findOneAndUpdate(
            { _id: blockId, status: 'pending' },
            {
                status: newStatus,
                approvedBy: req.user._id,
                ...(reason && { notes: reason })
            },
            { new: true }
        );

        if (!updated) {
            return errorResponse(res, 400, 'INVALID_STATUS', 'Request was already reviewed by another executive');
        }

        // Audit log
        await logAction(
            req.user._id,
            action === 'approve' ? 'venue_approved' : 'venue_rejected',
            'FacilityBlock',
            blockId,
            {
                venueName: block.facility?.name || 'Unknown',
                startTime: block.startTime,
                endTime: block.endTime,
                reason: reason || null
            }
        );

        const message = action === 'approve' ? 'Venue booking approved' : 'Venue booking rejected';

        return successResponse(res, 200, {
            blockId: updated._id,
            status: updated.status,
            ...(action === 'approve' && {
                approvedBy: req.user._id,
                approvedAt: updated.updatedAt
            }),
            ...(action === 'reject' && { reason })
        }, message);
    } catch (error) {
        console.error('[Executive/Venues] reviewVenue error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
