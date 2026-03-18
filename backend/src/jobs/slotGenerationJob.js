import cron from 'node-cron';
import { generateAllSlots } from '../services/slotGeneratorService.js';

/**
 * Generate next 3 days of time slots for all active facilities.
 * Runs at midnight every day.
 */
const slotGenerationJob = cron.schedule('5 0 * * *', async () => {
    try {
        const count = await generateAllSlots(3);
        console.log(`[SlotGenerationJob] Generated ${count} new time slots`);
    } catch (error) {
        console.error('[SlotGenerationJob] Error:', error.message);
    }
}, { scheduled: false });

export default slotGenerationJob;
