import db from "../config/db.js";
import { createError, validateId, validateStringId } from "../utils/helper.js";

const VITAL_STATUSES = ["normal", "warning", "critical"];

export const addVital = (patientId, heartRate, spo2, bp, temperature, status) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const validHeartRate = Number(heartRate);
        const validSpo2 = Number(spo2);
        const normalizedBp = typeof bp === "string" ? bp.trim() : "";
        const validTemperature = Number(temperature);
        const normalizedStatus = typeof status === "string" ? status.trim().toLowerCase() : "";

        if (!Number.isFinite(validHeartRate) || validHeartRate <= 0) {
            throw createError("Valid heart rate is required", 400);
        }

        if (!Number.isFinite(validSpo2) || validSpo2 <= 0) {
            throw createError("Valid SpO2 is required", 400);
        }

        if (!normalizedBp) {
            throw createError("Blood pressure is required", 400);
        }

        if (!Number.isFinite(validTemperature) || validTemperature <= 0) {
            throw createError("Valid temperature is required", 400);
        }

        if (!VITAL_STATUSES.includes(normalizedStatus)) {
            throw createError(`Invalid vital status. Allowed values: ${VITAL_STATUSES.join(", ")}`, 400);
        }

        const stmt = db.prepare(`
            INSERT INTO vitals (
                patient_id,
                heart_rate,
                spo2,
                bp,
                temperature,
                status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        return stmt.run(
            validPatientId,
            validHeartRate,
            validSpo2,
            normalizedBp,
            validTemperature,
            normalizedStatus
        );
    } catch (error) {
        throw createError(error.message || "Failed to add vital", error.statusCode || 500);
    }
};

export const getVitalsByPatientId = (patientId) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");

        const stmt = db.prepare(`
            SELECT *
            FROM vitals
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `);

        return stmt.all(validPatientId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch vitals", error.statusCode || 500);
    }
};

export const getLatestVitals = (patientId) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");

        const stmt = db.prepare(`
            SELECT *
            FROM vitals
            WHERE patient_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        `);

        return stmt.get(validPatientId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch latest vitals", error.statusCode || 500);
    }
};
