import jwt from 'jsonwebtoken';

const QR_SECRET = process.env.JWT_SECRET || 'qr-fallback-secret';

/**
 * Generate a QR token for a booking (base64-encoded JWT).
 */
export const generateBookingQR = (bookingId, userId) => {
    const payload = { bookingId: String(bookingId), userId: String(userId) };
    const token = jwt.sign(payload, QR_SECRET, { expiresIn: '24h' });
    return Buffer.from(token).toString('base64');
};

/**
 * Decode and validate a QR token.
 * Returns { bookingId, userId } or throws.
 */
export const decodeBookingQR = (qrToken) => {
    try {
        const token = Buffer.from(qrToken, 'base64').toString('utf-8');
        const decoded = jwt.verify(token, QR_SECRET);
        return { bookingId: decoded.bookingId, userId: decoded.userId };
    } catch {
        return null;
    }
};
