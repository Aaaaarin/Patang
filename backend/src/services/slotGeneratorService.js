import Facility from '../models/Facility.js';
import TimeSlot from '../models/TimeSlot.js';
import { combineDateAndTime, addDays, startOfDay, endOfDay } from '../utils/dateUtils.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * Generate time slots for a specific facility and date.
 * Creates slots from operatingHours.start to operatingHours.end at slotDuration intervals.
 */
export const generateSlotsForDate = async (facility, dateStr) => {
    const opStart = facility.operatingHours?.start || '06:00';
    const opEnd = facility.operatingHours?.end || '22:00';
    const duration = facility.slotDuration || 60;

    const slots = [];
    let currentStart = dayjs.utc(dateStr).hour(parseInt(opStart.split(':')[0])).minute(parseInt(opStart.split(':')[1])).second(0).millisecond(0);
    const dayEnd = dayjs.utc(dateStr).hour(parseInt(opEnd.split(':')[0])).minute(parseInt(opEnd.split(':')[1])).second(0).millisecond(0);

    while (currentStart.add(duration, 'minute').isBefore(dayEnd) || currentStart.add(duration, 'minute').isSame(dayEnd)) {
        const slotEnd = currentStart.add(duration, 'minute');

        // Check if slot already exists
        const existing = await TimeSlot.findOne({
            facilityId: facility._id,
            startTime: currentStart.toDate(),
            endTime: slotEnd.toDate()
        });

        if (!existing) {
            slots.push({
                facilityId: facility._id,
                date: startOfDay(dateStr),
                startTime: currentStart.toDate(),
                endTime: slotEnd.toDate(),
                status: 'Available'
            });
        }

        currentStart = slotEnd;
    }

    if (slots.length > 0) {
        await TimeSlot.insertMany(slots);
    }

    return slots.length;
};

/**
 * Generate slots for all active bookable facilities for the next N days.
 */
export const generateAllSlots = async (daysAhead = 3) => {
    const facilities = await Facility.find({
        isOperational: true,
        facilityType: 'sports'
    });

    let totalGenerated = 0;

    for (const facility of facilities) {
        for (let i = 0; i < daysAhead; i++) {
            const date = dayjs.utc().add(i, 'day').format('YYYY-MM-DD');
            const count = await generateSlotsForDate(facility, date);
            totalGenerated += count;
        }
    }

    return totalGenerated;
};
