import Facility from '../models/Facility.js';
import TimeSlot from '../models/TimeSlot.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isWithinNextDays, parseDate, startOfDay, endOfDay } from '../utils/dateUtils.js';
import { generateSlotsForDate } from '../services/slotGeneratorService.js';

/**
 * GET /api/v2/facilities
 * List all active facilities with optional filters.
 */
export const listFacilities = async (req, res) => {
    try {
        const query = { isOperational: true };

        if (req.query.sportType) {
            query.sportType = req.query.sportType;
        }

        if (req.query.isBookable !== undefined) {
            query.facilityType = req.query.isBookable === 'true' ? 'sports' : { $in: ['gym', 'swimming'] };
        }

        const facilities = await Facility.find(query).sort({ name: 1 });

        // Map to spec response format
        const data = facilities.map(f => ({
            _id: f._id,
            name: f.name,
            sportType: f.sportType || f.facilityType,
            location: f.location,
            maxPlayers: f.capacity || 2,
            minGroupSize: f.metadata?.minGroupSize || 2,
            slotDuration: f.metadata?.slotDuration || 60,
            operatingHours: f.metadata?.operatingHours || { start: '06:00', end: '22:00' },
            isActive: f.isOperational,
            isBookable: f.facilityType === 'sports'
        }));

        return successResponse(res, 200, data);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/v2/facilities/:facilityId/availability
 * Get available time slots for a facility on a given date.
 */
export const getAvailability = async (req, res) => {
    try {
        const { facilityId } = req.params;
        const { date } = req.query;

        if (!date) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'date query parameter is required (YYYY-MM-DD)');
        }

        const parsedDate = parseDate(date);
        if (!parsedDate) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD');
        }

        if (!isWithinNextDays(parsedDate, 3)) {
            return errorResponse(res, 400, 'DATE_OUT_OF_RANGE', 'Date must be today or within the next 3 days');
        }

        const facility = await Facility.findById(facilityId);
        if (!facility || !facility.isOperational) {
            return errorResponse(res, 404, 'FACILITY_NOT_FOUND', 'Facility not found');
        }

        // Auto-generate slots if none exist for this date
        let slots = await TimeSlot.find({
            facilityId,
            date: { $gte: startOfDay(date), $lte: endOfDay(date) }
        }).sort({ startTime: 1 });

        if (slots.length === 0) {
            // Generate slots on-demand using facility metadata
            const facilityForSlots = {
                _id: facility._id,
                operatingHours: facility.metadata?.operatingHours || { start: '06:00', end: '22:00' },
                slotDuration: facility.metadata?.slotDuration || 60
            };
            await generateSlotsForDate(facilityForSlots, date);

            slots = await TimeSlot.find({
                facilityId,
                date: { $gte: startOfDay(date), $lte: endOfDay(date) }
            }).sort({ startTime: 1 });
        }

        return successResponse(res, 200, {
            facility: { _id: facility._id, name: facility.name },
            date,
            slots: slots.map(s => ({
                _id: s._id,
                startTime: s.startTime,
                endTime: s.endTime,
                status: s.status
            }))
        });
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
