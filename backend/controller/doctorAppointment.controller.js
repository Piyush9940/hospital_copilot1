import {
    getAppointmentDetails,
    getDoctorAppointments,
    confirmAppointmentRequest,
    cancelAppointmentRequest,
    completeAppointmentRequest,
    setAppointmentVideoCallStatus,
    setAppointmentFaceVerification,
    verifyAppointmentVideoAccess,
    getDoctorTodaysSchedule,
    sendAppointmentReminder,
} from "../services/appointment.service.js";

import { createError, validateId } from "../utils/helper.js";

/**
 * Get all appointments for doctor
 * Route example: GET /doctor-appointments/doctor/:doctorId
 */
export const getAppointmentsForDoctor = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await getDoctorAppointments({
            doctorId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor appointments",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get today's appointments for doctor
 * Route example: GET /doctor-appointments/doctor/:doctorId/today
 */
export const getTodayAppointmentsForDoctor = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await getDoctorTodaysSchedule(doctorId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch today's doctor appointments",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get appointment details by appointment ID
 * Route example: GET /doctor-appointments/:appointmentId
 */
export const getAppointmentById = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await getAppointmentDetails({
            appointmentId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch appointment details",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Confirm appointment
 * Route example: PUT /doctor-appointments/:appointmentId/confirm
 */
export const confirmAppointment = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await confirmAppointmentRequest(appointmentId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to confirm appointment",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Complete appointment
 * Route example: PUT /doctor-appointments/:appointmentId/complete
 */
export const completeAppointment = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await completeAppointmentRequest(appointmentId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to complete appointment",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Cancel appointment
 * Route example: PUT /doctor-appointments/:appointmentId/cancel
 */
export const cancelAppointment = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const reason =
            typeof req.body?.reason === "string" && req.body.reason.trim()
                ? req.body.reason.trim()
                : "Cancelled by doctor";

        const cancelledBy =
            typeof req.body?.cancelledBy === "string" && req.body.cancelledBy.trim()
                ? req.body.cancelledBy.trim()
                : req.user?.role || "doctor";

        const result = await cancelAppointmentRequest(
            appointmentId,
            reason,
            cancelledBy
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to cancel appointment",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Update video call status
 * Route example: PUT /doctor-appointments/:appointmentId/video-status
 */
export const updateVideoStatus = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");
        const status = req.body?.status;
        const roomId = req.body?.roomId || null;

        const result = await setAppointmentVideoCallStatus(
            appointmentId,
            status,
            roomId
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update video call status",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Update face verification status
 * Route example: PUT /doctor-appointments/:appointmentId/face-verification
 */
export const updateFaceVerification = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");
        const status = req.body?.status;
        const imagePath = req.file?.path || req.body?.imagePath || null;

        const result = await setAppointmentFaceVerification(
            appointmentId,
            status,
            imagePath
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update face verification status",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Verify video call access for current logged-in doctor
 * Route example: GET /doctor-appointments/:appointmentId/video-access
 */
export const verifyVideoAccess = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        if (!req.user || !req.user.id || !req.user.role) {
            throw createError("Unauthorized access", 401);
        }

        const result = await verifyAppointmentVideoAccess(
            appointmentId,
            req.user.id,
            req.user.role
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to verify video access",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Send appointment reminder
 * Route example: POST /doctor-appointments/:appointmentId/send-reminder
 */
export const sendReminder = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");
        const phoneNumber = req.body?.phoneNumber;

        const result = await sendAppointmentReminder(appointmentId, phoneNumber);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to send appointment reminder",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};