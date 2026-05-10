import {
    createAppointmentRequest,
    getAppointmentDetails,
    getPatientAppointments,
    getDoctorAppointments,
    confirmAppointmentRequest,
    markAppointmentPayment,
    cancelAppointmentRequest,
    completeAppointmentRequest,
    setAppointmentVideoCallStatus,
    setAppointmentFaceVerification,
    verifyAppointmentVideoAccess,
    getDoctorTodaysSchedule,
    sendAppointmentReminder,
} from "../services/appointment.service.js";

import { createError, validateId } from "../utils/helper.js";
import { getPatientByUserId } from "../model/patient.model.js";

/**
 * Create appointment
 */
export const createAppointment = async (req, res, next) => {
    try {
        let patientId = req.body.patientId;

        if (!patientId && req.user?.role === "patient") {
            const patient = getPatientByUserId(req.user.id);
            patientId = patient?.patient_id;
        }

        const result = await createAppointmentRequest({
            patientId,
            doctorId: req.body.doctorId,
            nurseId: req.body.nurseId || null,
            symptoms: req.body.symptoms,
            uploadedImage: req.body.uploadedImage || null,
            uploadedDocuments: req.body.uploadedDocuments || null,
            appointmentDate: req.body.appointmentDate,
            appointmentTime: req.body.appointmentTime,
            consultationType: req.body.consultationType,
            fee: req.body.fee,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create appointment",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get appointment details by appointment ID
 */
export const getAppointmentById = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");

        const result = await getAppointmentDetails(appointmentId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch appointment",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get appointments for patient
 * Can use req.params.patientId or req.user.patient context depending on route design.
 */
export const getAppointmentsForPatient = async (req, res, next) => {
    try {
        const patientId = req.params.patientId;

        const result = await getPatientAppointments(patientId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient appointments",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get appointments for doctor
 */
export const getAppointmentsForDoctor = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params.doctorId, "Doctor ID");

        const result = await getDoctorAppointments(doctorId);

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
 * Confirm appointment
 */
export const confirmAppointment = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");

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
 * Cancel appointment
 */
export const cancelAppointment = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");

        const reason =
            typeof req.body.reason === "string" && req.body.reason.trim()
                ? req.body.reason.trim()
                : "Cancelled by user";

        const cancelledBy =
            typeof req.body.cancelledBy === "string" && req.body.cancelledBy.trim()
                ? req.body.cancelledBy.trim()
                : req.user?.role || "system";

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
 * Complete appointment
 */
export const completeAppointment = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");

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
 * Update payment status manually
 * Usually used for admin/debug/manual flows.
 */
export const updateAppointmentPaymentStatus = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");
        const paymentStatus = req.body.paymentStatus;
        const paymentId = req.body.paymentId || null;

        const result = await markAppointmentPayment(
            appointmentId,
            paymentStatus,
            paymentId
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update appointment payment status",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Update video call status
 */
export const updateAppointmentVideoStatus = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");
        const status = req.body.status;
        const roomId = req.body.roomId || null;

        const result = await setAppointmentVideoCallStatus(
            appointmentId,
            status,
            roomId
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update appointment video status",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Update face verification status
 */
export const updateAppointmentFaceVerification = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");
        const status = req.body.status;
        const imagePath =
            req.file?.path ||
            req.body.imagePath ||
            null;

        const result = await setAppointmentFaceVerification(
            appointmentId,
            status,
            imagePath
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update face verification",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Verify whether current user can access appointment video call
 */
export const verifyVideoAccess = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");

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
 * Get doctor's today's schedule
 */
export const getDoctorTodayAppointments = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params.doctorId, "Doctor ID");

        const result = await getDoctorTodaysSchedule(doctorId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor's today appointments",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Send appointment reminder SMS
 */
export const sendAppointmentReminderController = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params.appointmentId, "Appointment ID");
        const phoneNumber = req.body.phoneNumber;

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
