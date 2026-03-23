import Facility from '../models/Facility.js';
import TeamPracticeBlock from '../models/TeamPracticeBlock.js';
import SportsBooking from '../models/SportsBooking.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// ═════════════════════════════════════════════════════════════════════════════
// 1. CREATE TEAM PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/captain/practice-blocks
 *
 * Captain requests a recurring practice block for their sport.
 * Block repeats every day except Sundays (daysOfWeek: [1,2,3,4,5,6]).
 * Goes to executive for approval.
 *
 * Body: { facilityId, startTime, endTime, notes }
 */
export const createTeamPracticeBlock = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        // Verify user is a captain with a sport assigned
        if (!req.user.roles.includes('captain')) {
            return errorResponse(res, 403, 'FORBIDDEN', 'Only captains can create practice blocks');
        }

        if (!req.user.captainOf) {
            return errorResponse(res, 400, 'NO_SPORT_ASSIGNED', 'You have not been assigned a sport. Contact an executive.');
        }

        const { facilityId, startTime, endTime, notes } = req.body;

        // Validation
        if (!facilityId) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Facility ID is required');
        }
        if (!startTime || !endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Start time and end time are required (e.g. "06:00", "08:00")');
        }

        // Validate time format (HH:MM)
        const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Times must be in HH:MM format (e.g. "06:00")');
        }

        if (startTime >= endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be after start time');
        }

        // Verify facility exists and matches captain's sport
        const facility = await Facility.findById(facilityId).lean();
        if (!facility) {
            return errorResponse(res, 404, 'FACILITY_NOT_FOUND', 'Facility not found');
        }

        if (facility.sportType !== req.user.captainOf) {
            return errorResponse(res, 403, 'SPORT_MISMATCH',
                `You are captain of ${req.user.captainOf} but this facility is for ${facility.sportType || 'unknown sport'}`
            );
        }

        // Check if captain already has an active/pending block for this facility
        const existingBlock = await TeamPracticeBlock.findOne({
            captain: req.user._id,
            facility: facilityId,
            status: { $in: ['pending', 'approved'] }
        }).lean();

        if (existingBlock) {
            return errorResponse(res, 409, 'BLOCK_EXISTS',
                'You already have an active or pending practice block for this facility. Edit or cancel it first.',
                { existingBlockId: existingBlock._id, existingStatus: existingBlock.status }
            );
        }

        // Days of week: Mon(1) through Sat(6) — exclude Sunday(0)
        const daysOfWeek = [1, 2, 3, 4, 5, 6];

        const block = await TeamPracticeBlock.create({
            captain: req.user._id,
            facility: facilityId,
            sport: req.user.captainOf,
            startTime,
            endTime,
            daysOfWeek,
            status: 'pending',
            notes: notes?.trim() || null
        });

        return successResponse(res, 201, {
            _id: block._id,
            facility: facility.name,
            sport: block.sport,
            startTime: block.startTime,
            endTime: block.endTime,
            daysOfWeek: block.daysOfWeek,
            status: block.status,
            message: 'Practice block request submitted for executive approval.'
        }, 'Practice block request submitted for executive approval');
    } catch (error) {
        console.error('[Captain/CreateBlock] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET MY PRACTICE BLOCKS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/captain/practice-blocks
 *
 * Returns all practice blocks belonging to the current captain.
 */
export const getMyPracticeBlocks = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const blocks = await TeamPracticeBlock.find({ captain: req.user._id })
            .populate('facility', 'name sportType location')
            .populate('reviewedBy', 'name')
            .sort({ createdAt: -1 })
            .maxTimeMS(5000)
            .lean();

        return successResponse(res, 200, {
            blocks: blocks.map(b => ({
                _id: b._id,
                facility: b.facility,
                sport: b.sport,
                startTime: b.startTime,
                endTime: b.endTime,
                daysOfWeek: b.daysOfWeek,
                status: b.status,
                reviewedBy: b.reviewedBy?.name || null,
                reviewedAt: b.reviewedAt,
                rejectionReason: b.rejectionReason,
                notes: b.notes,
                createdAt: b.createdAt
            }))
        });
    } catch (error) {
        console.error('[Captain/GetBlocks] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. EDIT TEAM PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/captain/practice-blocks/:blockId
 *
 * Captain edits their practice block timings.
 * Resets status to 'pending' for executive re-approval.
 *
 * Body: { startTime, endTime, notes }
 */
export const editTeamPracticeBlock = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { blockId } = req.params;
        const { startTime, endTime, notes } = req.body;

        const block = await TeamPracticeBlock.findById(blockId);
        if (!block) {
            return errorResponse(res, 404, 'BLOCK_NOT_FOUND', 'Practice block not found');
        }

        // Verify ownership
        if (String(block.captain) !== String(req.user._id)) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You can only edit your own practice blocks');
        }

        if (block.status === 'cancelled') {
            return errorResponse(res, 400, 'BLOCK_CANCELLED', 'Cannot edit a cancelled block. Create a new one instead.');
        }

        // Validate times if provided
        const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (startTime !== undefined) {
            if (!timePattern.test(startTime)) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'Start time must be in HH:MM format');
            }
            block.startTime = startTime;
        }

        if (endTime !== undefined) {
            if (!timePattern.test(endTime)) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be in HH:MM format');
            }
            block.endTime = endTime;
        }

        if (block.startTime >= block.endTime) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'End time must be after start time');
        }

        if (notes !== undefined) {
            block.notes = notes?.trim() || null;
        }

        // Reset status to pending for executive re-approval
        block.status = 'pending';
        block.reviewedBy = null;
        block.reviewedAt = null;
        block.rejectionReason = null;

        await block.save();

        return successResponse(res, 200, {
            _id: block._id,
            startTime: block.startTime,
            endTime: block.endTime,
            status: block.status,
            notes: block.notes
        }, 'Practice block updated. Sent for executive re-approval.');
    } catch (error) {
        console.error('[Captain/EditBlock] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. CANCEL TEAM PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/captain/practice-blocks/:blockId
 *
 * Captain cancels their practice block.
 */
export const cancelTeamPracticeBlock = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { blockId } = req.params;

        const block = await TeamPracticeBlock.findById(blockId);
        if (!block) {
            return errorResponse(res, 404, 'BLOCK_NOT_FOUND', 'Practice block not found');
        }

        // Verify ownership
        if (String(block.captain) !== String(req.user._id)) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You can only cancel your own practice blocks');
        }

        if (block.status === 'cancelled') {
            return errorResponse(res, 400, 'ALREADY_CANCELLED', 'This block is already cancelled');
        }

        block.status = 'cancelled';
        await block.save();

        return successResponse(res, 200, {
            _id: block._id,
            status: 'cancelled'
        }, 'Practice block cancelled successfully');
    } catch (error) {
        console.error('[Captain/CancelBlock] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
