import {
    sendSms,
    sendWhatsAppMessage,
    sendAppointmentReminderSms,
    sendEmergencyAlertSms,
} from "../config/twilio.js";

import { createError, sanitize, validatePhone } from "../utils/helper.js";

/**
 * Normalize SMS/WhatsApp result
 */
const normalizeSmsResult = (result) => {
    if (!result) return null;

    return {
        success: Boolean(result.success),
        sid: result.sid || null,
        status: result.status || null,
        to: result.to || null,
        from: result.from || null,
        body: result.body || null,
    };
};

/**
 * Send generic SMS
 * @param {Object} payload
 * @param {string} payload.to
 * @param {string} payload.body
 * @returns {Promise<Object>}
 */
export const sendGenericSms = async ({ to, body }) => {
    try {
        const normalizedTo = validatePhone(to);
        const normalizedBody = sanitize(body);

        if (!normalizedBody) {
            throw createError("SMS body is required", 400);
        }

        const result = await sendSms({
            to: normalizedTo,
            body: normalizedBody,
        });

        return {
            success: true,
            message: "SMS sent successfully",
            data: normalizeSmsResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send SMS",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send generic WhatsApp message
 * @param {Object} payload
 * @param {string} payload.to
 * @param {string} payload.body
 * @returns {Promise<Object>}
 */
export const sendGenericWhatsApp = async ({ to, body }) => {
    try {
        const normalizedTo = validatePhone(to);
        const normalizedBody = sanitize(body);

        if (!normalizedBody) {
            throw createError("WhatsApp message body is required", 400);
        }

        const result = await sendWhatsAppMessage({
            to: normalizedTo,
            body: normalizedBody,
        });

        return {
            success: true,
            message: "WhatsApp message sent successfully",
            data: normalizeSmsResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send WhatsApp message",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send appointment reminder SMS
 * @param {Object} payload
 * @param {string} payload.to
 * @param {string} payload.patientName
 * @param {string} payload.doctorName
 * @param {string} payload.appointmentCode
 * @param {string} payload.appointmentDate
 * @param {string} payload.appointmentTime
 * @param {string} [payload.consultationType]
 * @returns {Promise<Object>}
 */
export const sendAppointmentReminder = async ({
    to,
    patientName,
    doctorName,
    appointmentCode,
    appointmentDate,
    appointmentTime,
    consultationType = "video",
}) => {
    try {
        const normalizedTo = validatePhone(to);
        const normalizedPatientName = sanitize(patientName);
        const normalizedDoctorName = sanitize(doctorName);
        const normalizedAppointmentCode = sanitize(appointmentCode);
        const normalizedAppointmentDate = sanitize(appointmentDate);
        const normalizedAppointmentTime = sanitize(appointmentTime);
        const normalizedConsultationType = sanitize(consultationType || "video");

        if (!normalizedPatientName) throw createError("Patient name is required", 400);
        if (!normalizedDoctorName) throw createError("Doctor name is required", 400);
        if (!normalizedAppointmentCode) throw createError("Appointment code is required", 400);
        if (!normalizedAppointmentDate) throw createError("Appointment date is required", 400);
        if (!normalizedAppointmentTime) throw createError("Appointment time is required", 400);

        const result = await sendAppointmentReminderSms({
            to: normalizedTo,
            patientName: normalizedPatientName,
            doctorName: normalizedDoctorName,
            appointmentCode: normalizedAppointmentCode,
            appointmentDate: normalizedAppointmentDate,
            appointmentTime: normalizedAppointmentTime,
            consultationType: normalizedConsultationType || "video",
        });

        return {
            success: true,
            message: "Appointment reminder SMS sent successfully",
            data: normalizeSmsResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send appointment reminder SMS",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send emergency alert SMS
 * @param {Object} payload
 * @param {string} payload.to
 * @param {string} payload.patientName
 * @param {string} payload.alertMessage
 * @returns {Promise<Object>}
 */
export const sendEmergencyAlert = async ({
    to,
    patientName,
    alertMessage,
}) => {
    try {
        const normalizedTo = validatePhone(to);
        const normalizedPatientName = sanitize(patientName);
        const normalizedAlertMessage = sanitize(alertMessage);

        if (!normalizedPatientName) {
            throw createError("Patient name is required", 400);
        }

        if (!normalizedAlertMessage) {
            throw createError("Emergency alert message is required", 400);
        }

        const result = await sendEmergencyAlertSms({
            to: normalizedTo,
            patientName: normalizedPatientName,
            alertMessage: normalizedAlertMessage,
        });

        return {
            success: true,
            message: "Emergency alert SMS sent successfully",
            data: normalizeSmsResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send emergency alert SMS",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    sendGenericSms,
    sendGenericWhatsApp,
    sendAppointmentReminder,
    sendEmergencyAlert,
};