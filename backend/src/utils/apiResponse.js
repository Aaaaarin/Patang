/**
 * Standardized API response helpers
 */

export const successResponse = (res, statusCode, data, message = 'Success') => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

export const errorResponse = (res, statusCode, code, message, details = null) => {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details
        }
    });
};
