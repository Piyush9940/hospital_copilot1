import {
    createPatientNurseNote,
    createNurseNoteByPatientUserId,
    getPatientNurseNotes,
    getPatientNurseNotesByUserId,
    getNurseCreatedNotes,
    getUrgentNurseNotes,
} from "../services/nurse.service.js";

import { createError, validateId } from "../utils/helper.js";

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
        const patientId = validateId(req.params?.patientId, "Patient ID");

        const result = await getPatientNurseNotes({
            patientId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse notes by patient ID",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurse notes for logged-in patient
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
export const getNotesByNurseId = async (req, res, next) => {
    try {
        const nurseId = validateId(req.params?.nurseId, "Nurse ID");

        const result = await getNurseCreatedNotes({
            nurseId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch notes created by nurse",
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