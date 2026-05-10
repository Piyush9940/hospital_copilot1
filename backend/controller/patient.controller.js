import {
    createPatientProfile,
    getPatientByUserId,
    getAllPatients,
} from "../model/patient.model.js";

import {
    getVitalHistoryByUserId,
    getLatestVitalByUserId,
    getVitalSummaryByUserId,
    checkCriticalVitalsByUserId,
} from "../services/vital.service.js";

import {
    getMedicalReportsByUserId,
} from "../services/report.service.js";

import {
    getEmergencyAlertsByUserId,
    createEmergencyAlertByUserId,
} from "../services/emergency.service.js";

import {
    getPatientNurseNotesByUserId,
} from "../services/nurse.service.js";

import {
    buildPatientContext,
    buildCompactPatientContext,
} from "../services/patientContext.service.js";

import { createError, validateId, sanitize } from "../utils/helper.js";

/**
 * Normalize patient profile
 */
const normalizePatient = (patient) => {
    if (!patient) return null;

    return {
        id: patient.id || null,
        patientId: patient.patient_id || null,
        userId: patient.user_id || null,
        age: patient.age ?? null,
        gender: patient.gender || null,
        history: patient.history || null,
        allergies: patient.allergies || null,
        medications: patient.medications || null,
        bloodGroup: patient.blood_group || null,
        address: patient.address || null,
        dob: patient.date_of_birth || null,
        createdAt: patient.created_at || null,
        updatedAt: patient.updated_at || null,
    };
};

/**
 * Create patient profile
 */
export const createProfile = async (req, res, next) => {
    try {
        const userId = validateId(req.body?.userId, "User ID");
        const age = Number(req.body?.age);
        const gender = sanitize(req.body?.gender);
        const history =
            typeof req.body?.history === "string" ? req.body.history.trim() : "";
        const allergies =
            typeof req.body?.allergies === "string" ? req.body.allergies.trim() : "";
        const medications =
            typeof req.body?.medications === "string" ? req.body.medications.trim() : "";

        if (!Number.isInteger(age) || age <= 0) {
            throw createError("Valid age is required", 400);
        }

        if (!gender) {
            throw createError("Gender is required", 400);
        }

        const bloodGroup = sanitize(req.body?.bloodGroup);
        const address = typeof req.body?.address === "string" ? req.body.address.trim() : "";
        const dateOfBirth = sanitize(req.body?.dateOfBirth) || sanitize(req.body?.dob);

        const result = createPatientProfile(
            userId,
            age,
            gender,
            history,
            allergies,
            medications,
            bloodGroup,
            address,
            dateOfBirth
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create patient profile", 500);
        }

        const patient = getPatientByUserId(userId);

        return res.status(201).json({
            success: true,
            message: "Patient profile created successfully",
            data: normalizePatient(patient),
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create patient profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's profile
 */
export const getMyProfile = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");
        const patient = getPatientByUserId(userId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        return res.status(200).json({
            success: true,
            message: "Patient profile fetched successfully",
            data: normalizePatient(patient),
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get patient profile by user ID
 */
export const getProfileByUserId = async (req, res, next) => {
    try {
        const userId = validateId(req.params?.userId, "User ID");
        const patient = getPatientByUserId(userId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        return res.status(200).json({
            success: true,
            message: "Patient profile fetched successfully",
            data: normalizePatient(patient),
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient profile by user ID",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get all patients
 */
export const getAllPatientProfiles = async (req, res, next) => {
    try {
        const patients = getAllPatients() || [];

        return res.status(200).json({
            success: true,
            message: "Patients fetched successfully",
            data: patients.map(normalizePatient),
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patients",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's vitals history
 */
export const getMyVitals = async (req, res, next) => {
    try {
        const result = await getVitalHistoryByUserId({
            userId: req.user?.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient vitals",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's latest vital
 */
export const getMyLatestVital = async (req, res, next) => {
    try {
        const result = await getLatestVitalByUserId({
            userId: req.user?.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch latest patient vital",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's vital summary
 */
export const getMyVitalSummary = async (req, res, next) => {
    try {
        const result = await getVitalSummaryByUserId({
            userId: req.user?.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch vital summary",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Check if logged-in patient has critical vitals
 */
export const checkMyCriticalVitals = async (req, res, next) => {
    try {
        const result = await checkCriticalVitalsByUserId({
            userId: req.user?.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to check critical vitals",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's reports
 */
export const getMyReports = async (req, res, next) => {
    try {
        const result = await getMedicalReportsByUserId({
            userId: req.user?.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch medical reports",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's emergency alerts
 */
export const getMyEmergencyAlerts = async (req, res, next) => {
    try {
        const result = await getEmergencyAlertsByUserId({
            userId: req.user?.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch emergency alerts",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Trigger emergency alert for logged-in patient
 */
export const triggerEmergency = async (req, res, next) => {
    try {
        const message =
            typeof req.body?.message === "string" && req.body.message.trim()
                ? req.body.message.trim()
                : "Emergency triggered by patient";

        const result = await createEmergencyAlertByUserId({
            userId: req.user?.id,
            message,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to trigger emergency alert",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's nurse notes
 */
export const getMyNurseNotes = async (req, res, next) => {
    try {
        const result = await getPatientNurseNotesByUserId({
            userId: req.user?.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse notes",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get full patient context for AI / dashboard
 */
export const getMyPatientContext = async (req, res, next) => {
    try {
        const appointmentId = req.query?.appointmentId || null;

        const result = buildPatientContext({
            userId: req.user?.id,
            appointmentId,
            reportLimit: 5,
            vitalsHistoryLimit: 5,
        });

        return res.status(200).json({
            success: true,
            message: "Patient context fetched successfully",
            data: result,
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient context",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get compact patient context for AI prompt
 */
export const getMyCompactPatientContext = async (req, res, next) => {
    try {
        const appointmentId = req.query?.appointmentId || null;

        const result = buildCompactPatientContext({
            userId: req.user?.id,
            appointmentId,
            reportLimit: 3,
            vitalsHistoryLimit: 3,
        });

        return res.status(200).json({
            success: true,
            message: "Compact patient context fetched successfully",
            data: result,
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch compact patient context",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};
