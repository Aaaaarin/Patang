import Booking from '../models/Booking.js';
import TimeSlot from '../models/TimeSlot.js';

/**
 * Auto-expire unfilled group bookings that are within 4 hours of slot start.
 * Called by cron job hourly.
 */
export const autoExpireGroups = async () => {
    const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const provisionedGroups = await Booking.find({
        isGroupBooking: true,
        status: 'Provisioned'
    }).populate('slotId');

    let cancelledCount = 0;

    for (const booking of provisionedGroups) {
        if (!booking.slotId) continue;

        const slotStart = booking.slotId.startTime;

        // If slot starts within 4 hours and group isn't full
        if (slotStart <= fourHoursFromNow) {
            const totalMembers = booking.joinedUsers.length + 1; // +1 for creator
            if (totalMembers < booking.groupRequiredCount) {
                booking.status = 'AutoCancelled';
                booking.cancelledAt = new Date();
                booking.cancellationReason = 'Group minimum not met 4 hours before slot';
                await booking.save();

                // Release the time slot
                await TimeSlot.findByIdAndUpdate(
                    booking.slotId._id,
                    { status: 'Available' }
                );

                cancelledCount++;
            }
        }
    }

    return cancelledCount;
};
