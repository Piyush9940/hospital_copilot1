import {
    createEmergencyAlert,
    getPendingAlerts,
    getAlertsByStatus,
    getAlertsByPatientId,
    updateAlertStatus,
    getAlertStats,
    resolveAlert,
} from "../model/emergency.model.js";

import { getPatientByUserId } from "../model/patient.model.js";
import { sendEmergencyAlertSms } from "../config/twilio.js";
import { createError, validateId, validateStringId, sanitize } from "../utils/helper.js";

const ALLOWED_ALERT_STATUSES = ["active", "acknowledged", "resolved", "false-alarm"];

/**
 * Normalize alert object
 */
const normalizeAlert = (alert) => {
    if (!alert) return null;

    return {
        id: alert.id || null,
        patientId: alert.patient_id || null,
        message: alert.message || null,
        status: alert.status || null,
        patientName: alert.patient_name || null,
        patientEmail: alert.patient_email || null,
        resolutionNotes: alert.resolution_notes || null,
        createdAt: alert.created_at || null,
        updatedAt: alert.updated_at || null,
        resolvedAt: alert.resolved_at || null,
    };
};

/**
 * Validate status
 */
const validateAlertStatus = (status) => {
    const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";

    if (!ALLOWED_ALERT_STATUSES.includes(normalized)) {
        throw createError(
            `Invalid alert status. Allowed values: ${ALLOWED_ALERT_STATUSES.join(", ")}`,
            400
        );
    }

    return normalized;
};

/**
 * Create emergency alert by patient table ID
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @param {string} payload.message
 * @param {string} [payload.status]
 * @returns {Object}
 */
