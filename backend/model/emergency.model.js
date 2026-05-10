import db from "../config/db.js";
import { createError, validateId } from "../utils/helper.js";

const ALERT_STATUSES = ["active", "acknowledged", "resolved", "false-alarm"];

export const createEmergencyAlert = (patientId, message, status = "active") => {
    try {
        const validPatientId = patientId; // It's a string, e.g. PAT-123
        const normalizedMessage = typeof message === "string" ? message.trim() : "";
        const normalizedStatus = typeof status === "string" ? status.trim() : "active";

        if (!normalizedMessage) {
            throw createError("Emergency message is required", 400);
        }

        if (!ALERT_STATUSES.includes(normalizedStatus)) {
            throw createError(`Invalid alert status. Allowed values: ${ALERT_STATUSES.join(", ")}`, 400);
        }

        const stmt = db.prepare(`
            INSERT INTO emergency_alerts (patient_id, message, status, created_at, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(validPatientId, normalizedMessage, normalizedStatus);
    } catch (error) {
        throw createError(error.message || "Failed to create emergency alert", error.statusCode || 500);
    }
};

export const getPendingAlerts = () => {
    try {
        const stmt = db.prepare(`
            SELECT e.*, u.name AS patient_name, u.email AS patient_email
            FROM emergency_alerts e
            JOIN patients p ON e.patient_id = p.patient_id
            JOIN users u ON p.user_id = u.id
            WHERE e.status = 'active'
            ORDER BY e.created_at DESC
        `);

        return stmt.all();
    } catch (error) {
        throw createError(error.message || "Failed to fetch pending alerts", error.statusCode || 500);
    }
};

export const getAlertsByStatus = (status) => {
    try {
        const normalizedStatus = typeof status === "string" ? status.trim() : "";

        if (!ALERT_STATUSES.includes(normalizedStatus)) {
            throw createError(`Invalid alert status. Allowed values: ${ALERT_STATUSES.join(", ")}`, 400);
        }

        const stmt = db.prepare(`
            SELECT e.*, u.name AS patient_name, u.email AS patient_email
            FROM emergency_alerts e
            JOIN patients p ON e.patient_id = p.patient_id
            JOIN users u ON p.user_id = u.id
            WHERE e.status = ?
            ORDER BY e.created_at DESC
        `);

        return stmt.all(normalizedStatus);
    } catch (error) {
        throw createError(error.message || "Failed to fetch alerts by status", error.statusCode || 500);
    }
};

export const getAlertsByPatientId = (patientId) => {
    try {
        const validPatientId = patientId; // It's a string

        const stmt = db.prepare(`
            SELECT *
            FROM emergency_alerts
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `);

        return stmt.all(validPatientId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch patient alerts", error.statusCode || 500);
    }
};

export const updateAlertStatus = (id, status) => {
    try {
        const alertId = validateId(id, "Alert ID");
        const normalizedStatus = typeof status === "string" ? status.trim() : "";

        if (!ALERT_STATUSES.includes(normalizedStatus)) {
            throw createError(`Invalid alert status. Allowed values: ${ALERT_STATUSES.join(", ")}`, 400);
        }

        const stmt = db.prepare(`
            UPDATE emergency_alerts
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(normalizedStatus, alertId);
    } catch (error) {
        throw createError(error.message || "Failed to update alert status", error.statusCode || 500);
    }
};

export const getAlertStats = () => {
    try {
        const stmt = db.prepare(`
            SELECT status, COUNT(*) AS count
            FROM emergency_alerts
            GROUP BY status
        `);

        return stmt.all();
    } catch (error) {
        throw createError(error.message || "Failed to fetch alert statistics", error.statusCode || 500);
    }
};

export const resolveAlert = (id, resolutionNotes) => {
    try {
        const alertId = validateId(id, "Alert ID");
        const notes = typeof resolutionNotes === "string" && resolutionNotes.trim() ? resolutionNotes.trim() : null;

        const stmt = db.prepare(`
            UPDATE emergency_alerts
            SET status = 'resolved',
                resolution_notes = ?,
                resolved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(notes, alertId);
    } catch (error) {
        throw createError(error.message || "Failed to resolve alert", error.statusCode || 500);
    }
};