import db from "../config/db.js";
import { createError, validateId, safeJsonStringify } from "../utils/helper.js";

const CHAT_ROLES = ["user", "assistant", "doctor", "patient", "nurse", "system"];
const CHAT_SESSION_TYPES = ["ai_nurse", "doctor_chat", "support"];

const validateRole = (role) => {
    if (!CHAT_ROLES.includes(role)) {
        throw createError(`Invalid chat role. Allowed values: ${CHAT_ROLES.join(", ")}`, 400);
    }
};

export const createChatSession = (userId, patientId = null, title = "New Conversation", sessionType = "ai_nurse") => {
    try {
        const validUserId = validateId(userId, "User ID");
        const validPatientId = patientId ? validateId(patientId, "Patient ID") : null;
        const normalizedTitle = typeof title === "string" && title.trim() ? title.trim() : "New Conversation";

        if (!CHAT_SESSION_TYPES.includes(sessionType)) {
            throw createError(`Invalid session type. Allowed values: ${CHAT_SESSION_TYPES.join(", ")}`, 400);
        }

        const stmt = db.prepare(`
            INSERT INTO chat_sessions (user_id, patient_id, title, session_type, last_message_at, message_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(validUserId, validPatientId, normalizedTitle, sessionType);
    } catch (error) {
        throw createError(error.message || "Failed to create chat session", error.statusCode || 500);
    }
};

export const getChatSessionById = (id) => {
    try {
        const sessionId = validateId(id, "Session ID");

        const stmt = db.prepare(`
            SELECT cs.*, u.name AS user_name
            FROM chat_sessions cs
            JOIN users u ON cs.user_id = u.id
            WHERE cs.id = ?
        `);

        return stmt.get(sessionId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch chat session", error.statusCode || 500);
    }
};

export const getSessionsByUserId = (userId, limit = 50) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const validLimit = Number(limit);

        if (!Number.isInteger(validLimit) || validLimit <= 0 || validLimit > 200) {
            throw createError("Limit must be between 1 and 200", 400);
        }

        const stmt = db.prepare(`
            SELECT *
            FROM chat_sessions
            WHERE user_id = ?
            ORDER BY last_message_at DESC
            LIMIT ?
        `);

        return stmt.all(validUserId, validLimit);
    } catch (error) {
        throw createError(error.message || "Failed to fetch chat sessions", error.statusCode || 500);
    }
};

export const updateSessionTitle = (id, title) => {
    try {
        const sessionId = validateId(id, "Session ID");
        const normalizedTitle = typeof title === "string" && title.trim() ? title.trim() : null;

        if (!normalizedTitle) {
            throw createError("Title is required", 400);
        }

        const stmt = db.prepare(`
            UPDATE chat_sessions
            SET title = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(normalizedTitle, sessionId);
    } catch (error) {
        throw createError(error.message || "Failed to update session title", error.statusCode || 500);
    }
};

export const updateLastMessageTime = (id) => {
    try {
        const sessionId = validateId(id, "Session ID");

        const stmt = db.prepare(`
            UPDATE chat_sessions
            SET last_message_at = CURRENT_TIMESTAMP,
                message_count = message_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(sessionId);
    } catch (error) {
        throw createError(error.message || "Failed to update last message time", error.statusCode || 500);
    }
};

export const saveMessage = (sessionId, userId, role, content, medicalContext = null, attachments = null) => {
    try {
        const validSessionId = validateId(sessionId, "Session ID");
        const validUserId = validateId(userId, "User ID");
        const normalizedRole = typeof role === "string" ? role.trim() : "";
        const normalizedContent = typeof content === "string" ? content.trim() : "";

        validateRole(normalizedRole);

        if (!normalizedContent) {
            throw createError("Message content is required", 400);
        }

        const contextJson = medicalContext ? safeJsonStringify(medicalContext) : null;
        const attachmentsJson = attachments ? safeJsonStringify(attachments) : null;

        const stmt = db.prepare(`
            INSERT INTO chat_messages (
                session_id,
                user_id,
                role,
                content,
                medical_context,
                attachments,
                is_read,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `);

        const result = stmt.run(
            validSessionId,
            validUserId,
            normalizedRole,
            normalizedContent,
            contextJson,
            attachmentsJson
        );

        updateLastMessageTime(validSessionId);

        return result;
    } catch (error) {
        throw createError(error.message || "Failed to save message", error.statusCode || 500);
    }
};

export const getMessagesBySessionId = (sessionId, limit = 100) => {
    try {
        const validSessionId = validateId(sessionId, "Session ID");
        const validLimit = Number(limit);

        if (!Number.isInteger(validLimit) || validLimit <= 0 || validLimit > 500) {
            throw createError("Limit must be between 1 and 500", 400);
        }

        const stmt = db.prepare(`
            SELECT *
            FROM chat_messages
            WHERE session_id = ?
            ORDER BY created_at ASC
            LIMIT ?
        `);

        return stmt.all(validSessionId, validLimit);
    } catch (error) {
        throw createError(error.message || "Failed to fetch messages", error.statusCode || 500);
    }
};

export const getRecentMessagesByUserId = (userId, limit = 50) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const validLimit = Number(limit);

        if (!Number.isInteger(validLimit) || validLimit <= 0 || validLimit > 200) {
            throw createError("Limit must be between 1 and 200", 400);
        }

        const stmt = db.prepare(`
            SELECT cm.*, cs.title AS session_title
            FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.user_id = ?
            ORDER BY cm.created_at DESC
            LIMIT ?
        `);

        return stmt.all(validUserId, validLimit);
    } catch (error) {
        throw createError(error.message || "Failed to fetch recent messages", error.statusCode || 500);
    }
};

export const searchMessages = (userId, searchTerm) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const normalizedSearchTerm = typeof searchTerm === "string" ? searchTerm.trim() : "";

        if (!normalizedSearchTerm) {
            throw createError("Search term is required", 400);
        }

        const term = `%${normalizedSearchTerm}%`;

        const stmt = db.prepare(`
            SELECT cm.*, cs.title AS session_title
            FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.user_id = ?
              AND (cm.content LIKE ? OR cm.medical_context LIKE ?)
            ORDER BY cm.created_at DESC
        `);

        return stmt.all(validUserId, term, term);
    } catch (error) {
        throw createError(error.message || "Failed to search messages", error.statusCode || 500);
    }
};

export const markMessageAsRead = (id) => {
    try {
        const messageId = validateId(id, "Message ID");

        const stmt = db.prepare(`
            UPDATE chat_messages
            SET is_read = 1
            WHERE id = ?
        `);

        return stmt.run(messageId);
    } catch (error) {
        throw createError(error.message || "Failed to mark message as read", error.statusCode || 500);
    }
};

export const getUnreadCount = (userId) => {
    try {
        const validUserId = validateId(userId, "User ID");

        const stmt = db.prepare(`
            SELECT COUNT(*) AS count
            FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.user_id = ?
              AND cm.role = 'assistant'
              AND cm.is_read = 0
        `);

        return stmt.get(validUserId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch unread count", error.statusCode || 500);
    }
};