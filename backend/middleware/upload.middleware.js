import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createError } from "../utils/helper.js";
import { FILE_LIMITS, ALLOWED_FILE_TYPES } from "../utils/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, "../uploads");

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const resolveUploadDir = (file) => {
    if (file.mimetype.startsWith("image/")) {
        return path.join(UPLOAD_ROOT, "images");
    }

    if (file.mimetype === "application/pdf") {
        return path.join(UPLOAD_ROOT, "documents");
    }

    if (file.mimetype.startsWith("audio/")) {
        return path.join(UPLOAD_ROOT, "audio");
    }

    return path.join(UPLOAD_ROOT, "others");
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const uploadPath = resolveUploadDir(file);
            ensureDir(uploadPath);
            cb(null, uploadPath);
        } catch (error) {
            cb(createError("Failed to create upload directory", 500));
        }
    },

    filename: (req, file, cb) => {
        try {
            const ext = path.extname(file.originalname || "");
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            cb(null, uniqueName);
        } catch (error) {
            cb(createError("Failed to generate file name", 500));
        }
    },
});

const fileFilter = (req, file, cb) => {
    try {
        const allowedImages = ALLOWED_FILE_TYPES?.IMAGES || [];
        const allowedDocs = ALLOWED_FILE_TYPES?.DOCUMENTS || [];
        const allowedAudio = ALLOWED_FILE_TYPES?.AUDIO || [];

        if (
            allowedImages.includes(file.mimetype) ||
            allowedDocs.includes(file.mimetype) ||
            allowedAudio.includes(file.mimetype)
        ) {
            return cb(null, true);
        }

        return cb(createError("Unsupported file type", 400), false);
    } catch (error) {
        return cb(createError("File validation failed", 500), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize:
            FILE_LIMITS?.DOCUMENT_MAX_SIZE ||
            FILE_LIMITS?.PDF_MAX_SIZE ||
            FILE_LIMITS?.IMAGE_MAX_SIZE ||
            10 * 1024 * 1024,
    },
});

export const uploadSingle = (fieldName = "file") => {
    return (req, res, next) => {
        const handler = upload.single(fieldName);

        handler(req, res, (err) => {
            if (!err) return next();

            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return next(createError("File size too large", 400));
                }
                return next(createError(`Upload error: ${err.message}`, 400));
            }

            return next(err);
        });
    };
};

export const uploadMultiple = (fieldName = "files", maxCount = 5) => {
    return (req, res, next) => {
        const handler = upload.array(fieldName, maxCount);

        handler(req, res, (err) => {
            if (!err) return next();

            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return next(createError("File size too large", 400));
                }
                return next(createError(`Upload error: ${err.message}`, 400));
            }

            return next(err);
        });
    };
};

export const uploadFields = (fields = []) => {
    return (req, res, next) => {
        const handler = upload.fields(fields);

        handler(req, res, (err) => {
            if (!err) return next();

            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return next(createError("File size too large", 400));
                }
                return next(createError(`Upload error: ${err.message}`, 400));
            }

            return next(err);
        });
    };
};

export default {
    uploadSingle,
    uploadMultiple,
    uploadFields,
};