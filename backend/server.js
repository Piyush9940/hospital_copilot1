import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import db from "./config/db.js";

const PORT = Number(process.env.PORT || 5000);

const requiredEnv = ["JWT_SECRET"];

for (const key of requiredEnv) {
    if (!process.env[key] || !String(process.env[key]).trim()) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

try {
    if (!db) {
        throw new Error("Database instance not initialized");
    }
    console.log("Database connected successfully");
} catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
}

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
        try {
            db.close();
            console.log("Database connection closed");
        } catch (error) {
            console.error("Failed to close DB cleanly:", error.message);
        }
        process.exit(0);
    });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));