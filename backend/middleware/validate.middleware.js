import { validationResult } from "express-validator";
import { createError } from "../utils/helper.js";

/**
 * Express-validator result handler middleware
 * Must be used after validation rule arrays
 */
const validateMiddleware = (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (errors.isEmpty()) {
            return next();
        }

        const formattedErrors = errors.array({ onlyFirstError: true }).map((error) => ({
            field: error.path || error.param || "unknown",
            message: error.msg || "Invalid value",
            value: error.value ?? null,
            location: error.location || "body",
        }));

        return next(
            createError("Validation failed", 400, {
                errors: formattedErrors,
            })
        );
    } catch (error) {
        return next(
            createError(
                error.message || "Request validation failed",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export default validateMiddleware;