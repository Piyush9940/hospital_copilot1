import {
    requestChatPermission,
    approveChatPermission,
    rejectChatPermission,
    isChatAllowed,
    getPermissionsByAppointment,
} from "../model/chatPermission.model.js";

import {
    createChatSession,
    getChatSessionById,
    getMessagesBySessionId,
    saveMessage,
    markMessageAsRead,
    getUnreadCount,
} from "../model/chat.model.js";

import { getAppointmentById } from "../model/appointment.model.js";
import { createError, validateId, validateStringId, sanitize } from "../utils/helper.js";
import { APPOINTMENT_STATUS } from "../utils/constants.js";

const CHAT_ROLES = ["patient", "doctor", "nurse", "assistant", "system", "user"];

/**
 * Validate chat role
 */
const validateChatRole = (role) => {
    const normalized = typeof role === "string" ? role.trim().toLowerCase() : "";

    if (!CHAT_ROLES.includes(normalized)) {
        throw createError(
            `Invalid chat role. Allowed values: ${CHAT_ROLES.join(", ")}`,
            400
        );
    }

    return normalized;
};

/**
 * Normalize permission response
 */
const normalizePermission = (permission) => {
    if (!permission) return null;

    return {
        id: permission.id || null,
        appointmentId: permission.appointment_id || null,
        patientId: permission.patient_id || null,
        doctorId: permission.doctor_id || null,
        status: permission.status || null,
        doctorName: permission.doctor_name || null,
        requestedAt: permission.requested_at || null,
        approvedAt: permission.approved_at || null,
        expiresAt: permission.expires_at || null,
        updatedAt: permission.updated_at || null,
    };
};

/**
 * Normalize chat message response
 */
const normalizeMessage = (message) => {
    if (!message) return null;

    return {
        id: message.id || null,
        sessionId: message.session_id || null,
        userId: message.user_id || null,
        role: message.role || null,
        content: message.content || null,
        medicalContext: message.medical_context || null,
        attachments: message.attachments || null,
        isRead: Number(message.is_read) === 1,
        createdAt: message.created_at || null,
    };
};

/**
 * Normalize chat session
 */
const normalizeSession = (session) => {
    if (!session) return null;

    return {
        id: session.id || null,
        userId: session.user_id || null,
        patientId: session.patient_id || null,
        title: session.title || null,
        sessionType: session.session_type || null,
        lastMessageAt: session.last_message_at || null,
        messageCount: session.message_count ?? 0,
        createdAt: session.created_at || null,
        updatedAt: session.updated_at || null,
    };
};

/**
 * Ensure appointment exists and is usable for communication
 */
const validateAppointmentForCommunication = (appointment) => {
    if (!appointment) {
        throw createError("Appointment not found", 404);
    }

    if (appointment.appointment_status === APPOINTMENT_STATUS.CANCELLED) {
        throw createError("Communication is not allowed for cancelled appointments", 400);
    }
};

/**
 * Patient requests chat permission for an appointment
 */
