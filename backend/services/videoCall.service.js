import {
    upsertSignal,
    getLatestSignalForAppointment,
    markCallStarted,
    markCallEnded,
    getCallState,
    clearSignalsForAppointment,
} from "../model/videoCall.model.js";

import { getAppointmentById } from "../model/appointment.model.js";
import { createError, validateId } from "../utils/helper.js";

const ALLOWED_APPOINTMENT_STATUSES = ["confirmed", "completed"];
const ALLOWED_PAYMENT_STATUSES = ["paid", "success"];
const ALLOWED_ROLES = ["patient", "doctor"];

const normalizeRole = (role) => {
    const normalized = typeof role === "string" ? role.trim().toLowerCase() : "";
    if (!ALLOWED_ROLES.includes(normalized)) {
        throw createError("Only patient or doctor can use video call", 403);
    }
    return normalized;
};

const verifyCallAccess = (appointment, userId, role) => {
    if (!appointment) {
        throw createError("Appointment not found", 404);
    }

    const normalizedRole = normalizeRole(role);
    const validUserId = validateId(userId, "User ID");

    if (
        !ALLOWED_APPOINTMENT_STATUSES.includes(
            String(appointment.appointment_status || "").toLowerCase()
        )
    ) {
        throw createError("Appointment is not eligible for video call", 400);
    }

    if (
        !ALLOWED_PAYMENT_STATUSES.includes(
            String(appointment.payment_status || "").toLowerCase()
        )
    ) {
        throw createError("Payment is not completed for this appointment", 400);
    }

    if (
        normalizedRole === "patient" &&
        Number(appointment.patient_user_id) !== validUserId
    ) {
        throw createError("Patient is not authorized for this appointment", 403);
    }

    if (
        normalizedRole === "doctor" &&
        Number(appointment.doctor_user_id) !== validUserId
    ) {
        throw createError("Doctor is not authorized for this appointment", 403);
    }

    return normalizedRole;
};

export const sendVideoSignal = async ({
    appointmentId,
    userId,
    role,
    signal,
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validUserId = validateId(userId, "User ID");
        const normalizedRole = normalizeRole(role);

        if (!signal || typeof signal !== "object") {
            throw createError("Signal payload is required", 400);
        }

        const appointment = getAppointmentById(validAppointmentId);
        verifyCallAccess(appointment, validUserId, normalizedRole);

        upsertSignal(validAppointmentId, normalizedRole, validUserId, signal);
        markCallStarted(validAppointmentId);

        return {
            success: true,
            message: "Signal sent successfully",
            data: {
                appointmentId: validAppointmentId,
                senderRole: normalizedRole,
            },
        };
    } catch (error) {
        throw createError(error.message || "Failed to send video signal", error.statusCode || 500);
    }
};

export const receiveVideoSignal = async ({
    appointmentId,
    userId,
    role,
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validUserId = validateId(userId, "User ID");
        const normalizedRole = normalizeRole(role);

        const appointment = getAppointmentById(validAppointmentId);
        verifyCallAccess(appointment, validUserId, normalizedRole);

        const latest = getLatestSignalForAppointment(validAppointmentId, normalizedRole);
        const callState = getCallState(validAppointmentId);

        return {
            success: true,
            message: latest ? "Signal received successfully" : "No signal available yet",
            data: {
                appointmentId: validAppointmentId,
                signal: latest?.signal || null,
                callState:
                    callState || {
                        appointment_id: validAppointmentId,
                        call_status: "waiting",
                        ended_by: null,
                        updated_at: null,
                    },
            },
        };
    } catch (error) {
        throw createError(error.message || "Failed to receive video signal", error.statusCode || 500);
    }
};

export const endVideoCall = async ({
    appointmentId,
    userId,
    role,
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validUserId = validateId(userId, "User ID");
        const normalizedRole = normalizeRole(role);

        const appointment = getAppointmentById(validAppointmentId);
        verifyCallAccess(appointment, validUserId, normalizedRole);

        markCallEnded(validAppointmentId, normalizedRole);

        return {
            success: true,
            message: "Video call ended successfully",
            data: {
                appointmentId: validAppointmentId,
                endedBy: normalizedRole,
            },
        };
    } catch (error) {
        throw createError(error.message || "Failed to end video call", error.statusCode || 500);
    }
};

export const getVideoCallStatus = async ({
    appointmentId,
    userId,
    role,
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validUserId = validateId(userId, "User ID");
        const normalizedRole = normalizeRole(role);

        const appointment = getAppointmentById(validAppointmentId);
        verifyCallAccess(appointment, validUserId, normalizedRole);

        const callState = getCallState(validAppointmentId);

        return {
            success: true,
            message: "Video call status fetched successfully",
            data: {
                appointmentId: validAppointmentId,
                callState:
                    callState || {
                        appointment_id: validAppointmentId,
                        call_status: "waiting",
                        ended_by: null,
                        updated_at: null,
                    },
            },
        };
    } catch (error) {
        throw createError(error.message || "Failed to fetch video call status", error.statusCode || 500);
    }
};

export const resetVideoCall = async ({
    appointmentId,
    userId,
    role,
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validUserId = validateId(userId, "User ID");
        const normalizedRole = normalizeRole(role);

        const appointment = getAppointmentById(validAppointmentId);
        verifyCallAccess(appointment, validUserId, normalizedRole);

        clearSignalsForAppointment(validAppointmentId);

        return {
            success: true,
            message: "Video call signaling reset successfully",
            data: {
                appointmentId: validAppointmentId,
            },
        };
    } catch (error) {
        throw createError(error.message || "Failed to reset video call", error.statusCode || 500);
    }
};
