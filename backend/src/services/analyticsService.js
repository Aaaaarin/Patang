import Booking from '../models/Booking.js';
import SportsBooking from '../models/SportsBooking.js';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import Penalty from '../models/Penalty.js';
import Facility from '../models/Facility.js';
import { addDays } from '../utils/dateUtils.js';

/**
 * Parse a period string like '7d', '30d', '90d', '365d' into a start date.
 */
const periodToStartDate = (period) => {
    const days = parseInt(period) || 30;
    return addDays(new Date(), -days);
};

/**
 * Get a system-wide overview of bookings, subscriptions, penalties, and facilities
 * for a given time period.
 */
export const getOverviewStats = async (period = '30d') => {
    const startDate = periodToStartDate(period);

    const [
        // V1 booking stats
        v1Stats,
        // V2 booking stats
        v2Stats,
        // Subscription stats
        totalActiveSubs,
        newSubsThisPeriod,
        expiredSubsThisPeriod,
        pendingReviewSubs,
        gymActive,
        gymPending,
        poolActive,
        poolPending,
        // Penalty stats
        penaltiesIssued,
        noShowCount,
        lateCancelCount,
        suspensionsIssued,
        // Facility stats
        totalFacilities,
        operationalFacilities
    ] = await Promise.all([
        // V1 bookings
        Booking.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    attended: { $sum: { $cond: [{ $eq: ['$status', 'Attended'] }, 1, 0] } },
                    noShow: { $sum: { $cond: [{ $eq: ['$status', 'NoShow'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
                    lateCancelled: { $sum: { $cond: [{ $eq: ['$status', 'LateCancelled'] }, 1, 0] } }
                }
            }
        ]).maxTimeMS(5000),

        // V2 bookings
        SportsBooking.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    attended: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
                }
            }
        ]).maxTimeMS(5000),

        // Subscriptions
        SubscriptionV2.countDocuments({ status: 'Approved' }),
        SubscriptionV2.countDocuments({ status: 'Approved', createdAt: { $gte: startDate } }),
        SubscriptionV2.countDocuments({ status: 'Expired', updatedAt: { $gte: startDate } }),
        SubscriptionV2.countDocuments({ status: 'Pending' }),
        SubscriptionV2.countDocuments({ facilityType: 'Gym', status: 'Approved' }),
        SubscriptionV2.countDocuments({ facilityType: 'Gym', status: 'Pending' }),
        SubscriptionV2.countDocuments({ facilityType: 'SwimmingPool', status: 'Approved' }),
        SubscriptionV2.countDocuments({ facilityType: 'SwimmingPool', status: 'Pending' }),

        // Penalties
        Penalty.countDocuments({ createdAt: { $gte: startDate } }),
        Penalty.countDocuments({ type: 'NoShow', createdAt: { $gte: startDate } }),
        Penalty.countDocuments({ type: 'LateCancellation', createdAt: { $gte: startDate } }),
        Penalty.countDocuments({ type: 'Misuse', createdAt: { $gte: startDate } }),

        // Facilities
        Facility.countDocuments(),
        Facility.countDocuments({ isOperational: true })
    ]);

    const v1 = v1Stats[0] || { total: 0, attended: 0, noShow: 0, cancelled: 0, lateCancelled: 0 };
    const v2 = v2Stats[0] || { total: 0, attended: 0, noShow: 0, cancelled: 0 };

    const totalBookings = v1.total + v2.total;
    const totalAttended = v1.attended + v2.attended;
    const totalNoShow = v1.noShow + v2.noShow;
    const totalCancelled = v1.cancelled + v2.cancelled + (v1.lateCancelled || 0);

    return {
        period,
        bookings: {
            total: totalBookings,
            attended: totalAttended,
            noShow: totalNoShow,
            cancelled: totalCancelled,
            lateCancelled: v1.lateCancelled || 0,
            attendanceRate: (totalAttended + totalNoShow) > 0
                ? Math.round((totalAttended / (totalAttended + totalNoShow)) * 1000) / 1000
                : 0
        },
        subscriptions: {
            totalActive: totalActiveSubs,
            newThisPeriod: newSubsThisPeriod,
            expiredThisPeriod: expiredSubsThisPeriod,
            pendingReview: pendingReviewSubs,
            byType: {
                Gym: { active: gymActive, pending: gymPending },
                SwimmingPool: { active: poolActive, pending: poolPending }
            }
        },
        penalties: {
            totalIssued: penaltiesIssued,
            noShowCount,
            lateCancelCount,
            suspensionsIssued
        },
        facilities: {
            totalFacilities,
            operational: operationalFacilities,
            nonOperational: totalFacilities - operationalFacilities
        }
    };
};

