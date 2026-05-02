import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;

const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const validateMailerConfig = () => {
    if (!SMTP_HOST || typeof SMTP_HOST !== "string" || !SMTP_HOST.trim()) {
        throw createError("SMTP_HOST is missing in environment variables", 500);
    }

    if (!Number.isInteger(SMTP_PORT) || SMTP_PORT <= 0) {
        throw createError("SMTP_PORT is invalid in environment variables", 500);
    }

    if (!SMTP_USER || typeof SMTP_USER !== "string" || !SMTP_USER.trim()) {
        throw createError("SMTP_USER is missing in environment variables", 500);
    }

    if (!SMTP_PASS || typeof SMTP_PASS !== "string" || !SMTP_PASS.trim()) {
        throw createError("SMTP_PASS is missing in environment variables", 500);
    }

    if (!MAIL_FROM || typeof MAIL_FROM !== "string" || !MAIL_FROM.trim()) {
        throw createError("MAIL_FROM is missing or invalid in environment variables", 500);
    }
};

let transporter = null;

/**
 * Returns singleton nodemailer transporter
 * @returns {import("nodemailer").Transporter}
 */
export const getMailerTransporter = () => {
    try {
        validateMailerConfig();

        if (!transporter) {
            transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: SMTP_PORT,
                secure: SMTP_SECURE,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });
        }

        return transporter;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to initialize mail transporter: ${error.message}`, 500);
    }
};

/**
 * Verify SMTP connection
 * @returns {Promise<boolean>}
 */
export const verifyMailerConnection = async () => {
    try {
        const mailTransporter = getMailerTransporter();
        await mailTransporter.verify();
        return true;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`SMTP verification failed: ${error.message}`, 500);
    }
};

const validateEmailList = (value, fieldName) => {
    if (!value) {
        return undefined;
    }

    if (typeof value === "string") {
        if (!value.trim()) {
            throw createError(`${fieldName} cannot be empty`, 400);
        }
        return value.trim();
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            throw createError(`${fieldName} array cannot be empty`, 400);
        }

        const cleaned = value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);

        if (cleaned.length === 0) {
            throw createError(`${fieldName} must contain valid email values`, 400);
        }

        return cleaned.join(", ");
    }

    throw createError(`${fieldName} must be a string or array of strings`, 400);
};

const validateAttachments = (attachments) => {
    if (attachments === undefined) {
        return [];
    }

    if (!Array.isArray(attachments)) {
        throw createError("Attachments must be an array", 400);
    }

    for (const attachment of attachments) {
        if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) {
            throw createError("Each attachment must be a valid object", 400);
        }

        if (!attachment.filename || typeof attachment.filename !== "string" || !attachment.filename.trim()) {
            throw createError("Each attachment must include a valid filename", 400);
        }

        if (
            attachment.path === undefined &&
            attachment.content === undefined &&
            attachment.href === undefined
        ) {
            throw createError(
                "Each attachment must include at least one of: path, content, or href",
                400
            );
        }
    }

    return attachments;
};

/**
 * Send email
 * @param {Object} options
 * @param {string|string[]} options.to
 * @param {string} options.subject
 * @param {string} [options.text]
 * @param {string} [options.html]
 * @param {string|string[]} [options.cc]
 * @param {string|string[]} [options.bcc]
 * @param {Array} [options.attachments]
 * @returns {Promise<Object>}
 */
export const sendMail = async ({
    to,
    subject,
    text,
    html,
    cc,
    bcc,
    attachments = [],
}) => {
    try {
        const mailTransporter = getMailerTransporter();

        const normalizedTo = validateEmailList(to, "Recipient");
        const normalizedCc = validateEmailList(cc, "CC");
        const normalizedBcc = validateEmailList(bcc, "BCC");
        const normalizedAttachments = validateAttachments(attachments);

        if (!normalizedTo) {
            throw createError("Recipient email is required", 400);
        }

        if (!subject || typeof subject !== "string" || !subject.trim()) {
            throw createError("Email subject is required", 400);
        }

        const hasText = typeof text === "string" && text.trim().length > 0;
        const hasHtml = typeof html === "string" && html.trim().length > 0;

        if (!hasText && !hasHtml) {
            throw createError("Either text or html email content is required", 400);
        }

        const mailOptions = {
            from: MAIL_FROM,
            to: normalizedTo,
            subject: subject.trim(),
            text: hasText ? text.trim() : undefined,
            html: hasHtml ? html.trim() : undefined,
            cc: normalizedCc,
            bcc: normalizedBcc,
            attachments: normalizedAttachments,
        };

        const info = await mailTransporter.sendMail(mailOptions);

        if (!info || !info.messageId) {
            throw createError("Mail was not accepted by transporter", 500);
        }

        return {
            success: true,
            messageId: info.messageId,
            accepted: info.accepted || [],
            rejected: info.rejected || [],
            response: info.response || null,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to send email: ${error.message}`, 500);
    }
};

