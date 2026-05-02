import db from "../config/db.js";
import { createError, validateId } from "../utils/helper.js";

const CHAT_PERMISSION_STATUSES = ["pending", "approved", "rejected"];

export const requestChatPermission = (appointmentId, patientId, doctorId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validPatientId = validateId(patientId, "Patient ID");
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const existingStmt = db.prepare(`
            SELECT id, status
            FROM chat_permissions
            WHERE appointment_id = ? AND patient_id = ? AND doctor_id = ?
            LIMIT 1
        `);

        const existing = existingStmt.get(validAppointmentId, validPatientId, validDoctorId);

        if (existing) {
            throw createError("Chat permission already exists for this appointment", 409);
        }

        const stmt = db.prepare(`
            INSERT INTO chat_permissions (
                appointment_id,
                patient_id,
                doctor_id,
                status,
                requested_at
            ) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `);

        return stmt.run(validAppointmentId, validPatientId, validDoctorId);
    } catch (error) {
        throw createError(error.message || "Failed to request chat permission", error.statusCode || 500);
    }
};

export const approveChatPermission = (id) => {
    try {
        const permissionId = validateId(id, "Permission ID");

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const stmt = db.prepare(`
            UPDATE chat_permissions
            SET status = 'approved',
                approved_at = CURRENT_TIMESTAMP,
                expires_at = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(expiresAt.toISOString(), permissionId);
    } catch (error) {
        throw createError(error.message || "Failed to approve chat permission", error.statusCode || 500);
    }
};

export const rejectChatPermission = (id) => {
    try {
        const permissionId = validateId(id, "Permission ID");

        const stmt = db.prepare(`
            UPDATE chat_permissions
            SET status = 'rejected',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(permissionId);
    } catch (error) {
        throw createError(error.message || "Failed to reject chat permission", error.statusCode || 500);
    }
};

export const isChatAllowed = (appointmentId, patientId, doctorId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validPatientId = validateId(patientId, "Patient ID");
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const stmt = db.prepare(`
            SELECT *
            FROM chat_permissions
            WHERE appointment_id = ?
              AND patient_id = ?
              AND doctor_id = ?
              AND status = 'approved'
              AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        `);

        return stmt.get(validAppointmentId, validPatientId, validDoctorId);
    } catch (error) {
        throw createError(error.message || "Failed to check chat permission", error.statusCode || 500);
    }
};

export const getPermissionsByAppointment = (appointmentId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        const stmt = db.prepare(`
            SELECT cp.*, u.name AS doctor_name
            FROM chat_permissions cp
            JOIN doctors d ON cp.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE cp.appointment_id = ?
        `);

        return stmt.all(validAppointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch chat permissions", error.statusCode || 500);
    }
};