/**
 * Get booking trends grouped by day, week, sportType, or facility.
 */
export const getBookingTrends = async (period = '30d', groupBy = 'day', facilityType = null) => {
    const startDate = periodToStartDate(period);

    // Build match stages for V2 bookings (primary source)
    const matchStage = { createdAt: { $gte: startDate } };
    if (facilityType) {
        // V2 SportsBooking stores facility ref; we'd need to join.
        // For simplicity, filter post-aggregation or skip for facility-level.
    }

    let groupId;
    switch (groupBy) {
        case 'week':
            groupId = { $dateToString: { format: '%Y-W%V', date: '$slotStartAt' } };
            break;
        case 'sportType':
            groupId = '$facilitySnapshot.sportType';
            break;
        case 'facility':
            groupId = '$facility';
            break;
        case 'day':
        default:
            groupId = { $dateToString: { format: '%Y-%m-%d', date: '$slotStartAt' } };
            break;
    }

    const series = await SportsBooking.aggregate([
        { $match: { slotStartAt: { $gte: startDate } } },
        {
            $group: {
                _id: groupId,
                confirmed: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, 1, 0] } },
                noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
            }
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, label: '$_id', confirmed: 1, noShow: 1, cancelled: 1 } }
    ]).maxTimeMS(5000);

    // Top facilities by booking count
    const topFacilities = await SportsBooking.aggregate([
        { $match: { slotStartAt: { $gte: startDate }, status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: '$facility', bookingCount: { $sum: 1 } } },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'facilities',
                localField: '_id',
                foreignField: '_id',
                as: 'facilityInfo'
            }
        },
        { $unwind: { path: '$facilityInfo', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                facilityId: '$_id',
                name: { $ifNull: ['$facilityInfo.name', 'Unknown'] },
                bookingCount: 1
            }
        }
    ]).maxTimeMS(5000);

    // Peak hours
    const peakHours = await SportsBooking.aggregate([
        { $match: { slotStartAt: { $gte: startDate }, status: { $in: ['confirmed', 'completed'] } } },
        {
            $group: {
                _id: { $hour: '$slotStartAt' },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
            $project: {
                _id: 0,
                hour: '$_id',
                label: {
                    $concat: [
                        { $toString: { $cond: [{ $gt: ['$_id', 12] }, { $subtract: ['$_id', 12] }, '$_id'] } },
                        { $cond: [{ $gte: ['$_id', 12] }, ' PM', ' AM'] }
                    ]
                },
                avgBookings: { $round: ['$count', 1] }
            }
        }
    ]).maxTimeMS(5000);

    return { period, groupBy, series, topFacilities, peakHours };
};

/**
 * Get subscription analytics — growth trends and plan breakdown.
 */
export const getSubscriptionTrends = async (period = '90d', facilityType = null) => {
    const startDate = periodToStartDate(period);

    const matchFilter = { createdAt: { $gte: startDate } };
    if (facilityType) matchFilter.facilityType = facilityType;

    // Monthly trend
    const trend = await SubscriptionV2.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                new: { $sum: 1 },
                expired: {
                    $sum: { $cond: [{ $eq: ['$status', 'Expired'] }, 1, 0] }
                }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                month: '$_id',
                new: 1,
                expired: 1,
                netGrowth: { $subtract: ['$new', '$expired'] }
            }
        }
    ]).maxTimeMS(5000);

    // Plan breakdown (active subscriptions)
    const planFilter = { status: 'Approved' };
    if (facilityType) planFilter.facilityType = facilityType;

    const planCounts = await SubscriptionV2.aggregate([
        { $match: planFilter },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).maxTimeMS(5000);

    const totalActive = planCounts.reduce((sum, p) => sum + p.count, 0);
    const planBreakdown = planCounts.map(p => ({
        plan: p._id,
        count: p.count,
        percentage: totalActive > 0 ? Math.round((p.count / totalActive) * 1000) / 10 : 0
    }));

    return { period, trend, planBreakdown };
};
