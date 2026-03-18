import Event from '../models/Event.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/v2/events
 * Fetch approved events for the public calendar (paginated, filtered).
 */
export const getApprovedEvents = async (req, res) => {
    try {
        const { category, startDate, endDate, club, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const query = { status: 'Approved' };

        if (category) query.category = category;
        if (club) query.organizingClub = { $regex: club, $options: 'i' };
        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate);
            if (endDate) query.startTime.$lte = new Date(endDate);
        }

        const [events, total] = await Promise.all([
            Event.find(query)
                .populate('createdBy', 'name email')
                .sort({ startTime: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Event.countDocuments(query)
        ]);

        return successResponse(res, 200, {
            events,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/v2/events/my
 * Fetch events created by the authenticated coordinator.
 */
export const getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({ createdBy: req.user._id })
            .sort({ createdAt: -1 });

        return successResponse(res, 200, events);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * POST /api/v2/events
 * Submit a new event proposal.
 */
export const createEvent = async (req, res) => {
    try {
        const { title, description, category, startTime, endTime, venue, organizingClub, registrationLink } = req.body;

        const eventData = {
            title,
            description,
            category,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            venue: venue || null,
            organizingClub,
            registrationLink: registrationLink || null,
            createdBy: req.user._id
        };

        // Handle poster upload if present
        if (req.file) {
            eventData.posterUrl = req.file.path.replace(/\\/g, '/');
        }

        const event = await Event.create(eventData);

        return successResponse(res, 201, {
            _id: event._id,
            title: event.title,
            status: event.status
        }, 'Event proposal submitted for review');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PUT /api/v2/events/:eventId
 * Update an existing event (owner only, Pending/ChangesRequested only).
 */
export const updateEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);

        if (!event) {
            return errorResponse(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
        }

        if (String(event.createdBy) !== String(req.user._id)) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You can only edit your own events');
        }

        if (!['Pending', 'ChangesRequested'].includes(event.status)) {
            return errorResponse(res, 400, 'CANNOT_EDIT', 'Event can only be edited when Pending or ChangesRequested');
        }

        const allowedFields = ['title', 'description', 'category', 'startTime', 'endTime', 'venue', 'organizingClub', 'registrationLink'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                event[field] = field.includes('Time') ? new Date(req.body[field]) : req.body[field];
            }
        }

        // Handle poster upload
        if (req.file) {
            event.posterUrl = req.file.path.replace(/\\/g, '/');
        }

        // Reset to Pending if was ChangesRequested
        if (event.status === 'ChangesRequested') {
            event.status = 'Pending';
        }

        await event.save();

        return successResponse(res, 200, event, 'Event updated successfully');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * DELETE /api/v2/events/:eventId
 * Cancel an event.
 */
export const cancelEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);

        if (!event) {
            return errorResponse(res, 404, 'EVENT_NOT_FOUND', 'Event not found');
        }

        // Allow cancellation by owner or admin/executive
        const isOwner = String(event.createdBy) === String(req.user._id);
        const isAdmin = req.user.roles.some(r => ['admin', 'executive'].includes(r));

        if (!isOwner && !isAdmin) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You do not have permission to cancel this event');
        }

        event.status = 'Cancelled';
        await event.save();

        return successResponse(res, 200, { status: 'Cancelled' }, 'Event cancelled');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
