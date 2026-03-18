import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { getUserPenaltySummary } from '../services/penaltyService.js';

/**
 * GET /api/v2/penalties/my
 * View current user's penalty history.
 */
export const getMyPenalties = async (req, res) => {
    try {
        const summary = await getUserPenaltySummary(req.user._id);

        return successResponse(res, 200, summary);
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
