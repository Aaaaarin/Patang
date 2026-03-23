import User from '../models/User.js';
import Facility from '../models/Facility.js';
import TeamPracticeBlock from '../models/TeamPracticeBlock.js';
import SportsBooking from '../models/SportsBooking.js';
import Booking from '../models/Booking.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// ═════════════════════════════════════════════════════════════════════════════
// 1. LIST ALL CAPTAINS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/executive/captains
 *
 * List all users who have the captain role.
 */
export const listCaptains = async (req, res) => {
    try {
        const captains = await User.find({ roles: 'captain' })
            .select('name email captainOf status profileDetails.rollNumber profileDetails.department')
            .sort({ captainOf: 1, name: 1 })
            .maxTimeMS(5000)
            .lean();

        // Get available sport types for the dropdown
        const sportTypes = await Facility.distinct('sportType', {
            facilityType: 'sports',
            isOperational: true,
            sportType: { $ne: null }
        });

        return successResponse(res, 200, {
            captains: captains.map(c => ({
                _id: c._id,
                name: c.name,
                email: c.email,
                captainOf: c.captainOf || null,
                status: c.status,
                rollNumber: c.profileDetails?.rollNumber || null,
                department: c.profileDetails?.department || null
            })),
            availableSports: sportTypes.sort()
        });
    } catch (error) {
        console.error('[Executive/Captains/List] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. APPOINT A CAPTAIN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/executive/captains
 *
 * Appoint a user as captain of a sport.
 * Body: { userId, sport }
 */
export const appointCaptain = async (req, res) => {
    try {
        const { userId, sport } = req.body;

        if (!userId || !sport?.trim()) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'userId and sport are required');
        }

        const user = await User.findById(userId);
        if (!user) {
            return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
        }

        if (user.status !== 'active') {
            return errorResponse(res, 400, 'USER_INACTIVE', 'Cannot appoint an inactive or suspended user as captain');
        }

        // Verify the sport exists in facilities
        const sportExists = await Facility.findOne({
            facilityType: 'sports',
            sportType: sport.trim(),
            isOperational: true
        }).lean();

        if (!sportExists) {
            return errorResponse(res, 400, 'INVALID_SPORT', `No active sports facility found for sport: ${sport}`);
        }

        // Check if there's already a captain for this sport
        const existingCaptain = await User.findOne({
            roles: 'captain',
            captainOf: sport.trim(),
            _id: { $ne: userId }
        }).lean();

        if (existingCaptain) {
            return errorResponse(res, 409, 'CAPTAIN_EXISTS',
                `${existingCaptain.name} is already the captain of ${sport}. Dismiss them first.`,
                { existingCaptainId: existingCaptain._id, existingCaptainName: existingCaptain.name }
            );
        }

        // Add captain role if not already present
        if (!user.roles.includes('captain')) {
            user.roles.push('captain');
        }
        user.captainOf = sport.trim();

        await user.save();

        return successResponse(res, 200, {
            _id: user._id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            captainOf: user.captainOf
        }, `${user.name} has been appointed as captain of ${sport}`);
    } catch (error) {
        console.error('[Executive/Captains/Appoint] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. DISMISS A CAPTAIN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/executive/captains/:userId
 *
 * Remove captain role from a user and cancel their active practice blocks.
 */
export const dismissCaptain = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
        }

        if (!user.roles.includes('captain')) {
            return errorResponse(res, 400, 'NOT_A_CAPTAIN', 'This user is not a captain');
        }

        const sport = user.captainOf;

        // Remove captain role
        user.roles = user.roles.filter(r => r !== 'captain');
        user.captainOf = null;
        await user.save();

        // Cancel all active/pending practice blocks for this captain
        const cancelResult = await TeamPracticeBlock.updateMany(
            { captain: userId, status: { $in: ['pending', 'approved'] } },
            { $set: { status: 'cancelled' } }
        );

        return successResponse(res, 200, {
            _id: user._id,
            name: user.name,
            roles: user.roles,
            blocksCancel: cancelResult.modifiedCount
        }, `${user.name} has been dismissed as captain of ${sport}. ${cancelResult.modifiedCount} practice block(s) cancelled.`);
    } catch (error) {
        console.error('[Executive/Captains/Dismiss] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. LIST PENDING PRACTICE BLOCK REQUESTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/executive/practice-blocks/pending
 *
 * List all practice block requests awaiting executive approval.
 */
export const getPendingPracticeBlocks = async (req, res) => {
    try {
        const blocks = await TeamPracticeBlock.find({ status: 'pending' })
            .populate('captain', 'name email captainOf profileDetails.rollNumber')
            .populate('facility', 'name sportType location')
            .sort({ createdAt: 1 })
            .maxTimeMS(5000)
            .lean();

        return successResponse(res, 200, {
            pendingBlocks: blocks.map(b => ({
                _id: b._id,
                captain: {
                    _id: b.captain?._id,
                    name: b.captain?.name,
                    email: b.captain?.email,
                    rollNumber: b.captain?.profileDetails?.rollNumber || null
                },
                facility: b.facility,
                sport: b.sport,
                startTime: b.startTime,
                endTime: b.endTime,
                daysOfWeek: b.daysOfWeek,
                notes: b.notes,
                createdAt: b.createdAt
            }))
        });
    } catch (error) {
        console.error('[Executive/PracticeBlocks/Pending] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. REVIEW (APPROVE/REJECT) A PRACTICE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/executive/practice-blocks/:blockId
 *
 * Approve or reject a practice block request.
 * Body: { action: 'approve' | 'reject', rejectionReason }
 *
 * On approve: checks for conflicting existing bookings and warns the executive.
 */
export const reviewPracticeBlock = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { action, rejectionReason } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be "approve" or "reject"');
        }

        const block = await TeamPracticeBlock.findById(blockId)
            .populate('facility', 'name sportType')
            .populate('captain', 'name');

        if (!block) {
            return errorResponse(res, 404, 'BLOCK_NOT_FOUND', 'Practice block not found');
        }

        if (block.status !== 'pending') {
            return errorResponse(res, 400, 'NOT_PENDING', `Block is already ${block.status}, cannot review`);
        }

        if (action === 'reject') {
            block.status = 'rejected';
            block.rejectionReason = rejectionReason?.trim() || null;
            block.reviewedBy = req.user._id;
            block.reviewedAt = new Date();
            await block.save();

            return successResponse(res, 200, {
                _id: block._id,
                status: 'rejected',
                rejectionReason: block.rejectionReason
            }, 'Practice block rejected');
        }

        // ── Approve flow: check for conflicting bookings ─────────────────
        // Look for existing confirmed bookings on the same facility
        // on the relevant days of the week, overlapping with the block's time
        const now = new Date();
        const [startH, startM] = block.startTime.split(':').map(Number);
        const [endH, endM] = block.endTime.split(':').map(Number);

        // Check next 7 days for conflicts
        const conflicts = [];
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() + i);
            const dayOfWeek = checkDate.getDay();

            if (!block.daysOfWeek.includes(dayOfWeek)) continue;

            const dayStart = new Date(checkDate);
            dayStart.setHours(startH, startM, 0, 0);
            const dayEnd = new Date(checkDate);
            dayEnd.setHours(endH, endM, 0, 0);

            // Check SportsBooking conflicts
            const sportsConflicts = await SportsBooking.find({
                facility: block.facility._id,
                slotStartAt: { $lt: dayEnd },
                slotEndAt: { $gt: dayStart },
                status: { $in: ['confirmed', 'group_pending'] }
            })
                .populate('user', 'name email')
                .select('user slotStartAt slotEndAt status')
                .maxTimeMS(5000)
                .lean();

            for (const c of sportsConflicts) {
                conflicts.push({
                    date: checkDate.toISOString().slice(0, 10),
                    dayOfWeek,
                    booking: {
                        _id: c._id,
                        user: c.user?.name || 'Unknown',
                        slotStartAt: c.slotStartAt,
                        slotEndAt: c.slotEndAt,
                        status: c.status
                    }
                });
            }
        }

        // Approve even if conflicts exist — executive has already decided
        block.status = 'approved';
        block.reviewedBy = req.user._id;
        block.reviewedAt = new Date();
        block.rejectionReason = null;
        await block.save();

        return successResponse(res, 200, {
            _id: block._id,
            status: 'approved',
            facility: block.facility?.name,
            captain: block.captain?.name,
            conflictsFound: conflicts.length,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
            message: conflicts.length > 0
                ? `Approved with ${conflicts.length} conflicting booking(s) found in the next 7 days. Consider cancelling them.`
                : 'Approved. No conflicting bookings found.'
        }, 'Practice block approved');
    } catch (error) {
        console.error('[Executive/PracticeBlocks/Review] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