export const createCommunicationRequest = (appointmentId, patientId, doctorId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validPatientId = validateStringId(patientId, "Patient ID");
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const appointment = getAppointmentById(validAppointmentId);
        validateAppointmentForCommunication(appointment);

        if (String(appointment.patient_id) !== validPatientId) {
            throw createError("Patient does not belong to this appointment", 403);
        }

        if (Number(appointment.doctor_id) !== validDoctorId) {
            throw createError("Doctor does not belong to this appointment", 403);
        }

        const result = requestChatPermission(
            validAppointmentId,
            validPatientId,
            validDoctorId
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create communication request", 500);
        }

        const permissions = getPermissionsByAppointment(validAppointmentId) || [];
        const createdPermission = permissions.find(
            (item) => Number(item.id) === Number(result.lastInsertRowid)
        );

        return {
            success: true,
            message: "Communication request created successfully",
            data: normalizePermission(createdPermission) || {
                id: result.lastInsertRowid,
                appointmentId: validAppointmentId,
                patientId: validPatientId,
                doctorId: validDoctorId,
                status: "pending",
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create communication request",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Doctor approves communication request
 */
export const approveCommunicationRequest = (permissionId) => {
    try {
        const validPermissionId = validateId(permissionId, "Permission ID");

        const result = approveChatPermission(validPermissionId);

        if (!result || result.changes === 0) {
            throw createError("Communication request not found or not updated", 404);
        }

        return {
            success: true,
            message: "Communication request approved successfully",
            data: {
                permissionId: validPermissionId,
                status: "approved",
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to approve communication request",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Doctor rejects communication request
 */
export const rejectCommunicationRequest = (permissionId) => {
    try {
        const validPermissionId = validateId(permissionId, "Permission ID");

        const result = rejectChatPermission(validPermissionId);

        if (!result || result.changes === 0) {
            throw createError("Communication request not found or not updated", 404);
        }

        return {
            success: true,
            message: "Communication request rejected successfully",
            data: {
                permissionId: validPermissionId,
                status: "rejected",
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to reject communication request",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Check whether communication is allowed for a specific appointment
 */
export const checkCommunicationAccess = (appointmentId, patientId, doctorId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validPatientId = validateStringId(patientId, "Patient ID");
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const appointment = getAppointmentById(validAppointmentId);
        validateAppointmentForCommunication(appointment);

        const permission = isChatAllowed(
            validAppointmentId,
            validPatientId,
            validDoctorId
        );

        return {
            success: true,
            message: permission
                ? "Communication access granted"
                : "Communication access not granted",
            data: {
                allowed: !!permission,
                permission: normalizePermission(permission),
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to check communication access",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Create chat session after permission approval
 *
 * userId should usually be the patient or doctor user id who owns the session.
 * patientId is the patient table id.
 */
export const createAuthorizedChatSession = ({
    appointmentId,
    userId,
    patientId,
    doctorId,
    title = "Doctor Consultation Chat",
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validUserId = validateId(userId, "User ID");
        const validPatientId = validateStringId(patientId, "Patient ID");
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const appointment = getAppointmentById(validAppointmentId);
        validateAppointmentForCommunication(appointment);

        const permission = isChatAllowed(
            validAppointmentId,
            validPatientId,
            validDoctorId
        );

        if (!permission) {
            throw createError("Communication permission is not approved", 403);
        }

        const sessionTitle =
            typeof title === "string" && title.trim()
                ? title.trim()
                : "Doctor Consultation Chat";

        const result = createChatSession(
            validUserId,
            validPatientId,
            sessionTitle,
            "doctor_chat"
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create authorized chat session", 500);
        }

        const session = getChatSessionById(result.lastInsertRowid);

        return {
            success: true,
            message: "Authorized chat session created successfully",
            data: normalizeSession(session),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create authorized chat session",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Send message in an authorized chat session
 */
export const sendCommunicationMessage = ({
    appointmentId,
    patientId,
    doctorId,
    sessionId,
    userId,
    role,
    content,
    medicalContext = null,
    attachments = null,
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");
        const validPatientId = validateStringId(patientId, "Patient ID");
        const validDoctorId = validateId(doctorId, "Doctor ID");
        const validSessionId = validateId(sessionId, "Session ID");
        const validUserId = validateId(userId, "User ID");

        const normalizedRole = validateChatRole(role);
        const normalizedContent = sanitize(content);

        if (!normalizedContent) {
            throw createError("Message content is required", 400);
        }

        const appointment = getAppointmentById(validAppointmentId);
        validateAppointmentForCommunication(appointment);

        const permission = isChatAllowed(
            validAppointmentId,
            validPatientId,
            validDoctorId
        );

        if (!permission) {
            throw createError("Communication is not allowed for this appointment", 403);
        }

        const session = getChatSessionById(validSessionId);
        if (!session) {
            throw createError("Chat session not found", 404);
        }

        const result = saveMessage(
            validSessionId,
            validUserId,
            normalizedRole,
            normalizedContent,
            medicalContext,
            attachments
        );

        return {
            success: true,
            message: "Message sent successfully",
            data: {
                messageId: result?.lastInsertRowid || null,
                sessionId: validSessionId,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to send communication message",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get communication messages for a session
 */
export const getCommunicationMessages = ({
    sessionId,
    limit = 100,
}) => {
    try {
        const validSessionId = validateId(sessionId, "Session ID");
        const validLimit = Number(limit);

        if (!Number.isInteger(validLimit) || validLimit <= 0 || validLimit > 500) {
            throw createError("Limit must be between 1 and 500", 400);
        }

        const session = getChatSessionById(validSessionId);
        if (!session) {
            throw createError("Chat session not found", 404);
        }

        const messages = getMessagesBySessionId(validSessionId, validLimit) || [];

        return {
            success: true,
            message: "Communication messages fetched successfully",
            data: {
                session: normalizeSession(session),
                messages: messages.map(normalizeMessage),
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch communication messages",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Mark a message as read
 */
export const markCommunicationMessageAsRead = (messageId) => {
    try {
        const validMessageId = validateId(messageId, "Message ID");

        const result = markMessageAsRead(validMessageId);

        if (!result || result.changes === 0) {
            throw createError("Message not found or already updated", 404);
        }

        return {
            success: true,
            message: "Message marked as read successfully",
            data: {
                messageId: validMessageId,
                isRead: true,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to mark message as read",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get unread assistant/communication count for a user
 */
export const getCommunicationUnreadCount = (userId) => {
    try {
        const validUserId = validateId(userId, "User ID");

        const result = getUnreadCount(validUserId);

        return {
            success: true,
            message: "Unread count fetched successfully",
            data: {
                userId: validUserId,
                unreadCount: Number(result?.count || 0),
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch unread count",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all permissions for an appointment
 */
export const getAppointmentCommunicationPermissions = (appointmentId) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        const appointment = getAppointmentById(validAppointmentId);
        validateAppointmentForCommunication(appointment);

        const permissions = getPermissionsByAppointment(validAppointmentId) || [];

        return {
            success: true,
            message: "Communication permissions fetched successfully",
            data: permissions.map(normalizePermission),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch appointment communication permissions",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    createCommunicationRequest,
    approveCommunicationRequest,
    rejectCommunicationRequest,
    checkCommunicationAccess,
    createAuthorizedChatSession,
    sendCommunicationMessage,
    getCommunicationMessages,
    markCommunicationMessageAsRead,
    getCommunicationUnreadCount,
    getAppointmentCommunicationPermissions,
};
