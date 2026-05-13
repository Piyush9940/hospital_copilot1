import { getPatientByUserId } from "../model/patient.model.js";

import {
    getLatestVitalByUserId,
    getVitalSummaryByUserId,
    checkCriticalVitalsByUserId,
} from "../services/vital.service.js";

import {
    getMedicalReportsByUserId,
} from "../services/report.service.js";

import {
    getEmergencyAlertsByUserId,
} from "../services/emergency.service.js";

import {
    getPatientNurseNotesByUserId,
} from "../services/nurse.service.js";

import {
    buildCompactPatientContext,
} from "../services/patientContext.service.js";

import {
    getPatientAppointments,
} from "../services/appointment.service.js";

import { createError, validateId } from "../utils/helper.js";

/**
 * Normalize patient profile
 */
const normalizePatientProfile = (patient) => {
    if (!patient) return null;

    return {
        id: patient.patient_id || null,
        patientId: patient.patient_id || null,
        userId: patient.user_id || null,
        age: patient.age ?? null,
        gender: patient.gender || null,
        history: patient.history || null,
        allergies: patient.allergies || null,
        medications: patient.medications || null,
        createdAt: patient.created_at || null,
        updatedAt: patient.updated_at || null,
    };
};

/**
 * Safely extract service data
 */
const extractServiceData = (result, fallback = null) => {
    if (!result || typeof result !== "object") {
        return fallback;
    }

    return result.data !== undefined ? result.data : fallback;
};

const safeServiceCall = (callback) =>
    Promise.resolve()
        .then(callback)
        .catch(() => null);

/**
 * Get patient dashboard overview
 */
export const getPatientDashboard = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const patient = getPatientByUserId(userId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const [
            latestVitalResult,
            vitalSummaryResult,
            criticalVitalResult,
            reportsResult,
            emergencyAlertsResult,
            nurseNotesResult,
        ] = await Promise.all([
            safeServiceCall(() => getLatestVitalByUserId({ userId })),
            safeServiceCall(() => getVitalSummaryByUserId({ userId })),
            safeServiceCall(() => checkCriticalVitalsByUserId({ userId })),
            safeServiceCall(() => getMedicalReportsByUserId({ userId })),
            safeServiceCall(() => getEmergencyAlertsByUserId({ userId })),
            safeServiceCall(() => getPatientNurseNotesByUserId({ userId })),
        ]);

        const appointmentsResult = await safeServiceCall(() =>
            getPatientAppointments(patient.patient_id)
        );

        const compactContext = buildCompactPatientContext({
            userId,
            reportLimit: 3,
            vitalsHistoryLimit: 3,
        });

        const reports = extractServiceData(reportsResult, []) || [];
        const alerts = extractServiceData(emergencyAlertsResult, []) || [];
        const notes = extractServiceData(nurseNotesResult, []) || [];
        const appointments = extractServiceData(appointmentsResult, []) || [];

        return res.status(200).json({
            success: true,
            message: "Patient dashboard fetched successfully",
            data: {
                profile: normalizePatientProfile(patient),
                latestVital: extractServiceData(latestVitalResult, null),
                vitalSummary: extractServiceData(vitalSummaryResult, null),
                criticalVitalCheck: extractServiceData(criticalVitalResult, {
                    isCritical: false,
                    vital: null,
                }),
                recentReports: reports.slice(0, 5),
                recentEmergencyAlerts: alerts.slice(0, 5),
                recentNurseNotes: notes.slice(0, 5),
                recentAppointments: appointments.slice(0, 5),
                aiContext: compactContext,
                stats: {
                    totalReports: reports.length,
                    totalEmergencyAlerts: alerts.length,
                    totalNurseNotes: notes.length,
                    totalAppointments: appointments.length,
                    hasCriticalVitals: Boolean(
                        extractServiceData(criticalVitalResult, {})?.isCritical
                    ),
                },
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient dashboard",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get patient dashboard quick stats only
 */
export const getPatientDashboardStats = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const patient = getPatientByUserId(userId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const [
            criticalVitalResult,
            reportsResult,
            emergencyAlertsResult,
            nurseNotesResult,
            appointmentsResult,
        ] = await Promise.all([
            safeServiceCall(() => checkCriticalVitalsByUserId({ userId })),
            safeServiceCall(() => getMedicalReportsByUserId({ userId })),
            safeServiceCall(() => getEmergencyAlertsByUserId({ userId })),
            safeServiceCall(() => getPatientNurseNotesByUserId({ userId })),
            safeServiceCall(() => getPatientAppointments(patient.patient_id)),
        ]);

        const reports = extractServiceData(reportsResult, []) || [];
        const alerts = extractServiceData(emergencyAlertsResult, []) || [];
        const notes = extractServiceData(nurseNotesResult, []) || [];
        const appointments = extractServiceData(appointmentsResult, []) || [];

        return res.status(200).json({
            success: true,
            message: "Patient dashboard stats fetched successfully",
            data: {
                totalReports: reports.length,
                totalEmergencyAlerts: alerts.length,
                totalNurseNotes: notes.length,
                totalAppointments: appointments.length,
                hasCriticalVitals: Boolean(
                    extractServiceData(criticalVitalResult, {})?.isCritical
                ),
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient dashboard stats",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get patient dashboard cards data
 * Useful if frontend wants smaller grouped sections.
 */
export const getPatientDashboardCards = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const patient = getPatientByUserId(userId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const [
            latestVitalResult,
            reportsResult,
            emergencyAlertsResult,
            appointmentsResult,
        ] = await Promise.all([
            safeServiceCall(() => getLatestVitalByUserId({ userId })),
            safeServiceCall(() => getMedicalReportsByUserId({ userId })),
            safeServiceCall(() => getEmergencyAlertsByUserId({ userId })),
            safeServiceCall(() => getPatientAppointments(patient.patient_id)),
        ]);

        const latestVital = extractServiceData(latestVitalResult, null);
        const reports = extractServiceData(reportsResult, []) || [];
        const alerts = extractServiceData(emergencyAlertsResult, []) || [];
        const appointments = extractServiceData(appointmentsResult, []) || [];

        return res.status(200).json({
            success: true,
            message: "Patient dashboard cards fetched successfully",
            data: {
                latestVital,
                latestReport: reports.length > 0 ? reports[0] : null,
                latestEmergencyAlert: alerts.length > 0 ? alerts[0] : null,
                nextAppointment: appointments.length > 0 ? appointments[0] : null,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient dashboard cards",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};
