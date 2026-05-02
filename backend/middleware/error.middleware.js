const errorMiddleware = (err, req, res, next) => {
    try {
        const statusCode =
            Number.isInteger(err?.statusCode) &&
            err.statusCode >= 100 &&
            err.statusCode <= 599
                ? err.statusCode
                : 500;

        const message =
            typeof err?.message === "string" && err.message.trim()
                ? err.message
                : "Internal server error";

        const response = {
            success: false,
            message,
        };

        if (err?.details !== undefined && err.details !== null) {
            response.details = err.details;
        }

        if (process.env.NODE_ENV !== "production") {
            response.stack = err?.stack || null;
        }

        return res.status(statusCode).json(response);
    } catch (middlewareError) {
        return res.status(500).json({
            success: false,
            message: "Critical error in error middleware",
            details: middlewareError.message,
            ...(process.env.NODE_ENV !== "production" && {
                stack: middlewareError.stack || null,
            }),
        });
    }
};

export default errorMiddleware;