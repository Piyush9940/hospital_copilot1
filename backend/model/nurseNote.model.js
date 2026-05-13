import db from "../config/db.js";
import { createError, validateId, validateStringId, safeJsonStringify } from "../utils/helper.js";

const NOTE_TYPES = ["observation", "medication", "care", "handover", "incident"];
const NOTE_TYPE_ALIASES = {
    instruction: "care",
    escalation: "incident",
    follow_up: "handover",
};

const normalizeNoteType = (noteType) => {
    const normalized = typeof noteType === "string" && noteType.trim()
        ? noteType.trim().toLowerCase()
        : "observation";

    return NOTE_TYPE_ALIASES[normalized] || normalized;
};

export const createNurseNote = (patientId, nurseId, appointmentId, note, noteType = "observation", isUrgent = 0, attachments = null) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const validNurseId = validateId(nurseId, "Nurse ID");
        const validAppointmentId = appointmentId ? validateId(appointmentId, "Appointment ID") : null;
        const normalizedNote = typeof note === "string" ? note.trim() : "";
        const normalizedNoteType = normalizeNoteType(noteType);
        const urgentFlag = Number(isUrgent) ? 1 : 0;
        const attachmentsJson = attachments ? safeJsonStringify(attachments) : null;

        if (!normalizedNote) {
            throw createError("Note is required", 400);
        }

        if (!NOTE_TYPES.includes(normalizedNoteType)) {
            throw createError(`Invalid note type. Allowed values: ${NOTE_TYPES.join(", ")}`, 400);
        }

        const stmt = db.prepare(`
            INSERT INTO nurse_notes (
                patient_id,
                nurse_id,
                appointment_id,
                note,
                note_type,
                is_urgent,
                attachments,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(
            validPatientId,
            validNurseId,
            validAppointmentId,
            normalizedNote,
            normalizedNoteType,
            urgentFlag,
            attachmentsJson
        );
    } catch (error) {
        throw createError(error.message || "Failed to create nurse note", error.statusCode || 500);
    }
};

export const getNotesByPatientId = (patientId) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");

        const stmt = db.prepare(`
            SELECT nn.*, u.name AS nurse_name, u.profile_image AS nurse_image
            FROM nurse_notes nn
            JOIN nurses n ON nn.nurse_id = n.id
            JOIN users u ON n.user_id = u.id
            WHERE nn.patient_id = ?
            ORDER BY nn.created_at DESC
        `);

        return stmt.all(validPatientId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch patient notes", error.statusCode || 500);
    }
};

export const getNotesByNurseId = (nurseId) => {
    try {
        const validNurseId = validateId(nurseId, "Nurse ID");

        const stmt = db.prepare(`
            SELECT nn.*, pat.name AS patient_name
            FROM nurse_notes nn
            JOIN patients p ON nn.patient_id = p.patient_id
            JOIN users pat ON p.user_id = pat.id
            WHERE nn.nurse_id = ?
            ORDER BY nn.created_at DESC
        `);

        return stmt.all(validNurseId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch nurse notes", error.statusCode || 500);
    }
};

export const getUrgentNotes = () => {
    try {
        const stmt = db.prepare(`
            SELECT nn.*, u.name AS nurse_name, pat.name AS patient_name
            FROM nurse_notes nn
            JOIN nurses n ON nn.nurse_id = n.id
            JOIN users u ON n.user_id = u.id
            JOIN patients p ON nn.patient_id = p.patient_id
            JOIN users pat ON p.user_id = pat.id
            WHERE nn.is_urgent = 1
            ORDER BY nn.created_at DESC
        `);

        return stmt.all();
    } catch (error) {
        throw createError(error.message || "Failed to fetch urgent notes", error.statusCode || 500);
    }
};
