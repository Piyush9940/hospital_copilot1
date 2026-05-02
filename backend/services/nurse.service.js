import {
    createNurse,
    getNurseByUserId,
    getNurseById,
    getAllNurses,
    getNursesByDepartment,
} from "../model/nurse.model.js";

import {
    createNurseNote,
    getNotesByPatientId,
    getNotesByNurseId,
    getUrgentNotes,
} from "../model/nurseNote.model.js";

import { getPatientByUserId } from "../model/patient.model.js";
import { createError, validateId, sanitize } from "../utils/helper.js";
 
/**
 * Allowed note types
 */
const ALLOWED_NOTE_TYPES = ["observation", "instruction", "escalation", "follow_up"];

/**
 * Normalize nurse object
 */
const normalizeNurse = (nurse) => {
    if (!nurse) return null;

    return {
        id: nurse.id || null,
        userId: nurse.user_id || null,
        name: nurse.name || null,
        email: nurse.email || null,
        phone: nurse.phone || null,
        profileImage: nurse.profile_image || null,
        department: nurse.department || null,
        shift: nurse.shift || null,
        qualification: nurse.qualification || null,
        experience: nurse.experience ?? 0,
        createdAt: nurse.created_at || null,
        updatedAt: nurse.updated_at || null,
    };
};

/**
 * Normalize nurse note object
 */
const normalizeNurseNote = (note) => {
    if (!note) return null;

    return {
        id: note.id || null,
        patientId: note.patient_id || null,
        nurseId: note.nurse_id || null,
        appointmentId: note.appointment_id || null,
        note: note.note || null,
        noteType: note.note_type || null,
        isUrgent: Number(note.is_urgent) === 1,
        attachments: note.attachments || null,
        nurseName: note.nurse_name || null,
        nurseImage: note.nurse_image || null,
        patientName: note.patient_name || null,
        createdAt: note.created_at || null,
        updatedAt: note.updated_at || null,
    };
};

/**
 * Validate note type
 */
const validateNoteType = (noteType) => {
    const normalized = typeof noteType === "string" ? noteType.trim().toLowerCase() : "";

    if (!ALLOWED_NOTE_TYPES.includes(normalized)) {
        throw createError(
            `Invalid note type. Allowed values: ${ALLOWED_NOTE_TYPES.join(", ")}`,
            400
        );
    }

    return normalized;
};

/**
 * Create nurse profile
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @param {string} payload.department
 * @param {string} payload.shift
 * @param {string} payload.qualification
 * @param {number|string} [payload.experience]
 * @returns {Object}
 */
