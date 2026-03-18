import Penalty from '../models/Penalty.js';
import { addDays } from '../utils/dateUtils.js';

const NO_SHOW_THRESHOLD = 3;
const LATE_CANCEL_THRESHOLD = 2;
const SUSPENSION_DAYS = 7;
const PENALTY_WINDOW_DAYS = 30;

/**
 * Create a penalty record for a user.
 */
export const createPenalty = async (userId, type, bookingId, description = null) => {
    const penalty = await Penalty.create({
        userId,
        type,
        bookingId,
        description
    });

    // Check if suspension threshold is met
    await checkAndApplySuspension(userId);

    return penalty;
};

/**
 * Check if the user's penalty count triggers a suspension.
 * 3 no-shows OR 2 late cancellations within 30 days → 7-day suspension.
 */
export const checkAndApplySuspension = async (userId) => {
    const windowStart = addDays(new Date(), -PENALTY_WINDOW_DAYS);

    const [noShowCount, lateCancelCount] = await Promise.all([
        Penalty.countDocuments({
            userId,
            type: 'NoShow',
            createdAt: { $gte: windowStart }
        }),
        Penalty.countDocuments({
            userId,
            type: 'LateCancellation',
            createdAt: { $gte: windowStart }
        })
    ]);

    if (noShowCount >= NO_SHOW_THRESHOLD || lateCancelCount >= LATE_CANCEL_THRESHOLD) {
        // Check if user is already suspended
        const existingSuspension = await Penalty.findOne({
            userId,
            isActive: true,
            suspendedUntil: { $gt: new Date() }
        });

        if (!existingSuspension) {
            const suspendedUntil = addDays(new Date(), SUSPENSION_DAYS);
            await Penalty.create({
                userId,
                type: 'Misuse',
                isActive: true,
                suspendedUntil,
                description: `Auto-suspension: ${noShowCount} no-shows, ${lateCancelCount} late cancellations in ${PENALTY_WINDOW_DAYS} days`
            });
            return { suspended: true, suspendedUntil };
        }
    }

    return { suspended: false };
};

/**
 * Get penalty summary for a user.
 */
export const getUserPenaltySummary = async (userId) => {
    const windowStart = addDays(new Date(), -PENALTY_WINDOW_DAYS);

    const [penalties, noShowCount, lateCancelCount, activeSuspension] = await Promise.all([
        Penalty.find({ userId }).sort({ createdAt: -1 }),
        Penalty.countDocuments({
            userId,
            type: 'NoShow',
            createdAt: { $gte: windowStart }
        }),
        Penalty.countDocuments({
            userId,
            type: 'LateCancellation',
            createdAt: { $gte: windowStart }
        }),
        Penalty.findOne({
            userId,
            isActive: true,
            suspendedUntil: { $gt: new Date() }
        })
    ]);

    return {
        penalties,
        activeSuspension: activeSuspension ? {
            suspendedUntil: activeSuspension.suspendedUntil,
            description: activeSuspension.description
        } : null,
        noShowCount,
        lateCancelCount
    };
};
