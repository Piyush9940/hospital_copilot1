import {
    createVitalRecord,
    getPatientVitalHistory,
    getLatestPatientVital,
    getVitalHistoryByUserId,
    getLatestVitalByUserId,
    getVitalSummaryByUserId,
    checkCriticalVitalsByUserId,
} from "../services/vital.service.js";

import { createError, validateId } from "../utils/helper.js";

/**
 * Create new vital record
 */
export const addVital = async (req, res, next) => {
    try {
        const patientId = validateId(req.body?.patientId, "Patient ID");

        const result = await createVitalRecord({
            patientId,
            heartRate: req.body?.heartRate,
            spo2: req.body?.spo2,
            bp: req.body?.bp,
            temperature: req.body?.temperature,
            status: req.body?.status || null,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to add vital record",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get vital history by patient table ID
 */
export const getVitalsByPatientId = async (req, res, next) => {
    try {
        const patientId = validateId(req.params?.patientId, "Patient ID");

        const result = await getPatientVitalHistory({
            patientId,
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
 * Get latest vital by patient table ID
 */
export const getLatestVitalByPatientId = async (req, res, next) => {
    try {
        const patientId = validateId(req.params?.patientId, "Patient ID");

        const result = await getLatestPatientVital({
            patientId,
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
 * Get logged-in user's full vital history
 */
export const getMyVitals = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getVitalHistoryByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch my vitals",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in user's latest vital
 */
export const getMyLatestVital = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getLatestVitalByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch my latest vital",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in user's vital summary
 */
export const getMyVitalSummary = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getVitalSummaryByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch my vital summary",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Check if logged-in user's vitals are critical
 */
export const checkMyCriticalVitals = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await checkCriticalVitalsByUserId({
            userId: req.user.id,
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