export const createEmergencyAlertRecord = ({
    patientId,
    message,
    status = "active",
}) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const normalizedMessage = sanitize(message);
        const normalizedStatus = validateAlertStatus(status);

        if (!normalizedMessage) {
            throw createError("Emergency alert message is required", 400);
        }

        const result = createEmergencyAlert(
            validPatientId,
            normalizedMessage,
            normalizedStatus
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create emergency alert", 500);
        }

        const patientAlerts = getAlertsByPatientId(validPatientId) || [];
        const createdAlert = patientAlerts.find(
            (item) => Number(item.id) === Number(result.lastInsertRowid)
        );

        return {
            success: true,
            message: "Emergency alert created successfully",
            data: normalizeAlert(createdAlert) || {
                id: result.lastInsertRowid,
                patientId: validPatientId,
                message: normalizedMessage,
                status: normalizedStatus,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create emergency alert",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Create emergency alert by logged-in user ID
 * Useful for patient dashboard emergency button
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @param {string} payload.message
 * @returns {Object}
 */
export const createEmergencyAlertByUserId = ({ userId, message }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const patient = getPatientByUserId(validUserId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        return createEmergencyAlertRecord({
            patientId: patient.patient_id,
            message,
            status: "active",
        });
    } catch (error) {
        throw createError(
            error.message || "Failed to create emergency alert by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all pending emergency alerts
 * @returns {Object}
 */
export const getPendingEmergencyAlerts = () => {
    try {
        const alerts = getPendingAlerts() || [];

        return {
            success: true,
            message: "Pending emergency alerts fetched successfully",
            data: alerts.map(normalizeAlert),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch pending emergency alerts",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get emergency alerts by status
 * @param {Object} payload
 * @param {string} payload.status
 * @returns {Object}
 */
export const getEmergencyAlertsByStatus = ({ status }) => {
    try {
        const normalizedStatus = validateAlertStatus(status);
        const alerts = getAlertsByStatus(normalizedStatus) || [];

        return {
            success: true,
            message: "Emergency alerts fetched successfully",
            data: alerts.map(normalizeAlert),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch emergency alerts by status",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all emergency alerts for a patient by patient ID
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @returns {Object}
 */
export const getPatientEmergencyAlerts = ({ patientId }) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const alerts = getAlertsByPatientId(validPatientId) || [];

        return {
            success: true,
            message: "Patient emergency alerts fetched successfully",
            data: alerts.map(normalizeAlert),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch patient emergency alerts",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all emergency alerts for logged-in patient user
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getEmergencyAlertsByUserId = ({ userId }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const patient = getPatientByUserId(validUserId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const alerts = getAlertsByPatientId(patient.patient_id) || [];

        return {
            success: true,
            message: "Emergency alerts fetched successfully",
            data: alerts.map(normalizeAlert),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch emergency alerts by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Acknowledge emergency alert
 * pending -> acknowledged
 * @param {Object} payload
 * @param {number|string} payload.alertId
 * @returns {Object}
 */
export const acknowledgeEmergencyAlert = ({ alertId }) => {
    try {
        const validAlertId = validateId(alertId, "Alert ID");

        const result = updateAlertStatus(validAlertId, "acknowledged");

        if (!result || result.changes === 0) {
            throw createError("Emergency alert not found or not updated", 404);
        }

        return {
            success: true,
            message: "Emergency alert acknowledged successfully",
            data: {
                alertId: validAlertId,
                status: "acknowledged",
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to acknowledge emergency alert",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Resolve emergency alert
 * @param {Object} payload
 * @param {number|string} payload.alertId
 * @param {string} [payload.resolutionNotes]
 * @returns {Object}
 */
export const resolveEmergencyAlertRecord = ({ alertId, resolutionNotes = "" }) => {
    try {
        const validAlertId = validateId(alertId, "Alert ID");
        const normalizedNotes =
            typeof resolutionNotes === "string" && resolutionNotes.trim()
                ? resolutionNotes.trim()
                : "Resolved by system";

        const result = resolveAlert(validAlertId, normalizedNotes);

        if (!result || result.changes === 0) {
            throw createError("Emergency alert not found or not resolved", 404);
        }

        return {
            success: true,
            message: "Emergency alert resolved successfully",
            data: {
                alertId: validAlertId,
                status: "resolved",
                resolutionNotes: normalizedNotes,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to resolve emergency alert",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get emergency alert statistics
 * @returns {Object}
 */
export const getEmergencyAlertStatistics = () => {
    try {
        const stats = getAlertStats() || [];

        const summary = {
            pending: 0,
            acknowledged: 0,
            resolved: 0,
            total: 0,
        };

        stats.forEach((item) => {
            const status = item?.status || "";
            const count = Number(item?.count || 0);

            if (summary.hasOwnProperty(status)) {
                summary[status] = count;
            }

            summary.total += count;
        });

        return {
            success: true,
            message: "Emergency alert statistics fetched successfully",
            data: {
                breakdown: stats,
                summary,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch emergency alert statistics",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Create emergency alert and optionally send SMS
 * Use this if you want instant escalation.
 *
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @param {string} payload.message
 * @param {string} [payload.notifyPhone]
 * @param {string} [payload.patientName]
 * @returns {Promise<Object>}
 */
export const createEmergencyAlertWithNotification = async ({
    userId,
    message,
    notifyPhone = null,
    patientName = "Patient",
}) => {
    try {
        const created = createEmergencyAlertByUserId({
            userId,
            message,
        });

        let smsResult = null;

        if (notifyPhone && typeof notifyPhone === "string" && notifyPhone.trim()) {
            try {
                smsResult = await sendEmergencyAlertSms({
                    to: notifyPhone.trim(),
                    patientName:
                        typeof patientName === "string" && patientName.trim()
                            ? patientName.trim()
                            : "Patient",
                    alertMessage: sanitize(message),
                });
            } catch {
                smsResult = null;
            }
        }

        return {
            success: true,
            message: "Emergency alert created successfully",
            data: {
                alert: created.data,
                smsNotification: smsResult,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create emergency alert with notification",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
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
};