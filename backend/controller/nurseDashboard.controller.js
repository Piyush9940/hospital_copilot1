import {
    getNurseProfileByUserId,
    getNurseCreatedNotes,
    getUrgentNurseNotes,
    getNurseProfilesByDepartment,
} from "../services/nurse.service.js";

import {
    getPendingEmergencyAlerts,
    getEmergencyAlertStatistics,
} from "../services/emergency.service.js";

import { createError, validateId } from "../utils/helper.js";

/**
 * Safely extract data from service response
 */
const extractServiceData = (result, fallback = null) => {
    if (!result || typeof result !== "object") {
        return fallback;
    }

    return result.data !== undefined ? result.data : fallback;
};

/**
 * Get full nurse dashboard
 */
export const getNurseDashboard = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const nurseProfileResult = await getNurseProfileByUserId({
            userId,
        });

        const nurseProfile = extractServiceData(nurseProfileResult, null);

        if (!nurseProfile) {
            throw createError("Nurse profile not found", 404);
        }

        const [
            urgentNotesResult,
            createdNotesResult,
            pendingAlertsResult,
            alertStatsResult,
            departmentNursesResult,
        ] = await Promise.all([
            getUrgentNurseNotes().catch(() => null),
            getNurseCreatedNotes({ nurseId: nurseProfile.id }).catch(() => null),
            getPendingEmergencyAlerts().catch(() => null),
            getEmergencyAlertStatistics().catch(() => null),
            getNurseProfilesByDepartment({
                department: nurseProfile.department,
            }).catch(() => null),
        ]);

        const urgentNotes = extractServiceData(urgentNotesResult, []) || [];
        const createdNotes = extractServiceData(createdNotesResult, []) || [];
        const pendingAlerts = extractServiceData(pendingAlertsResult, []) || [];
        const alertStats = extractServiceData(alertStatsResult, {
            breakdown: [],
            summary: {
                pending: 0,
                acknowledged: 0,
                resolved: 0,
                total: 0,
            },
        });

        const departmentNurses = extractServiceData(departmentNursesResult, []) || [];

        return res.status(200).json({
            success: true,
            message: "Nurse dashboard fetched successfully",
            data: {
                profile: nurseProfile,
                urgentNotes: urgentNotes.slice(0, 10),
                myRecentNotes: createdNotes.slice(0, 10),
                pendingEmergencyAlerts: pendingAlerts.slice(0, 10),
                departmentNurses: departmentNurses.slice(0, 10),
                alertStats,
                stats: {
                    urgentNotesCount: urgentNotes.length,
                    myNotesCount: createdNotes.length,
                    pendingEmergencyAlertsCount: pendingAlerts.length,
                    departmentNursesCount: departmentNurses.length,
                },
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse dashboard",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurse dashboard stats only
 */
export const getNurseDashboardStats = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const nurseProfileResult = await getNurseProfileByUserId({
            userId,
        });

        const nurseProfile = extractServiceData(nurseProfileResult, null);

        if (!nurseProfile) {
            throw createError("Nurse profile not found", 404);
        }

        const [
            urgentNotesResult,
            createdNotesResult,
            pendingAlertsResult,
            alertStatsResult,
        ] = await Promise.all([
            getUrgentNurseNotes().catch(() => null),
            getNurseCreatedNotes({ nurseId: nurseProfile.id }).catch(() => null),
            getPendingEmergencyAlerts().catch(() => null),
            getEmergencyAlertStatistics().catch(() => null),
        ]);

        const urgentNotes = extractServiceData(urgentNotesResult, []) || [];
        const createdNotes = extractServiceData(createdNotesResult, []) || [];
        const pendingAlerts = extractServiceData(pendingAlertsResult, []) || [];
        const alertStats = extractServiceData(alertStatsResult, {
            breakdown: [],
            summary: {
                pending: 0,
                acknowledged: 0,
                resolved: 0,
                total: 0,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Nurse dashboard stats fetched successfully",
            data: {
                urgentNotesCount: urgentNotes.length,
                myNotesCount: createdNotes.length,
                pendingEmergencyAlertsCount: pendingAlerts.length,
                alertSummary: alertStats.summary,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse dashboard stats",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get nurse dashboard cards
 * Small grouped data for card-based UI
 */
export const getNurseDashboardCards = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const nurseProfileResult = await getNurseProfileByUserId({
            userId,
        });

        const nurseProfile = extractServiceData(nurseProfileResult, null);

        if (!nurseProfile) {
            throw createError("Nurse profile not found", 404);
        }

        const [
            urgentNotesResult,
            createdNotesResult,
            pendingAlertsResult,
        ] = await Promise.all([
            getUrgentNurseNotes().catch(() => null),
            getNurseCreatedNotes({ nurseId: nurseProfile.id }).catch(() => null),
            getPendingEmergencyAlerts().catch(() => null),
        ]);

        const urgentNotes = extractServiceData(urgentNotesResult, []) || [];
        const createdNotes = extractServiceData(createdNotesResult, []) || [];
        const pendingAlerts = extractServiceData(pendingAlertsResult, []) || [];

        return res.status(200).json({
            success: true,
            message: "Nurse dashboard cards fetched successfully",
            data: {
                profile: nurseProfile,
                latestUrgentNote: urgentNotes.length > 0 ? urgentNotes[0] : null,
                latestMyNote: createdNotes.length > 0 ? createdNotes[0] : null,
                latestPendingEmergencyAlert: pendingAlerts.length > 0 ? pendingAlerts[0] : null,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch nurse dashboard cards",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};