export const createNurseProfile = ({
    userId,
    department,
    shift,
    qualification,
    experience = 0,
}) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const normalizedDepartment = sanitize(department);
        const normalizedShift = sanitize(shift);
        const normalizedQualification = sanitize(qualification);
        const validExperience = Number(experience);

        if (!normalizedDepartment) {
            throw createError("Department is required", 400);
        }

        if (!normalizedShift) {
            throw createError("Shift is required", 400);
        }

        if (!normalizedQualification) {
            throw createError("Qualification is required", 400);
        }

        if (!Number.isFinite(validExperience) || validExperience < 0) {
            throw createError("Valid experience is required", 400);
        }

        const result = createNurse(
            validUserId,
            normalizedDepartment,
            normalizedShift,
            normalizedQualification,
            validExperience
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create nurse profile", 500);
        }

        const nurse = getNurseById(result.lastInsertRowid);

        return {
            success: true,
            message: "Nurse profile created successfully",
            data: normalizeNurse(nurse),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create nurse profile",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get nurse profile by user ID
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getNurseProfileByUserId = ({ userId }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const nurse = getNurseByUserId(validUserId);

        if (!nurse) {
            throw createError("Nurse profile not found", 404);
        }

        return {
            success: true,
            message: "Nurse profile fetched successfully",
            data: normalizeNurse(nurse),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch nurse profile by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get nurse profile by nurse table ID
 * @param {Object} payload
 * @param {number|string} payload.nurseId
 * @returns {Object}
 */
export const getNurseProfileById = ({ nurseId }) => {
    try {
        const validNurseId = validateId(nurseId, "Nurse ID");
        const nurse = getNurseById(validNurseId);

        if (!nurse) {
            throw createError("Nurse profile not found", 404);
        }

        return {
            success: true,
            message: "Nurse profile fetched successfully",
            data: normalizeNurse(nurse),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch nurse profile",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all nurses
 * @returns {Object}
 */
export const getAllNurseProfiles = () => {
    try {
        const nurses = getAllNurses() || [];

        return {
            success: true,
            message: "Nurse profiles fetched successfully",
            data: nurses.map(normalizeNurse),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch nurse profiles",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get nurses by department
 * @param {Object} payload
 * @param {string} payload.department
 * @returns {Object}
 */
export const getNurseProfilesByDepartment = ({ department }) => {
    try {
        const normalizedDepartment = sanitize(department);

        if (!normalizedDepartment) {
            throw createError("Department is required", 400);
        }

        const nurses = getNursesByDepartment(normalizedDepartment) || [];

        return {
            success: true,
            message: "Nurse profiles fetched successfully",
            data: nurses.map(normalizeNurse),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch nurses by department",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Create nurse note
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @param {number|string} payload.nurseId
 * @param {number|string|null} [payload.appointmentId]
 * @param {string} payload.note
 * @param {string} [payload.noteType]
 * @param {boolean|number} [payload.isUrgent]
 * @param {Array|null} [payload.attachments]
 * @returns {Object}
 */
export const createPatientNurseNote = ({
    patientId,
    nurseId,
    appointmentId = null,
    note,
    noteType = "observation",
    isUrgent = false,
    attachments = null,
}) => {
    try {
        const validPatientId = validateId(patientId, "Patient ID");
        const validNurseId = validateId(nurseId, "Nurse ID");
        const validAppointmentId = appointmentId ? validateId(appointmentId, "Appointment ID") : null;
        const normalizedNote = sanitize(note);
        const normalizedNoteType = validateNoteType(noteType);
        const urgentFlag = Number(isUrgent) ? 1 : 0;

        if (!normalizedNote) {
            throw createError("Note is required", 400);
        }

        const result = createNurseNote(
            validPatientId,
            validNurseId,
            validAppointmentId,
            normalizedNote,
            normalizedNoteType,
            urgentFlag,
            attachments || null
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create nurse note", 500);
        }

        const notes = getNotesByNurseId(validNurseId) || [];
        const created = notes.find((item) => Number(item.id) === Number(result.lastInsertRowid));

        return {
            success: true,
            message: "Nurse note created successfully",
            data: normalizeNurseNote(created) || {
                id: result.lastInsertRowid,
                patientId: validPatientId,
                nurseId: validNurseId,
                appointmentId: validAppointmentId,
                note: normalizedNote,
                noteType: normalizedNoteType,
                isUrgent: Boolean(urgentFlag),
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create nurse note",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Create nurse note using patient user ID
 * Useful when patient identity comes from logged-in user.
 * @param {Object} payload
 * @param {number|string} payload.patientUserId
 * @param {number|string} payload.nurseId
 * @param {number|string|null} [payload.appointmentId]
 * @param {string} payload.note
 * @param {string} [payload.noteType]
 * @param {boolean|number} [payload.isUrgent]
 * @param {Array|null} [payload.attachments]
 * @returns {Object}
 */
export const createNurseNoteByPatientUserId = ({
    patientUserId,
    nurseId,
    appointmentId = null,
    note,
    noteType = "observation",
    isUrgent = false,
    attachments = null,
}) => {
    try {
        const validPatientUserId = validateId(patientUserId, "Patient User ID");
        const patient = getPatientByUserId(validPatientUserId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        return createPatientNurseNote({
            patientId: patient.id,
            nurseId,
            appointmentId,
            note,
            noteType,
            isUrgent,
            attachments,
        });
    } catch (error) {
        throw createError(
            error.message || "Failed to create nurse note by patient user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get notes by patient table ID
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @returns {Object}
 */
export const getPatientNurseNotes = ({ patientId }) => {
    try {
        const validPatientId = validateId(patientId, "Patient ID");
        const notes = getNotesByPatientId(validPatientId) || [];

        return {
            success: true,
            message: "Patient nurse notes fetched successfully",
            data: notes.map(normalizeNurseNote),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch patient nurse notes",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get notes by patient user ID
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getPatientNurseNotesByUserId = ({ userId }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const patient = getPatientByUserId(validUserId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const notes = getNotesByPatientId(patient.id) || [];

        return {
            success: true,
            message: "Patient nurse notes fetched successfully",
            data: notes.map(normalizeNurseNote),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch patient nurse notes by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get notes by nurse ID
 * @param {Object} payload
 * @param {number|string} payload.nurseId
 * @returns {Object}
 */
export const getNurseCreatedNotes = ({ nurseId }) => {
    try {
        const validNurseId = validateId(nurseId, "Nurse ID");
        const notes = getNotesByNurseId(validNurseId) || [];

        return {
            success: true,
            message: "Nurse created notes fetched successfully",
            data: notes.map(normalizeNurseNote),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch nurse created notes",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get urgent nurse notes
 * @returns {Object}
 */
export const getUrgentNurseNotes = () => {
    try {
        const notes = getUrgentNotes() || [];

        return {
            success: true,
            message: "Urgent nurse notes fetched successfully",
            data: notes.map(normalizeNurseNote),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch urgent nurse notes",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    createNurseProfile,
    getNurseProfileByUserId,
    getNurseProfileById,
    getAllNurseProfiles,
    getNurseProfilesByDepartment,
    createPatientNurseNote,
    createNurseNoteByPatientUserId,
    getPatientNurseNotes,
    getPatientNurseNotesByUserId,
    getNurseCreatedNotes,
    getUrgentNurseNotes,
};