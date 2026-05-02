import {
    sendVideoSignal,
    receiveVideoSignal,
    endVideoCall,
    getVideoCallStatus,
    resetVideoCall,
} from "../services/videoCall.service.js";

import { createError, validateId } from "../utils/helper.js";

export const postSignal = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id || !req.user.role) {
            throw createError("Unauthorized access", 401);
        }

        const appointmentId = validateId(req.body?.appointmentId, "Appointment ID");
        const signal = req.body?.signal;

        const result = await sendVideoSignal({
            appointmentId,
            userId: req.user.id,
            role: req.user.role,
            signal,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to post signal",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const getSignal = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id || !req.user.role) {
            throw createError("Unauthorized access", 401);
        }

        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await receiveVideoSignal({
            appointmentId,
            userId: req.user.id,
            role: req.user.role,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to get signal",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const endCall = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id || !req.user.role) {
            throw createError("Unauthorized access", 401);
        }

        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await endVideoCall({
            appointmentId,
            userId: req.user.id,
            role: req.user.role,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to end call",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const getCallStatus = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id || !req.user.role) {
            throw createError("Unauthorized access", 401);
        }

        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await getVideoCallStatus({
            appointmentId,
            userId: req.user.id,
            role: req.user.role,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to get call status",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const resetCall = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id || !req.user.role) {
            throw createError("Unauthorized access", 401);
        }

        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await resetVideoCall({
            appointmentId,
            userId: req.user.id,
            role: req.user.role,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to reset call",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};