import cron from 'node-cron';
import Booking from '../models/Booking.js';
import { createPenalty } from '../services/penaltyService.js';

/**
 * Mark unattended bookings as NoShow 15 minutes after slot start.
 * Runs every 15 minutes.
 */
const noShowJob = cron.schedule('*/15 * * * *', async () => {
    try {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000);

        const confirmedBookings = await Booking.find({
            status: 'Confirmed'
        }).populate('slotId');

        let markedCount = 0;

        for (const booking of confirmedBookings) {
            if (!booking.slotId) continue;

            const slotStart = booking.slotId.startTime;
            if (slotStart && slotStart <= cutoff) {
                booking.status = 'NoShow';
                await booking.save();

                await createPenalty(
                    booking.userId,
                    'NoShow',
                    booking._id,
                    'No check-in within 15 minutes of slot start'
                );

                markedCount++;
            }
        }

        if (markedCount > 0) {
            console.log(`[NoShowJob] Marked ${markedCount} bookings as NoShow`);
        }
    } catch (error) {
        console.error('[NoShowJob] Error:', error.message);
    }
}, { scheduled: false });

export default noShowJob;
