import jwt from "jsonwebtoken";

const createJwtError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getJwtSecret = () => {
    const secret =
        process.env.JWT_SECRET ||
        process.env.JWT_SECRET_KEY ||
        process.env.SECRET_KEY ||
        "";

    if (typeof secret !== "string" || !secret.trim()) {
        throw createJwtError("JWT_SECRET is missing in environment variables", 500);
    }

    return secret.trim();
};

const getJwtExpiresIn = () => {
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    return typeof expiresIn === "string" && expiresIn.trim() ? expiresIn.trim() : "7d";
};

export const generateToken = (payload) => {
    try {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw createJwtError("Token payload must be a valid object", 400);
        }

        if (Object.keys(payload).length === 0) {
            throw createJwtError("Token payload cannot be empty", 400);
        }

        const secret = getJwtSecret();
        const expiresIn = getJwtExpiresIn();

        return jwt.sign(payload, secret, { expiresIn });
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createJwtError(`Failed to generate token: ${error.message}`, 500);
    }
};

export const verifyToken = (token) => {
    try {
        if (!token || typeof token !== "string" || !token.trim()) {
            throw createJwtError("Token is required", 401);
        }

        const secret = getJwtSecret();
        return jwt.verify(token.trim(), secret);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw createJwtError("Token has expired", 401);
        }

        if (error.name === "JsonWebTokenError") {
            throw createJwtError("Invalid token", 401);
        }

        if (error.name === "NotBeforeError") {
            throw createJwtError("Token is not active yet", 401);
        }

        if (error.statusCode) {
            throw error;
        }

        throw createJwtError(`Failed to verify token: ${error.message}`, 500);
    }
};

export const decodeToken = (token) => {
    try {
        if (!token || typeof token !== "string" || !token.trim()) {
            throw createJwtError("Token is required", 400);
        }

        const decoded = jwt.decode(token.trim());

        if (!decoded) {
            throw createJwtError("Unable to decode token", 400);
        }

        return decoded;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createJwtError(`Failed to decode token: ${error.message}`, 500);
    }
};