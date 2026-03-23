import Event from '../models/Event.js';
import FacilityBlock from '../models/FacilityBlock.js';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import Feedback from '../models/Feedback.js';
import Penalty from '../models/Penalty.js';
import User from '../models/User.js';
import Facility from '../models/Facility.js';
import Booking from '../models/Booking.js';
import SportsBooking from '../models/SportsBooking.js';
import AuditLog from '../models/AuditLog.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { logAction } from '../services/auditService.js';
import { getFacilityOccupancySummary } from '../services/accessService.js';
import { getOverviewStats, getBookingTrends, getSubscriptionTrends } from '../services/analyticsService.js';
import { startOfDay, endOfDay } from '../utils/dateUtils.js';

// ═════════════════════════════════════════════════════════════════════════════
// 1. DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/executive/dashboard
 * Unified executive overview — pending counts, system health, recent actions.
 */
export const getDashboard = async (req, res) => {
    try {
        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        const [
            pendingEvents,
            pendingVenues,
            pendingSubscriptions,
            gymOccupancy,
            poolOccupancy,
            todayV1Bookings,
            todayV2Bookings,
            activePenaltyCount,
            activeSuspensionCount,
            totalUsers,
            unresolvedFeedback,
            resolvedThisWeek,
            recentActions
        ] = await Promise.all([
            Event.countDocuments({ status: 'Pending' }),
            FacilityBlock.countDocuments({ status: 'pending' }),
            SubscriptionV2.countDocuments({ status: 'Pending' }),
            getFacilityOccupancySummary('Gym'),
            getFacilityOccupancySummary('SwimmingPool'),
            Booking.countDocuments({
                status: 'Confirmed',
                slotDate: { $gte: dayStart, $lte: dayEnd }
            }),
            SportsBooking.countDocuments({
                status: { $in: ['confirmed', 'group_pending'] },
                slotStartAt: { $gte: dayStart, $lte: dayEnd }
            }),
            Penalty.countDocuments({ isActive: true }),
            Penalty.countDocuments({ isActive: true, suspendedUntil: { $gt: today } }),
            User.countDocuments({ isVerified: true }),
            Feedback.countDocuments({ status: { $in: ['submitted', 'acknowledged', 'in_progress'] } }),
            Feedback.countDocuments({
                status: 'resolved',
                updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }),
            AuditLog.find()
                .populate('actor', 'name email')
                .sort({ createdAt: -1 })
                .limit(10)
                .maxTimeMS(5000)
                .lean()
        ]);

        res.set('Cache-Control', 'private, max-age=30');
        return successResponse(res, 200, {
            pendingCounts: {
                events: pendingEvents,
                venues: pendingVenues,
                subscriptions: pendingSubscriptions
            },
            systemHealth: {
                gymOccupancy,
                poolOccupancy,
                todayBookingCount: todayV1Bookings + todayV2Bookings,
                activePenaltyCount,
                activeSuspensionCount,
                totalRegisteredUsers: totalUsers
            },
            feedbackSummary: {
                unresolved: unresolvedFeedback,
                resolvedThisWeek
            },
            recentActions
        });
    } catch (error) {
        console.error('[Executive/Dashboard] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. ANALYTICS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/executive/analytics/overview?period=30d
 */
export const getAnalyticsOverview = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const validPeriods = ['7d', '30d', '90d', '365d'];
        if (!validPeriods.includes(period)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', `period must be one of: ${validPeriods.join(', ')}`);
        }

        const stats = await getOverviewStats(period);
        res.set('Cache-Control', 'private, max-age=60');
        return successResponse(res, 200, stats);
    } catch (error) {
        console.error('[Executive/Analytics] overview error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/executive/analytics/bookings?period=30d&groupBy=day
 */
export const getBookingAnalytics = async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day', facilityType } = req.query;
        const validPeriods = ['7d', '30d', '90d'];
        const validGroupBy = ['day', 'week', 'sportType', 'facility'];

        if (!validPeriods.includes(period)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', `period must be one of: ${validPeriods.join(', ')}`);
        }
        if (!validGroupBy.includes(groupBy)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', `groupBy must be one of: ${validGroupBy.join(', ')}`);
        }

        const data = await getBookingTrends(period, groupBy, facilityType || null);
        res.set('Cache-Control', 'private, max-age=60');
        return successResponse(res, 200, data);
    } catch (error) {
        console.error('[Executive/Analytics] bookings error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/executive/analytics/subscriptions?period=90d&facilityType=Gym
 */
export const getSubscriptionAnalytics = async (req, res) => {
    try {
        const { period = '90d', facilityType } = req.query;
        const validPeriods = ['30d', '90d', '365d'];

        if (!validPeriods.includes(period)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', `period must be one of: ${validPeriods.join(', ')}`);
        }

        const trends = await getSubscriptionTrends(period, facilityType || null);

        // Append current occupancy
        const [gymOcc, poolOcc] = await Promise.all([
            getFacilityOccupancySummary('Gym'),
            getFacilityOccupancySummary('SwimmingPool')
        ]);

        res.set('Cache-Control', 'private, max-age=60');
        return successResponse(res, 200, {
            ...trends,
            currentOccupancy: {
                Gym: gymOcc,
                SwimmingPool: poolOcc
            }
        });
    } catch (error) {
        console.error('[Executive/Analytics] subscriptions error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. USER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

const EXECUTIVE_ASSIGNABLE_ROLES = ['student', 'faculty', 'caretaker', 'coach', 'coordinator', 'gym_admin', 'swim_admin'];
const ADMIN_ONLY_ROLES = ['executive', 'admin'];

/**
 * GET /api/executive/users?search=&role=&page=1&limit=20
 */
export const listUsers = async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { 'profileDetails.rollNumber': { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            query.roles = role;
        }

        if (status === 'suspended') {
            // Users with active suspension penalty
            const suspendedUserIds = await Penalty.distinct('userId', {
                isActive: true,
                suspendedUntil: { $gt: new Date() }
            });
            query._id = { $in: suspendedUserIds };
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('name email roles profileDetails isVerified createdAt lastLogin')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),
            User.countDocuments(query)
        ]);

        return successResponse(res, 200, {
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[Executive/Users] listUsers error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/executive/users/:userId
 */
export const getUserDetail = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .select('name email roles profileDetails isVerified createdAt lastLogin')
            .lean();

        if (!user) {
            return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
        }

        // Parallel fetch of related data
        const [activeSubscriptions, penaltySummary, recentBookings] = await Promise.all([
            SubscriptionV2.find({
                userId,
                status: { $in: ['Pending', 'Approved'] }
            })
                .select('facilityType plan status startDate endDate passId')
                .maxTimeMS(5000)
                .lean(),

            (async () => {
                const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const [activePenalties, noShowCount, lateCancelCount, activeSuspension] = await Promise.all([
                    Penalty.find({ userId, isActive: true }).sort({ createdAt: -1 }).lean(),
                    Penalty.countDocuments({ userId, type: 'NoShow', createdAt: { $gte: windowStart } }),
                    Penalty.countDocuments({ userId, type: 'LateCancellation', createdAt: { $gte: windowStart } }),
                    Penalty.findOne({ userId, isActive: true, suspendedUntil: { $gt: new Date() } }).lean()
                ]);
                return { activePenalties, noShowCount, lateCancelCount, activeSuspension };
            })(),

            SportsBooking.find({ user: userId })
                .populate('facility', 'name sportType')
                .sort({ slotStartAt: -1 })
                .limit(10)
                .maxTimeMS(5000)
                .lean()
                .then(bookings => bookings.map(b => ({
                    _id: b._id,
                    facilityName: b.facility?.name || 'Unknown',
                    slotStart: b.slotStartAt,
                    status: b.status,
                    source: 'v2'
                })))
        ]);

        return successResponse(res, 200, {
            user,
            activeSubscriptions,
            penaltySummary,
            recentBookings
        });
    } catch (error) {
        console.error('[Executive/Users] getUserDetail error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/executive/users/:userId/roles
 * Assign or revoke a role. Executives cannot assign 'admin' or 'executive'.
 */
export const updateUserRoles = async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, role } = req.body;

        // Validation
        if (!action || !['add', 'remove'].includes(action)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be "add" or "remove"');
        }

        if (!role) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'role is required');
        }

        // Escalation guard
        const callerIsAdmin = req.user.roles.includes('admin');
        if (ADMIN_ONLY_ROLES.includes(role) && !callerIsAdmin) {
            return errorResponse(res, 403, 'ESCALATION_DENIED', `Only admins can assign or remove the "${role}" role`);
        }

        const allValidRoles = [...EXECUTIVE_ASSIGNABLE_ROLES, ...ADMIN_ONLY_ROLES];
        if (!allValidRoles.includes(role)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', `"${role}" is not a valid role`);
        }

        const user = await User.findById(userId);
        if (!user) {
            return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
        }

        if (action === 'add') {
            if (user.roles.includes(role)) {
                return errorResponse(res, 409, 'ROLE_EXISTS', `User already has the "${role}" role`);
            }
            user.roles.push(role);
        } else {
            if (!user.roles.includes(role)) {
                return errorResponse(res, 409, 'ROLE_NOT_FOUND', `User does not have the "${role}" role`);
            }
            if (user.roles.length === 1) {
                return errorResponse(res, 400, 'LAST_ROLE', 'Cannot remove the user\'s only remaining role');
            }
            user.roles = user.roles.filter(r => r !== role);
        }

        await user.save();

        // Audit log
        await logAction(
            req.user._id,
            action === 'add' ? 'role_added' : 'role_removed',
            'User',
            userId,
            { role, previousRoles: action === 'add' ? user.roles.filter(r => r !== role) : [...user.roles, role] }
        );

        return successResponse(res, 200, {
            userId: user._id,
            roles: user.roles,
            updatedAt: user.updatedAt
        }, `Role "${role}" ${action === 'add' ? 'added to' : 'removed from'} user`);
    } catch (error) {
        console.error('[Executive/Users] updateUserRoles error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. PENALTY MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/executive/penalties?isActive=true&type=NoShow&page=1&limit=20
 */
export const listPenalties = async (req, res) => {
    try {
        const { isActive, type, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

        const query = {};
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (type) query.type = type;

        const [penalties, total, totalActive, totalInactive, activeSuspensions] = await Promise.all([
            Penalty.find(query)
                .populate('userId', 'name email profileDetails.rollNumber')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean()
                .then(results => results.map(p => ({
                    ...p,
                    user: p.userId,
                    userId: undefined
                }))),
            Penalty.countDocuments(query),
            Penalty.countDocuments({ isActive: true }),
            Penalty.countDocuments({ isActive: false }),
            Penalty.countDocuments({ isActive: true, suspendedUntil: { $gt: new Date() } })
        ]);

        return successResponse(res, 200, {
            penalties,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            summary: {
                totalActive,
                totalInactive,
                activeSuspensions
            }
        });
    } catch (error) {
        console.error('[Executive/Penalties] listPenalties error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/executive/penalties/:penaltyId
 * Clear a penalty (set isActive=false).
 */
export const updatePenalty = async (req, res) => {
    try {
        const { penaltyId } = req.params;
        const { action, reason } = req.body;

        if (action !== 'clear') {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'action must be "clear"');
        }

        if (!reason || reason.trim().length === 0) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'reason is required');
        }

        const penalty = await Penalty.findById(penaltyId);
        if (!penalty) {
            return errorResponse(res, 404, 'PENALTY_NOT_FOUND', 'Penalty not found');
        }

        if (!penalty.isActive) {
            return errorResponse(res, 400, 'ALREADY_INACTIVE', 'This penalty is already cleared');
        }

        penalty.isActive = false;
        await penalty.save();

        // Audit log
        await logAction(req.user._id, 'penalty_cleared', 'Penalty', penaltyId, {
            penaltyType: penalty.type,
            userId: penalty.userId,
            reason
        });

        return successResponse(res, 200, {
            penaltyId: penalty._id,
            isActive: false,
            clearedBy: req.user._id,
            clearedAt: penalty.updatedAt,
            reason
        }, 'Penalty cleared');
    } catch (error) {
        console.error('[Executive/Penalties] updatePenalty error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. FACILITY MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/executive/facilities?facilityType=sports&isOperational=true
 */
export const listFacilitiesAdmin = async (req, res) => {
    try {
        const { facilityType, isOperational } = req.query;
        const query = {};
        if (facilityType) query.facilityType = facilityType;
        if (isOperational !== undefined) query.isOperational = isOperational === 'true';

        const facilities = await Facility.find(query)
            .sort({ facilityType: 1, name: 1 })
            .maxTimeMS(5000)
            .lean();

        // Stats breakdown
        const allFacilities = await Facility.find().select('facilityType isOperational').lean();
        const byType = {};
        let operational = 0;
        for (const f of allFacilities) {
            byType[f.facilityType] = (byType[f.facilityType] || 0) + 1;
            if (f.isOperational) operational++;
        }

        return successResponse(res, 200, {
            facilities,
            stats: {
                total: allFacilities.length,
                operational,
                nonOperational: allFacilities.length - operational,
                byType
            }
        });
    } catch (error) {
        console.error('[Executive/Facilities] listFacilitiesAdmin error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/executive/facilities/:facilityId
 * Update facility status or capacity.
 */
export const updateFacility = async (req, res) => {
    try {
        const { facilityId } = req.params;
        const { isOperational, capacity, reason } = req.body;

        if (isOperational === undefined && capacity === undefined) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'At least one of isOperational or capacity must be provided');
        }

        if (isOperational !== undefined && !reason) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'reason is required when changing operational status');
        }

        if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 1)) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'capacity must be a positive integer');
        }

        const facility = await Facility.findById(facilityId);
        if (!facility) {
            return errorResponse(res, 404, 'FACILITY_NOT_FOUND', 'Facility not found');
        }

        const updates = {};
        const metadata = { facilityName: facility.name };

        if (isOperational !== undefined) {
            metadata.previousStatus = facility.isOperational;
            metadata.newStatus = isOperational;
            metadata.reason = reason;
            updates.isOperational = isOperational;
        }

        if (capacity !== undefined) {
            metadata.previousCapacity = facility.capacity;
            metadata.newCapacity = capacity;
            updates.capacity = capacity;
        }

        const updated = await Facility.findByIdAndUpdate(facilityId, updates, { new: true }).lean();

        // Audit log
        await logAction(req.user._id, 'facility_updated', 'Facility', facilityId, metadata);

        return successResponse(res, 200, {
            facilityId: updated._id,
            name: updated.name,
            isOperational: updated.isOperational,
            capacity: updated.capacity,
            updatedAt: updated.updatedAt
        }, 'Facility updated');
    } catch (error) {
        console.error('[Executive/Facilities] updateFacility error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. AUDIT LOG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/executive/audit-log?actor=&action=&targetType=&page=1&limit=20
 */
export const getAuditLog = async (req, res) => {
    try {
        const { actor, action, targetType, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

        const query = {};
        if (actor) query.actor = actor;
        if (action) query.action = action;
        if (targetType) query.targetType = targetType;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('actor', 'name email')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .maxTimeMS(5000)
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        return successResponse(res, 200, {
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[Executive/AuditLog] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
