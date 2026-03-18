import multer from 'multer';
import path from 'path';

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('INVALID_FILE_TYPE: Only PDF, JPG, and PNG files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

/**
 * Subscription application uploads: medicalCert + paymentReceipt
 */
export const subscriptionUpload = upload.fields([
    { name: 'medicalCert', maxCount: 1 },
    { name: 'paymentReceipt', maxCount: 1 }
]);

/**
 * Event poster upload
 */
export const posterUpload = upload.single('poster');

/**
 * Multer error handler middleware
 */
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: { code: 'FILE_TOO_LARGE', message: 'File exceeds the 5 MB limit', details: null }
            });
        }
        return res.status(400).json({
            success: false,
            error: { code: 'UPLOAD_ERROR', message: err.message, details: null }
        });
    }
    if (err?.message?.startsWith('INVALID_FILE_TYPE')) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_FILE_TYPE', message: 'Only PDF, JPG, and PNG files are allowed', details: null }
        });
    }
    next(err);
};
