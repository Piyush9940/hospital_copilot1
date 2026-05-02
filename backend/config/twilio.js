import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const validateTwilioConfig = () => {
    if (!TWILIO_ACCOUNT_SID || typeof TWILIO_ACCOUNT_SID !== "string" || !TWILIO_ACCOUNT_SID.trim()) {
        throw createError("TWILIO_ACCOUNT_SID is missing in environment variables", 500);
    }

    if (!TWILIO_AUTH_TOKEN || typeof TWILIO_AUTH_TOKEN !== "string" || !TWILIO_AUTH_TOKEN.trim()) {
        throw createError("TWILIO_AUTH_TOKEN is missing in environment variables", 500);
    }

    if (!TWILIO_PHONE_NUMBER || typeof TWILIO_PHONE_NUMBER !== "string" || !TWILIO_PHONE_NUMBER.trim()) {
        throw createError("TWILIO_PHONE_NUMBER is missing in environment variables", 500);
    }
};

const validatePhoneNumber = (phone, fieldName = "Phone number") => {
    if (!phone || typeof phone !== "string" || !phone.trim()) {
        throw createError(`${fieldName} is required`, 400);
    }

    const normalized = phone.trim();

    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
        throw createError(
            `${fieldName} must be in valid E.164 format, e.g. +919876543210`,
            400
        );
    }

    return normalized;
};

let twilioClient = null;

/**
 * Returns singleton Twilio client
 * @returns {import("twilio").Twilio}
 */
export const getTwilioClient = () => {
    try {
        validateTwilioConfig();

        if (!twilioClient) {
            twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        }

        return twilioClient;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to initialize Twilio client: ${error.message}`, 500);
    }
};

/**
 * Send SMS message
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.body
 * @returns {Promise<Object>}
 */
export const sendSms = async ({ to, body }) => {
    try {
        const client = getTwilioClient();

        const toNumber = validatePhoneNumber(to, "Recipient phone number");
        const fromNumber = validatePhoneNumber(TWILIO_PHONE_NUMBER, "Twilio phone number");

        if (!body || typeof body !== "string" || !body.trim()) {
            throw createError("SMS body is required", 400);
        }

        if (body.trim().length > 1600) {
            throw createError("SMS body exceeds Twilio maximum length", 400);
        }

        const message = await client.messages.create({
            body: body.trim(),
            from: fromNumber,
            to: toNumber,
        });

        if (!message || !message.sid) {
            throw createError("Failed to send SMS", 500);
        }

        return {
            success: true,
            sid: message.sid,
            status: message.status,
            to: message.to,
            from: message.from,
            body: message.body,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        if (error.code || error.moreInfo) {
            throw createError(
                `Twilio SMS failed: ${error.message || "Unknown Twilio error"}`,
                500
            );
        }

        throw createError(`Failed to send SMS: ${error.message}`, 500);
    }
};

/**
 * Send WhatsApp message via Twilio
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.body
 * @returns {Promise<Object>}
 */
export const sendWhatsAppMessage = async ({ to, body }) => {
    try {
        const client = getTwilioClient();

        const toNumber = validatePhoneNumber(to, "Recipient phone number");

        if (!body || typeof body !== "string" || !body.trim()) {
            throw createError("WhatsApp message body is required", 400);
        }

        const message = await client.messages.create({
            body: body.trim(),
            from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${toNumber}`,
        });

        if (!message || !message.sid) {
            throw createError("Failed to send WhatsApp message", 500);
        }

        return {
            success: true,
            sid: message.sid,
            status: message.status,
            to: message.to,
            from: message.from,
            body: message.body,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        if (error.code || error.moreInfo) {
            throw createError(
                `Twilio WhatsApp failed: ${error.message || "Unknown Twilio error"}`,
                500
            );
        }

        throw createError(`Failed to send WhatsApp message: ${error.message}`, 500);
    }
};

/**
 * Send appointment reminder SMS
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export const sendAppointmentReminderSms = async ({
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
            throw createError("Missing required appointment reminder fields", 400);
        }

        const body = `Hello ${patientName}, reminder for your appointment (${appointmentCode}) with ${doctorName} on ${appointmentDate} at ${appointmentTime}. Consultation type: ${consultationType}. - Hospital Copilot`;

        return await sendSms({ to, body });
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to send appointment reminder SMS: ${error.message}`, 500);
    }
};

/**
 * Send emergency alert SMS
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export const sendEmergencyAlertSms = async ({
    to,
    patientName,
    alertMessage,
}) => {
    try {
        if (!patientName || !alertMessage) {
            throw createError("Missing required emergency alert fields", 400);
        }

        const body = `Emergency Alert: Patient ${patientName}. ${alertMessage}. Please respond immediately. - Hospital Copilot`;

        return await sendSms({ to, body });
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to send emergency alert SMS: ${error.message}`, 500);
    }
};

export default {
    getTwilioClient,
    sendSms,
    sendWhatsAppMessage,
    sendAppointmentReminderSms,
    sendEmergencyAlertSms,
};