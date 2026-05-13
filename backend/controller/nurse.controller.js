import {
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
} from "../services/nurse.service.js";

import { createError, validateId, validateStringId } from "../utils/helper.js";

/**
 * Create nurse profile
 */
export const createProfile = async (req, res, next) => {
    try {
        const result = await createNurseProfile({
            userId: req.body?.userId,
            department: req.body?.department,
            shift: req.body?.shift,
            qualification: req.body?.qualification,
            experience: req.body?.experience,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create nurse profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in nurse profile
 */
export const getMyProfile = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getNurseProfileByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurse profile by user ID
 */
export const getProfileByUserId = async (req, res, next) => {
    try {
        const userId = validateId(req.params?.userId, "User ID");

        const result = await getNurseProfileByUserId({
            userId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse profile by user ID",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurse profile by nurse table ID
 */
export const getProfileById = async (req, res, next) => {
    try {
        const nurseId = validateId(req.params?.nurseId, "Nurse ID");

        const result = await getNurseProfileById({
            nurseId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get all nurse profiles
 */
export const getAllProfiles = async (req, res, next) => {
    try {
        const result = await getAllNurseProfiles();

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse profiles",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurses by department
 */
export const getProfilesByDepartment = async (req, res, next) => {
    try {
        const department =
            typeof req.params?.department === "string"
                ? req.params.department.trim()
                : "";

        if (!department) {
            throw createError("Department is required", 400);
        }

        const result = await getNurseProfilesByDepartment({
            department,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurses by department",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Create nurse note using patient table ID
 */
export const createNote = async (req, res, next) => {
    try {
        const result = await createPatientNurseNote({
            patientId: req.body?.patientId,
            nurseId: req.body?.nurseId,
            appointmentId: req.body?.appointmentId || null,
            note: req.body?.note,
            noteType: req.body?.noteType,
            isUrgent: req.body?.isUrgent,
            attachments: req.body?.attachments || null,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create nurse note",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Create nurse note using patient user ID
 */
export const createNoteByPatientUserId = async (req, res, next) => {
    try {
        const result = await createNurseNoteByPatientUserId({
            patientUserId: req.body?.patientUserId,
            nurseId: req.body?.nurseId,
            appointmentId: req.body?.appointmentId || null,
            note: req.body?.note,
            noteType: req.body?.noteType,
            isUrgent: req.body?.isUrgent,
            attachments: req.body?.attachments || null,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create nurse note by patient user ID",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurse notes by patient table ID
 */
export const getNotesByPatientId = async (req, res, next) => {
    try {
        const patientId = validateStringId(req.params?.patientId, "Patient ID");

        const result = await getPatientNurseNotes({
            patientId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient nurse notes",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurse notes for logged-in patient user
 */
export const getMyPatientNotes = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getPatientNurseNotesByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch my nurse notes",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get notes created by a nurse
 */
export const getCreatedNotesByNurseId = async (req, res, next) => {
    try {
        const nurseId = validateId(req.params?.nurseId, "Nurse ID");

        const result = await getNurseCreatedNotes({
            nurseId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse created notes",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get urgent nurse notes
 */
export const getUrgentNotes = async (req, res, next) => {
    try {
        const result = await getUrgentNurseNotes();

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch urgent nurse notes",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};
