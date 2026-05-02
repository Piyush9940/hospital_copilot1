import {
    createEmergencyAlertRecord,
    createEmergencyAlertByUserId,
    getPendingEmergencyAlerts,
    getEmergencyAlertsByStatus,
    getPatientEmergencyAlerts,
    getEmergencyAlertsByUserId,
    acknowledgeEmergencyAlert,
    resolveEmergencyAlertRecord,
    getEmergencyAlertStatistics,
    createEmergencyAlertWithNotification,
} from "../services/emergency.service.js";

import { createError, validateId, sanitize } from "../utils/helper.js";

/**
 * Create emergency alert using patient table ID
 */
export const createEmergencyAlert = async (req, res, next) => {
    try {
        const patientId = validateId(req.body?.patientId, "Patient ID");
        const message =
            typeof req.body?.message === "string" ? sanitize(req.body.message) : "";
        const status =
            typeof req.body?.status === "string" ? req.body.status.trim() : "pending";

        if (!message) {
            throw createError("Emergency alert message is required", 400);
        }

        const result = await createEmergencyAlertRecord({
            patientId,
            message,
            status,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create emergency alert",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Create emergency alert for logged-in patient
 */
export const triggerMyEmergencyAlert = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const message =
            typeof req.body?.message === "string" && req.body.message.trim()
                ? sanitize(req.body.message)
                : "Emergency triggered by patient";

        const result = await createEmergencyAlertByUserId({
            userId: req.user.id,
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
 * Create emergency alert for logged-in patient and send SMS notification
 */
export const triggerEmergencyWithNotification = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const message =
            typeof req.body?.message === "string" && req.body.message.trim()
                ? sanitize(req.body.message)
                : "Emergency triggered by patient";

        const notifyPhone =
            typeof req.body?.notifyPhone === "string" && req.body.notifyPhone.trim()
                ? req.body.notifyPhone.trim()
                : null;

        const patientName =
            typeof req.body?.patientName === "string" && req.body.patientName.trim()
                ? sanitize(req.body.patientName)
                : "Patient";

        const result = await createEmergencyAlertWithNotification({
            userId: req.user.id,
            message,
            notifyPhone,
            patientName,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to trigger emergency alert with notification",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get all pending emergency alerts
 */
export const getPendingAlerts = async (req, res, next) => {
    try {
        const result = await getPendingEmergencyAlerts();
        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch pending emergency alerts",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get emergency alerts by status
 */
export const getAlertsByStatus = async (req, res, next) => {
    try {
        const status =
            typeof req.params?.status === "string" ? req.params.status.trim() : "";

        if (!status) {
            throw createError("Status is required", 400);
        }

        const result = await getEmergencyAlertsByStatus({
            status,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch emergency alerts by status",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get emergency alerts by patient table ID
 */
export const getAlertsByPatientId = async (req, res, next) => {
    try {
        const patientId = validateId(req.params?.patientId, "Patient ID");

        const result = await getPatientEmergencyAlerts({
            patientId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient emergency alerts",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get emergency alerts for logged-in user
 */
export const getMyEmergencyAlerts = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getEmergencyAlertsByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch my emergency alerts",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Acknowledge emergency alert
 */
export const acknowledgeAlert = async (req, res, next) => {
    try {
        const alertId = validateId(req.params?.alertId, "Alert ID");

        const result = await acknowledgeEmergencyAlert({
            alertId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to acknowledge emergency alert",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Resolve emergency alert
 */
export const resolveAlert = async (req, res, next) => {
    try {
        const alertId = validateId(req.params?.alertId, "Alert ID");
        const resolutionNotes =
            typeof req.body?.resolutionNotes === "string" && req.body.resolutionNotes.trim()
                ? sanitize(req.body.resolutionNotes)
                : "Resolved by system";

        const result = await resolveEmergencyAlertRecord({
            alertId,
            resolutionNotes,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to resolve emergency alert",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get emergency alert statistics
 */
export const getAlertStats = async (req, res, next) => {
    try {
        const result = await getEmergencyAlertStatistics();
        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch emergency alert statistics",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};