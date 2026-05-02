import {
    verifyMailerConnection,
    sendMail,
    sendAppointmentConfirmationEmail,
    sendAppointmentCancellationEmail,
} from "../config/mailer.js";

import { createError, sanitize, validateEmail } from "../utils/helper.js";

/**
 * Normalize email result
 */
const normalizeMailResult = (result) => {
    if (!result) return null;

    return {
        success: Boolean(result.success),
        messageId: result.messageId || null,
        accepted: Array.isArray(result.accepted) ? result.accepted : [],
        rejected: Array.isArray(result.rejected) ? result.rejected : [],
        response: result.response || null,
    };
};

/**
 * Check SMTP connection health
 * @returns {Promise<Object>}
 */
export const checkMailServiceHealth = async () => {
    try {
        const verified = await verifyMailerConnection();

        return {
            success: true,
            message: verified
                ? "Mail service is connected successfully"
                : "Mail service verification failed",
            data: {
                connected: Boolean(verified),
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to verify mail service connection",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send generic email
 * @param {Object} payload
 * @param {string|string[]} payload.to
 * @param {string} payload.subject
 * @param {string} [payload.text]
 * @param {string} [payload.html]
 * @param {string|string[]} [payload.cc]
 * @param {string|string[]} [payload.bcc]
 * @param {Array} [payload.attachments]
 * @returns {Promise<Object>}
 */
export const sendGenericEmail = async ({
    to,
    subject,
    text = "",
    html = "",
    cc,
    bcc,
    attachments = [],
}) => {
    try {
        if (!to) {
            throw createError("Recipient email is required", 400);
        }

        if (Array.isArray(to)) {
            if (to.length === 0) {
                throw createError("Recipient email list cannot be empty", 400);
            }
            to.forEach((email) => validateEmail(email));
        } else {
            validateEmail(to);
        }

        const normalizedSubject = sanitize(subject);
        const normalizedText = typeof text === "string" ? text.trim() : "";
        const normalizedHtml = typeof html === "string" ? html.trim() : "";

        if (!normalizedSubject) {
            throw createError("Email subject is required", 400);
        }

        if (!normalizedText && !normalizedHtml) {
            throw createError("Either text or html content is required", 400);
        }

        const result = await sendMail({
            to,
            subject: normalizedSubject,
            text: normalizedText || undefined,
            html: normalizedHtml || undefined,
            cc,
            bcc,
            attachments,
        });

        return {
            success: true,
            message: "Email sent successfully",
            data: normalizeMailResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send email",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send appointment confirmation email
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
export const sendAppointmentConfirmationMail = async ({
    to,
    patientName,
    doctorName,
    appointmentCode,
    appointmentDate,
    appointmentTime,
    consultationType = "video",
}) => {
    try {
        validateEmail(to);

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

        const result = await sendAppointmentConfirmationEmail({
            to,
            patientName: normalizedPatientName,
            doctorName: normalizedDoctorName,
            appointmentCode: normalizedAppointmentCode,
            appointmentDate: normalizedAppointmentDate,
            appointmentTime: normalizedAppointmentTime,
            consultationType: normalizedConsultationType || "video",
        });

        return {
            success: true,
            message: "Appointment confirmation email sent successfully",
            data: normalizeMailResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send appointment confirmation email",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send appointment cancellation email
 * @param {Object} payload
 * @param {string} payload.to
 * @param {string} payload.patientName
 * @param {string} payload.appointmentCode
 * @param {string} [payload.cancellationReason]
 * @returns {Promise<Object>}
 */
export const sendAppointmentCancellationMail = async ({
    to,
    patientName,
    appointmentCode,
    cancellationReason = "",
}) => {
    try {
        validateEmail(to);

        const normalizedPatientName = sanitize(patientName);
        const normalizedAppointmentCode = sanitize(appointmentCode);
        const normalizedCancellationReason =
            typeof cancellationReason === "string" && cancellationReason.trim()
                ? cancellationReason.trim()
                : "Not provided";

        if (!normalizedPatientName) {
            throw createError("Patient name is required", 400);
        }

        if (!normalizedAppointmentCode) {
            throw createError("Appointment code is required", 400);
        }

        const result = await sendAppointmentCancellationEmail({
            to,
            patientName: normalizedPatientName,
            appointmentCode: normalizedAppointmentCode,
            cancellationReason: normalizedCancellationReason,
        });

        return {
            success: true,
            message: "Appointment cancellation email sent successfully",
            data: normalizeMailResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send appointment cancellation email",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send report email with optional attachment
 * @param {Object} payload
 * @param {string} payload.to
 * @param {string} payload.patientName
 * @param {string} payload.reportTitle
 * @param {string} [payload.summary]
 * @param {string} [payload.attachmentPath]
 * @returns {Promise<Object>}
 */
export const sendMedicalReportMail = async ({
    to,
    patientName,
    reportTitle,
    summary = "",
    attachmentPath = "",
}) => {
    try {
        validateEmail(to);

        const normalizedPatientName = sanitize(patientName);
        const normalizedReportTitle = sanitize(reportTitle);
        const normalizedSummary = typeof summary === "string" ? summary.trim() : "";
        const normalizedAttachmentPath =
            typeof attachmentPath === "string" && attachmentPath.trim()
                ? attachmentPath.trim()
                : "";

        if (!normalizedPatientName) {
            throw createError("Patient name is required", 400);
        }

        if (!normalizedReportTitle) {
            throw createError("Report title is required", 400);
        }

        const subject = `Medical Report - ${normalizedReportTitle}`;

        const text = `
Hello ${normalizedPatientName},

Your medical report is ready.

Report Title: ${normalizedReportTitle}
Summary: ${normalizedSummary || "No summary provided"}

Regards,
Hospital Copilot Team
        `.trim();

        const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
    <h2>Medical Report</h2>
    <p>Hello <strong>${normalizedPatientName}</strong>,</p>
    <p>Your medical report is ready.</p>
    <p><strong>Report Title:</strong> ${normalizedReportTitle}</p>
    <p><strong>Summary:</strong> ${normalizedSummary || "No summary provided"}</p>
    <p>Regards,<br/>Hospital Copilot Team</p>
</div>
        `.trim();

        const attachments = normalizedAttachmentPath
            ? [
                  {
                      filename: normalizedAttachmentPath.split("/").pop() || "report.pdf",
                      path: normalizedAttachmentPath,
                  },
              ]
            : [];

        const result = await sendMail({
            to,
            subject,
            text,
            html,
            attachments,
        });

        return {
            success: true,
            message: "Medical report email sent successfully",
            data: normalizeMailResult(result),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send medical report email",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    checkMailServiceHealth,
    sendGenericEmail,
    sendAppointmentConfirmationMail,
    sendAppointmentCancellationMail,
    sendMedicalReportMail,
};