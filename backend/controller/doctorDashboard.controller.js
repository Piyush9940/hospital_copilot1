import {
    getDoctorProfileByUserId,
    getDoctorDashboardSummary,
    getDoctorTodayAppointments,
    getDoctorAppointmentHistory,
} from "../services/doctor.service.js";

import {
    getPendingEmergencyAlerts,
    getEmergencyAlertStatistics,
} from "../services/emergency.service.js";

import {
    getUrgentNurseNotes,
} from "../services/nurse.service.js";

import { createError, validateId } from "../utils/helper.js";

/**
 * Safely extract service data
 */
const extractServiceData = (result, fallback = null) => {
    if (!result || typeof result !== "object") {
        return fallback;
    }

    return result.data !== undefined ? result.data : fallback;
};

/**
 * Get full doctor dashboard
 */
export const getDoctorDashboard = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const doctorProfileResult = await getDoctorProfileByUserId({
            userId,
        });

        const doctorProfile = extractServiceData(doctorProfileResult, null);

        if (!doctorProfile) {
            throw createError("Doctor profile not found", 404);
        }

        const [
            dashboardSummaryResult,
            todayAppointmentsResult,
            appointmentHistoryResult,
            pendingAlertsResult,
            alertStatsResult,
            urgentNotesResult,
        ] = await Promise.all([
            getDoctorDashboardSummary({ doctorId: doctorProfile.id }).catch(() => null),
            getDoctorTodayAppointments({ doctorId: doctorProfile.id }).catch(() => null),
            getDoctorAppointmentHistory({ doctorId: doctorProfile.id }).catch(() => null),
            getPendingEmergencyAlerts().catch(() => null),
            getEmergencyAlertStatistics().catch(() => null),
            getUrgentNurseNotes().catch(() => null),
        ]);

        const dashboardSummary = extractServiceData(dashboardSummaryResult, null);
        const todayAppointments = extractServiceData(todayAppointmentsResult, []) || [];
        const appointmentHistory = extractServiceData(appointmentHistoryResult, []) || [];
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
        const urgentNotes = extractServiceData(urgentNotesResult, []) || [];

        return res.status(200).json({
            success: true,
            message: "Doctor dashboard fetched successfully",
            data: {
                profile: doctorProfile,
                summary: dashboardSummary?.summary || null,
                todayAppointments: todayAppointments.slice(0, 10),
                recentAppointments: appointmentHistory.slice(0, 10),
                pendingEmergencyAlerts: pendingAlerts.slice(0, 10),
                urgentNurseNotes: urgentNotes.slice(0, 10),
                emergencyStats: alertStats,
                stats: {
                    todayAppointmentsCount: todayAppointments.length,
                    appointmentHistoryCount: appointmentHistory.length,
                    pendingEmergencyAlertsCount: pendingAlerts.length,
                    urgentNurseNotesCount: urgentNotes.length,
                },
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor dashboard",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get doctor dashboard stats only
 */
export const getDoctorDashboardStats = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const doctorProfileResult = await getDoctorProfileByUserId({
            userId,
        });

        const doctorProfile = extractServiceData(doctorProfileResult, null);

        if (!doctorProfile) {
            throw createError("Doctor profile not found", 404);
        }

        const [
            todayAppointmentsResult,
            appointmentHistoryResult,
            pendingAlertsResult,
            alertStatsResult,
            urgentNotesResult,
        ] = await Promise.all([
            getDoctorTodayAppointments({ doctorId: doctorProfile.id }).catch(() => null),
            getDoctorAppointmentHistory({ doctorId: doctorProfile.id }).catch(() => null),
            getPendingEmergencyAlerts().catch(() => null),
            getEmergencyAlertStatistics().catch(() => null),
            getUrgentNurseNotes().catch(() => null),
        ]);

        const todayAppointments = extractServiceData(todayAppointmentsResult, []) || [];
        const appointmentHistory = extractServiceData(appointmentHistoryResult, []) || [];
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
        const urgentNotes = extractServiceData(urgentNotesResult, []) || [];

        return res.status(200).json({
            success: true,
            message: "Doctor dashboard stats fetched successfully",
            data: {
                todayAppointmentsCount: todayAppointments.length,
                appointmentHistoryCount: appointmentHistory.length,
                pendingEmergencyAlertsCount: pendingAlerts.length,
                urgentNurseNotesCount: urgentNotes.length,
                emergencySummary: alertStats.summary,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor dashboard stats",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get doctor dashboard cards
 * Small grouped data for card-based UI
 */
export const getDoctorDashboardCards = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const doctorProfileResult = await getDoctorProfileByUserId({
            userId,
        });

        const doctorProfile = extractServiceData(doctorProfileResult, null);

        if (!doctorProfile) {
            throw createError("Doctor profile not found", 404);
        }

        const [
            todayAppointmentsResult,
            pendingAlertsResult,
            urgentNotesResult,
            dashboardSummaryResult,
        ] = await Promise.all([
            getDoctorTodayAppointments({ doctorId: doctorProfile.id }).catch(() => null),
            getPendingEmergencyAlerts().catch(() => null),
            getUrgentNurseNotes().catch(() => null),
            getDoctorDashboardSummary({ doctorId: doctorProfile.id }).catch(() => null),
        ]);

        const todayAppointments = extractServiceData(todayAppointmentsResult, []) || [];
        const pendingAlerts = extractServiceData(pendingAlertsResult, []) || [];
        const urgentNotes = extractServiceData(urgentNotesResult, []) || [];
        const dashboardSummary = extractServiceData(dashboardSummaryResult, null);

        return res.status(200).json({
            success: true,
            message: "Doctor dashboard cards fetched successfully",
            data: {
                profile: doctorProfile,
                summary: dashboardSummary?.summary || null,
                nextAppointment: todayAppointments.length > 0 ? todayAppointments[0] : null,
                latestEmergencyAlert: pendingAlerts.length > 0 ? pendingAlerts[0] : null,
                latestUrgentNurseNote: urgentNotes.length > 0 ? urgentNotes[0] : null,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor dashboard cards",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};