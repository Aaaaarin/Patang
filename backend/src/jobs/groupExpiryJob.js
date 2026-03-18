import cron from 'node-cron';
import { autoExpireGroups } from '../services/groupBookingService.js';

/**
 * Auto-cancel unfilled group bookings 4 hours before slot start.
 * Runs every hour.
 */
const groupExpiryJob = cron.schedule('0 * * * *', async () => {
    try {
        const cancelled = await autoExpireGroups();
        if (cancelled > 0) {
            console.log(`[GroupExpiryJob] Auto-cancelled ${cancelled} unfilled group bookings`);
        }
    } catch (error) {
        console.error('[GroupExpiryJob] Error:', error.message);
    }
}, { scheduled: false });

export default groupExpiryJob;
