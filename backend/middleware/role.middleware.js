import { createError } from "../utils/helper.js";

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles
 */
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if auth middleware already ran
            if (!req.user) {
                return next(createError("Unauthorized access. User not found", 401));
            }

            const userRole = req.user.role;

            if (!userRole || typeof userRole !== "string") {
                return next(createError("User role is missing in token", 403));
            }

            // Validate allowedRoles input
            if (!allowedRoles || allowedRoles.length === 0) {
                return next(createError("No roles defined for access control", 500));
            }

            // Normalize roles
            const normalizedAllowedRoles = allowedRoles.map((role) =>
                typeof role === "string" ? role.trim().toLowerCase() : ""
            );

            const normalizedUserRole = userRole.trim().toLowerCase();

            // Check access
            if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
                return next(
                    createError(
                        `Access denied. Required role(s): ${normalizedAllowedRoles.join(", ")}`,
                        403
                    )
                );
            }

            next();
        } catch (error) {
            return next(
                createError(
                    error.message || "Role authorization failed",
                    error.statusCode || 500,
                    error.details || null
                )
            );
        }
    };
};

export default roleMiddleware;