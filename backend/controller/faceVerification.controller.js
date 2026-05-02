import {
    checkFaceVerificationHealth,
    compareFaceWithVideoOnly,
    verifyAppointmentFaceWithVideo,
} from "../services/faceVerification.service.js";

import { createError, validateId } from "../utils/helper.js";

export const healthCheck = async (req, res, next) => {
    try {
        const result = await checkFaceVerificationHealth();
        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to check face verification health",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const compareFaceWithVideo = async (req, res, next) => {
    try {
        const referenceImagePath =
            req.body?.referenceImagePath || req.files?.referenceImage?.[0]?.path;

        const videoPath =
            req.body?.videoPath || req.files?.video?.[0]?.path;

        const threshold =
            req.body?.threshold !== undefined ? Number(req.body.threshold) : undefined;

        const fpsProcess =
            req.body?.fpsProcess !== undefined ? Number(req.body.fpsProcess) : undefined;

        if (!referenceImagePath) {
            throw createError("referenceImage is required", 400);
        }

        if (!videoPath) {
            throw createError("video is required", 400);
        }

        const result = await compareFaceWithVideoOnly({
            referenceImagePath,
            videoPath,
            threshold,
            fpsProcess,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to compare face with video",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const verifyAppointmentFaceWithVideoController = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const referenceImagePath =
            req.body?.referenceImagePath || req.files?.referenceImage?.[0]?.path;

        const videoPath =
            req.body?.videoPath || req.files?.video?.[0]?.path;

        const threshold =
            req.body?.threshold !== undefined ? Number(req.body.threshold) : undefined;

        const fpsProcess =
            req.body?.fpsProcess !== undefined ? Number(req.body.fpsProcess) : undefined;

        if (!referenceImagePath) {
            throw createError("referenceImage is required", 400);
        }

        if (!videoPath) {
            throw createError("video is required", 400);
        }

        const result = await verifyAppointmentFaceWithVideo({
            appointmentId,
            referenceImagePath,
            videoPath,
            threshold,
            fpsProcess,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to verify appointment face with video",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};