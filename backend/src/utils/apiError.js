/**
 * Custom API error class with error codes
 */

class ApiError extends Error {
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

export default ApiError;
