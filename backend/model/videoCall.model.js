import db from "../config/db.js";
import {
    createError,
    validateId,
    safeJsonParse,
    safeJsonStringify,
} from "../utils/helper.js";

export const upsertSignal = (appointmentId, senderRole, senderUserId, signal) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validSenderUserId = validateId(senderUserId, "Sender User ID");

        if (!senderRole || typeof senderRole !== "string" || !senderRole.trim()) {
            throw createError("Sender role is required", 400);
        }

        const normalizedRole = senderRole.trim().toLowerCase();
        const signalJson = safeJsonStringify(signal);

        if (!signalJson) {
            throw createError("Invalid signal payload", 400);
        }

        const stmt = db.prepare(`
            INSERT INTO video_calls (
                appointment_id,
                sender_role,
                sender_user_id,
                signal_json,
                call_status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, 'waiting', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(appointment_id, sender_role, sender_user_id)
            DO UPDATE SET
                signal_json = excluded.signal_json,
                call_status = 'waiting',
                ended_by = NULL,
                updated_at = CURRENT_TIMESTAMP
        `);

        return stmt.run(
            validAppointmentId,
            normalizedRole,
            validSenderUserId,
            signalJson
        );
    } catch (error) {
        throw createError(error.message || "Failed to save video signal", error.statusCode || 500);
    }
};

export const getLatestSignalForAppointment = (appointmentId, requesterRole) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        if (!requesterRole || typeof requesterRole !== "string" || !requesterRole.trim()) {
            throw createError("Requester role is required", 400);
        }

        const normalizedRole = requesterRole.trim().toLowerCase();

        const stmt = db.prepare(`
            SELECT *
            FROM video_calls
            WHERE appointment_id = ?
              AND sender_role != ?
              AND signal_json IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 1
        `);

        const row = stmt.get(validAppointmentId, normalizedRole);

        if (!row) return null;

        return {
            ...row,
            signal: safeJsonParse(row.signal_json),
        };
    } catch (error) {
        throw createError(error.message || "Failed to fetch latest signal", error.statusCode || 500);
    }
};

export const markCallStarted = (appointmentId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        const stmt = db.prepare(`
            UPDATE video_calls
            SET call_status = 'active',
                updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = ?
        `);

        return stmt.run(validAppointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to mark call started", error.statusCode || 500);
    }
};

export const markCallEnded = (appointmentId, endedBy = "system", senderUserId = null) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        const normalizedEndedBy =
            typeof endedBy === "string" && endedBy.trim()
                ? endedBy.trim().toLowerCase()
                : "system";

        const stmt = db.prepare(`
            UPDATE video_calls
            SET call_status = 'ended',
                ended_by = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = ?
        `);

        const result = stmt.run(normalizedEndedBy, validAppointmentId);
        if (result.changes > 0) return result;

        const senderRole = ["patient", "doctor"].includes(normalizedEndedBy)
            ? normalizedEndedBy
            : "doctor";
        const validSenderUserId = senderUserId ? validateId(senderUserId, "Sender User ID") : 1;

        const insertStmt = db.prepare(`
            INSERT INTO video_calls (
                appointment_id,
                sender_role,
                sender_user_id,
                signal_json,
                call_status,
                ended_by,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, '{}', 'ended', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return insertStmt.run(validAppointmentId, senderRole, validSenderUserId, normalizedEndedBy);
    } catch (error) {
        throw createError(error.message || "Failed to mark call ended", error.statusCode || 500);
    }
};

export const getCallState = (appointmentId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        const stmt = db.prepare(`
            SELECT appointment_id, call_status, ended_by, updated_at
            FROM video_calls
            WHERE appointment_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
        `);

        return stmt.get(validAppointmentId) || null;
    } catch (error) {
        throw createError(error.message || "Failed to get call state", error.statusCode || 500);
    }
};

export const clearSignalsForAppointment = (appointmentId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        const stmt = db.prepare(`
            DELETE FROM video_calls
            WHERE appointment_id = ?
        `);

        return stmt.run(validAppointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to clear video signals", error.statusCode || 500);
    }
};
