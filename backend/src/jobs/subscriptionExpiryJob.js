import cron from 'node-cron';
import SubscriptionV2 from '../models/SubscriptionV2.js';

/**
 * Mark expired subscriptions daily.
 * Runs at midnight every day.
 */
const subscriptionExpiryJob = cron.schedule('0 0 * * *', async () => {
    try {
        const result = await SubscriptionV2.updateMany(
            {
                status: 'Approved',
                endDate: { $lt: new Date() }
            },
            { status: 'Expired' }
        );

        if (result.modifiedCount > 0) {
            console.log(`[SubscriptionExpiryJob] Expired ${result.modifiedCount} subscriptions`);
        }
    } catch (error) {
        console.error('[SubscriptionExpiryJob] Error:', error.message);
    }
}, { scheduled: false });

export default subscriptionExpiryJob;
