import { verifyToken } from "../config/jwt.js";
import { createError } from "../utils/helper.js";

const authMiddleware = (req, res, next) => {
    try {
        const rawHeader = req.headers.authorization;

        if (!rawHeader || typeof rawHeader !== "string") {
            return next(createError("Authorization header is required", 401));
        }

        let authHeader = rawHeader.trim();

        // Remove wrapping quotes if Postman or another client sends them
        authHeader = authHeader.replace(/^"+|"+$/g, "");

        let token = "";

        // Accept:
        // 1) Bearer <token>
        // 2) bearer <token>
        // 3) raw token only
        const parts = authHeader.split(/\s+/);

        if (parts.length === 1) {
            token = parts[0];
        } else if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
            token = parts[1];
        } else {
            return next(createError("Invalid authorization format. Use Bearer token", 401));
        }

        token = String(token || "").trim().replace(/^"+|"+$/g, "");

        if (!token) {
            return next(createError("Authentication token is missing", 401));
        }

        const decoded = verifyToken(token);

        if (!decoded || typeof decoded !== "object") {
            return next(createError("Invalid or expired authentication token", 401));
        }

        if (!decoded.id) {
            return next(createError("Token payload is invalid: user id missing", 401));
        }

        req.user = {
            id: decoded.id,
            email: decoded.email || null,
            role: decoded.role || null,
        };

        return next();
    } catch (error) {
        return next(
            createError(
                error.message || "Authentication failed",
                error.statusCode || 401,
                error.details || null
            )
        );
    }
};

export default authMiddleware;