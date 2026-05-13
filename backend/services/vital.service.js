import {
    addVital,
    getVitalsByPatientId,
    getLatestVitals,
} from "../model/vital.model.js";

import { getPatientByUserId } from "../model/patient.model.js";
import { createError, validateId, validateStringId } from "../utils/helper.js";

/**
 * Allowed vital status values
 */
const ALLOWED_VITAL_STATUS = ["normal", "warning", "critical"];

/**
 * Normalize vital record
 */
const normalizeVital = (vital) => {
    if (!vital) return null;

    return {
        id: vital.id || null,
        patientId: vital.patient_id || null,
        heartRate: vital.heart_rate ?? null,
        spo2: vital.spo2 ?? null,
        bp: vital.blood_pressure || vital.bp || null,
        temperature: vital.temperature ?? null,
        status: vital.status || null,
        createdAt: vital.created_at || null,
    };
};

/**
 * Validate BP string
 * Expected formats like:
 * 120/80
 * 130 / 90
 */
const validateBloodPressure = (bp) => {
    if (!bp || typeof bp !== "string" || !bp.trim()) {
        throw createError("Blood pressure is required", 400);
    }

    const normalized = bp.trim();

    if (!/^\d{2,3}\s*\/\s*\d{2,3}$/.test(normalized)) {
        throw createError("Blood pressure must be in format systolic/diastolic, e.g. 120/80", 400);
    }

    return normalized.replace(/\s+/g, "");
};

/**
 * Validate status
 */
const validateVitalStatus = (status) => {
    const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";

    if (!ALLOWED_VITAL_STATUS.includes(normalized)) {
        throw createError(
            `Invalid vital status. Allowed values: ${ALLOWED_VITAL_STATUS.join(", ")}`,
            400
        );
    }

    return normalized;
};

/**
 * Auto-classify vital status
 * You can adjust these thresholds later.
 */
export const classifyVitalStatus = ({ heartRate, spo2, temperature }) => {
    const hr = Number(heartRate);
    const oxygen = Number(spo2);
    const temp = Number(temperature);

    if (!Number.isFinite(hr) || !Number.isFinite(oxygen) || !Number.isFinite(temp)) {
        throw createError("Valid heartRate, spo2, and temperature are required for classification", 400);
    }

    if (oxygen < 90 || hr > 130 || hr < 40 || temp >= 39.5 || temp < 35) {
        return "critical";
    }

    if (oxygen < 95 || hr > 110 || hr < 50 || temp >= 38 || temp < 36) {
        return "warning";
    }

    return "normal";
};

/**
 * Create a new vital record
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @param {number|string} payload.heartRate
 * @param {number|string} payload.spo2
 * @param {string} payload.bp
 * @param {number|string} payload.temperature
 * @param {string} [payload.status]
 * @returns {Object}
 */
export const createVitalRecord = ({
    patientId,
    heartRate,
    spo2,
    bp,
    temperature,
    status = null,
}) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");

        const validHeartRate = Number(heartRate);
        const validSpo2 = Number(spo2);
        const validTemperature = Number(temperature);
        const validBp = validateBloodPressure(bp);

        if (!Number.isFinite(validHeartRate) || validHeartRate <= 0) {
            throw createError("Valid heart rate is required", 400);
        }

        if (!Number.isFinite(validSpo2) || validSpo2 <= 0 || validSpo2 > 100) {
            throw createError("Valid SpO2 is required", 400);
        }

        if (!Number.isFinite(validTemperature) || validTemperature <= 0) {
            throw createError("Valid temperature is required", 400);
        }

        const finalStatus = status
            ? validateVitalStatus(status)
            : classifyVitalStatus({
                  heartRate: validHeartRate,
                  spo2: validSpo2,
                  temperature: validTemperature,
              });

        const result = addVital(
            validPatientId,
            validHeartRate,
            validSpo2,
            validBp,
            validTemperature,
            finalStatus
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create vital record", 500);
        }

        const latest = getLatestVitals(validPatientId);

        return {
            success: true,
            message: "Vital record created successfully",
            data: normalizeVital(latest),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create vital record",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all vitals by patient table ID
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @returns {Object}
 */
export const getPatientVitalHistory = ({ patientId }) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const vitals = getVitalsByPatientId(validPatientId) || [];

        return {
            success: true,
            message: "Patient vitals fetched successfully",
            data: vitals.map(normalizeVital),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch patient vitals",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get latest vital by patient table ID
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @returns {Object}
 */
export const getLatestPatientVital = ({ patientId }) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const vital = getLatestVitals(validPatientId);

        if (!vital) {
            throw createError("No vitals found for this patient", 404);
        }

        return {
            success: true,
            message: "Latest patient vital fetched successfully",
            data: normalizeVital(vital),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch latest patient vital",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all vitals using authenticated user ID
 * Useful for patient dashboard
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getVitalHistoryByUserId = ({ userId }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const patient = getPatientByUserId(validUserId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const vitals = getVitalsByPatientId(patient.patient_id) || [];

        return {
            success: true,
            message: "Vital history fetched successfully",
            data: vitals.map(normalizeVital),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch vital history by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get latest vital using authenticated user ID
 * Useful for patient dashboard summary
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getLatestVitalByUserId = ({ userId }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const patient = getPatientByUserId(validUserId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const vital = getLatestVitals(patient.patient_id);

        if (!vital) {
            throw createError("No vitals found for this patient", 404);
        }

        return {
            success: true,
            message: "Latest vital fetched successfully",
            data: normalizeVital(vital),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch latest vital by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get compact vital summary
 * Useful for AI Nurse / dashboard cards
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getVitalSummaryByUserId = ({ userId }) => {
    try {
        const latestResult = getLatestVitalByUserId({ userId });
        const vital = latestResult.data;

        return {
            success: true,
            message: "Vital summary fetched successfully",
            data: {
                heartRate: vital.heartRate,
                spo2: vital.spo2,
                bp: vital.bp,
                temperature: vital.temperature,
                status: vital.status,
                recordedAt: vital.createdAt,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch vital summary",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Check if latest vitals are critical
 * Useful for emergency trigger logic
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const checkCriticalVitalsByUserId = ({ userId }) => {
    try {
        const latestResult = getLatestVitalByUserId({ userId });
        const vital = latestResult.data;

        const isCritical = vital.status === "critical";

        return {
            success: true,
            message: "Critical vital check completed successfully",
            data: {
                isCritical,
                vital,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to check critical vitals",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    classifyVitalStatus,
    createVitalRecord,
    getPatientVitalHistory,
    getLatestPatientVital,
    getVitalHistoryByUserId,
    getLatestVitalByUserId,
    getVitalSummaryByUserId,
    checkCriticalVitalsByUserId,
};