/**
 * Send appointment confirmation email
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export const sendAppointmentConfirmationEmail = async ({
    to,
    patientName,
    doctorName,
    appointmentCode,
    appointmentDate,
    appointmentTime,
    consultationType = "video",
}) => {
    try {
        if (!patientName || !doctorName || !appointmentCode || !appointmentDate || !appointmentTime) {
            throw createError("Missing required appointment confirmation email fields", 400);
        }

        const subject = `Appointment Confirmed - ${appointmentCode}`;

        const text = `
Hello ${patientName},

Your appointment has been confirmed.

Appointment Code: ${appointmentCode}
Doctor: ${doctorName}
Date: ${appointmentDate}
Time: ${appointmentTime}
Consultation Type: ${consultationType}

Please keep this appointment code for reference.

Regards,
Hospital Copilot Team
        `.trim();

        const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
    <h2>Appointment Confirmed</h2>
    <p>Hello <strong>${patientName}</strong>,</p>
    <p>Your appointment has been confirmed successfully.</p>

    <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Appointment Code</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${appointmentCode}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Doctor</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${doctorName}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${appointmentDate}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${appointmentTime}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Consultation Type</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${consultationType}</td>
        </tr>
    </table>

    <p style="margin-top: 16px;">Please keep this appointment code for future reference.</p>
    <p>Regards,<br/>Hospital Copilot Team</p>
</div>
        `.trim();

        return await sendMail({
            to,
            subject,
            text,
            html,
        });
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to send appointment confirmation email: ${error.message}`, 500);
    }
};

/**
 * Send appointment cancellation email
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export const sendAppointmentCancellationEmail = async ({
    to,
    patientName,
    appointmentCode,
    cancellationReason,
}) => {
    try {
        if (!patientName || !appointmentCode) {
            throw createError("Missing required appointment cancellation email fields", 400);
        }

        const subject = `Appointment Cancelled - ${appointmentCode}`;

        const text = `
Hello ${patientName},

Your appointment has been cancelled.

Appointment Code: ${appointmentCode}
Reason: ${cancellationReason || "Not provided"}

Please book a new appointment if required.

Regards,
Hospital Copilot Team
        `.trim();

        const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
    <h2>Appointment Cancelled</h2>
    <p>Hello <strong>${patientName}</strong>,</p>
    <p>Your appointment has been cancelled.</p>
    <p><strong>Appointment Code:</strong> ${appointmentCode}</p>
    <p><strong>Reason:</strong> ${cancellationReason || "Not provided"}</p>
    <p>Please book a new appointment if required.</p>
    <p>Regards,<br/>Hospital Copilot Team</p>
</div>
        `.trim();

        return await sendMail({
            to,
            subject,
            text,
            html,
        });
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to send appointment cancellation email: ${error.message}`, 500);
    }
};

export default {
    getMailerTransporter,
    verifyMailerConnection,
    sendMail,
    sendAppointmentConfirmationEmail,
    sendAppointmentCancellationEmail,
};