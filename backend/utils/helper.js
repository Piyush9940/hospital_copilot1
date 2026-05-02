import crypto from "crypto";

export const createError = (message, statusCode = 500, details = null) => {
    const error = new Error(message || "Internal server error");
    error.statusCode = statusCode;
    error.details = details;
    return error;
};

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export const validateRequiredFields = (data, fields = []) => {
    if (!data || typeof data !== "object") {
        throw createError("Invalid data object", 400);
    }

    const missing = fields.filter((field) => {
        const value = data[field];
        return (
            value === undefined ||
            value === null ||
            (typeof value === "string" && !value.trim())
        );
    });

    if (missing.length > 0) {
        throw createError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    return true;
};

export const validateEmail = (email) => {
    if (!email || typeof email !== "string") {
        throw createError("Email is required", 400);
    }

    const normalized = email.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(normalized)) {
        throw createError("Invalid email format", 400);
    }

    return normalized;
};

export const validatePhone = (phone) => {
    if (!phone || typeof phone !== "string") {
        throw createError("Phone number is required", 400);
    }

    const normalized = phone.trim();

    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
        throw createError("Invalid phone format. Use E.164 (+919876543210)", 400);
    }

    return normalized;
};

export const validateId = (id, fieldName = "ID") => {
    if (id === undefined || id === null) {
        throw createError(`${fieldName} is required`, 400);
    }

    const num = Number(id);

    if (!Number.isInteger(num) || num <= 0) {
        throw createError(`${fieldName} must be a valid positive integer`, 400);
    }

    return num;
};

export const generateId = () => crypto.randomUUID();

export const generateRandomString = (length = 16) => {
    if (!Number.isInteger(length) || length <= 0) {
        throw createError("Length must be a positive integer", 400);
    }

    return crypto.randomBytes(length).toString("hex").slice(0, length);
};

export const formatDate = (date = new Date()) => {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        throw createError("Invalid date", 400);
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

export const formatTime = (date = new Date()) => {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        throw createError("Invalid time", 400);
    }

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
};

export const formatDateTime = (date = new Date()) => {
    return `${formatDate(date)} ${formatTime(date)}`;
};

export const safeJsonParse = (value) => {
    try {
        if (typeof value !== "string") {
            return value;
        }
        return JSON.parse(value);
    } catch {
        return null;
    }
};

export const safeJsonStringify = (value) => {
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
};

export const sanitizeString = (value) => {
    if (typeof value !== "string") return "";
    return value.trim().replace(/\s+/g, " ");
};

export const sanitize = sanitizeString;

export const getPagination = (page = 1, limit = 10) => {
    const p = Number(page);
    const l = Number(limit);

    if (!Number.isInteger(p) || p <= 0) {
        throw createError("Invalid page number", 400);
    }

    if (!Number.isInteger(l) || l <= 0 || l > 100) {
        throw createError("Invalid limit (1–100)", 400);
    }

    return {
        page: p,
        limit: l,
        offset: (p - 1) * l,
    };
};

export const maskData = (value, visible = 4) => {
    if (!value || typeof value !== "string") return "";

    if (value.length <= visible) return value;

    return value.slice(0, visible) + "*".repeat(value.length - visible);
};

export const sleep = (ms) => {
    if (!Number.isFinite(ms) || ms < 0) {
        throw createError("Invalid sleep duration", 400);
    }

    return new Promise((resolve) => setTimeout(resolve, ms));
};