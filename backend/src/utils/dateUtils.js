import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

/**
 * Check if a date is within the next N days from today (inclusive of today).
 */
export const isWithinNextDays = (date, days) => {
    const target = dayjs.utc(date).startOf('day');
    const today = dayjs.utc().startOf('day');
    const maxDate = today.add(days, 'day');
    return target.isSame(today) || (target.isAfter(today) && target.isBefore(maxDate.add(1, 'day')));
};

/**
 * Get hours until a given datetime from now.
 */
export const hoursUntil = (date) => {
    return dayjs.utc(date).diff(dayjs.utc(), 'hour', true);
};

/**
 * Add N days to a date.
 */
export const addDays = (date, n) => {
    return dayjs.utc(date).add(n, 'day').toDate();
};

/**
 * Get start of day (00:00:00.000 UTC).
 */
export const startOfDay = (date) => {
    return dayjs.utc(date).startOf('day').toDate();
};

/**
 * Get end of day (23:59:59.999 UTC).
 */
export const endOfDay = (date) => {
    return dayjs.utc(date).endOf('day').toDate();
};

/**
 * Get the date N hours from now.
 */
export const fromNow = (hours) => {
    return dayjs.utc().add(hours, 'hour').toDate();
};

/**
 * Get the date N minutes from a given date.
 */
export const addMinutes = (date, minutes) => {
    return dayjs.utc(date).add(minutes, 'minute').toDate();
};

/**
 * Parse a date string in YYYY-MM-DD format.
 */
export const parseDate = (dateStr) => {
    const d = dayjs.utc(dateStr, 'YYYY-MM-DD');
    return d.isValid() ? d.toDate() : null;
};

/**
 * Combine a date (YYYY-MM-DD) and time (HH:mm) into a full UTC datetime.
 */
export const combineDateAndTime = (dateStr, timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = dayjs.utc(dateStr).hour(hours).minute(minutes).second(0).millisecond(0);
    return d.isValid() ? d.toDate() : null;
};
