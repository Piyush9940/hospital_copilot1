import {
    createChatSession,
    getSessionsByUserId,
    getMessagesBySessionId,
    saveMessage,
    getChatSessionById,
} from "../model/chat.model.js";

import { createError, validateId, validateStringId, sanitize } from "../utils/helper.js";

/**
 * Allowed chat roles for memory
 */
const ALLOWED_ROLES = ["user", "assistant", "doctor", "patient", "nurse", "system"];

/**
 * Validate role
 */
const validateRole = (role) => {
    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
        throw createError(
            `Invalid message role. Allowed values: ${ALLOWED_ROLES.join(", ")}`,
            400
        );
    }

    return normalizedRole;
};

/**
 * Create a new AI Nurse chat session
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @param {number|string|null} [payload.patientId]
 * @param {string} [payload.title]
 * @returns {Object}
 */
export const createMemorySession = ({ userId, patientId = null, title = "New Conversation" }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const validPatientId = patientId ? validateStringId(patientId, "Patient ID") : null;
        const normalizedTitle =
            typeof title === "string" && title.trim() ? title.trim() : "New Conversation";

        return createChatSession(validUserId, validPatientId, normalizedTitle, "ai_nurse");
    } catch (error) {
        throw createError(
            error.message || "Failed to create memory session",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get the latest AI Nurse memory session for a user
 * If none exists, create one automatically.
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @param {number|string|null} [payload.patientId]
 * @returns {Object}
 */
export const getOrCreateLatestMemorySession = ({ userId, patientId = null }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const validPatientId = patientId ? validateStringId(patientId, "Patient ID") : null;

        const sessions = getSessionsByUserId(validUserId, 50) || [];
        const aiSession = sessions.find((session) => session.session_type === "ai_nurse");

        if (aiSession) {
            return aiSession;
        }

        const created = createChatSession(
            validUserId,
            validPatientId,
            "AI Nurse Conversation",
            "ai_nurse"
        );

        if (!created || !created.lastInsertRowid) {
            throw createError("Failed to create AI Nurse session", 500);
        }

        const newSession = getChatSessionById(created.lastInsertRowid);

        if (!newSession) {
            throw createError("Created session could not be retrieved", 500);
        }

        return newSession;
    } catch (error) {
        throw createError(
            error.message || "Failed to get or create memory session",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Save a memory message
 * @param {Object} payload
 * @param {number|string} payload.sessionId
 * @param {number|string} payload.userId
 * @param {string} payload.role
 * @param {string} payload.content
 * @param {Object|null} [payload.medicalContext]
 * @param {Array|null} [payload.attachments]
 * @returns {Object}
 */
export const saveMemoryMessage = ({
    sessionId,
    userId,
    role,
    content,
    medicalContext = null,
    attachments = null,
}) => {
    try {
        const validSessionId = validateId(sessionId, "Session ID");
        const validUserId = validateId(userId, "User ID");
        const normalizedRole = validateRole(role);
        const normalizedContent = sanitize(content);

        if (!normalizedContent) {
            throw createError("Message content is required", 400);
        }

        return saveMessage(
            validSessionId,
            validUserId,
            normalizedRole,
            normalizedContent,
            medicalContext,
            attachments
        );
    } catch (error) {
        throw createError(
            error.message || "Failed to save memory message",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Fetch full memory messages for a session
 * @param {Object} payload
 * @param {number|string} payload.sessionId
 * @param {number} [payload.limit]
 * @returns {Array}
 */
export const getMemoryMessages = ({ sessionId, limit = 50 }) => {
    try {
        const validSessionId = validateId(sessionId, "Session ID");
        const validLimit = Number(limit);

        if (!Number.isInteger(validLimit) || validLimit <= 0 || validLimit > 500) {
            throw createError("Limit must be between 1 and 500", 400);
        }

        return getMessagesBySessionId(validSessionId, validLimit) || [];
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch memory messages",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Build AI-ready conversation history from memory
 * Converts DB messages into compact [{role, content}] history
 * @param {Object} payload
 * @param {number|string} payload.sessionId
 * @param {number} [payload.limit]
 * @returns {Array<{role:string, content:string}>}
 */
export const buildAiHistoryFromMemory = ({ sessionId, limit = 20 }) => {
    try {
        const messages = getMemoryMessages({ sessionId, limit });

        return messages
            .filter((msg) => msg && typeof msg.content === "string" && msg.content.trim())
            .map((msg) => {
                let role = "user";

                if (msg.role === "assistant" || msg.role === "system") {
                    role = "assistant";
                } else if (msg.role === "doctor" || msg.role === "nurse" || msg.role === "patient" || msg.role === "user") {
                    role = "user";
                }

                return {
                    role,
                    content: msg.content.trim(),
                };
            });
    } catch (error) {
        throw createError(
            error.message || "Failed to build AI history",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Save both user message and assistant reply in memory
 * @param {Object} payload
 * @param {number|string} payload.sessionId
 * @param {number|string} payload.userId
 * @param {string} payload.userMessage
 * @param {string} payload.assistantReply
 * @param {Object|null} [payload.medicalContext]
 * @returns {Object}
 */
export const saveConversationPair = ({
    sessionId,
    userId,
    userMessage,
    assistantReply,
    medicalContext = null,
}) => {
    try {
        const validSessionId = validateId(sessionId, "Session ID");
        const validUserId = validateId(userId, "User ID");

        const cleanedUserMessage = sanitize(userMessage);
        const cleanedAssistantReply = sanitize(assistantReply);

        if (!cleanedUserMessage) {
            throw createError("User message is required", 400);
        }

        if (!cleanedAssistantReply) {
            throw createError("Assistant reply is required", 400);
        }

        const userResult = saveMessage(
            validSessionId,
            validUserId,
            "user",
            cleanedUserMessage,
            medicalContext,
            null
        );

        const assistantResult = saveMessage(
            validSessionId,
            validUserId,
            "assistant",
            cleanedAssistantReply,
            medicalContext,
            null
        );

        return {
            success: true,
            userMessageId: userResult?.lastInsertRowid || null,
            assistantMessageId: assistantResult?.lastInsertRowid || null,
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to save conversation pair",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get latest AI Nurse session with ready-to-use history
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @param {number|string|null} [payload.patientId]
 * @param {number} [payload.limit]
 * @returns {Object}
 */
export const getMemoryContextForAi = ({ userId, patientId = null, limit = 20 }) => {
    try {
        const session = getOrCreateLatestMemorySession({ userId, patientId });
        const history = buildAiHistoryFromMemory({
            sessionId: session.id,
            limit,
        });

        return {
            session,
            history,
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to prepare memory context for AI",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    createMemorySession,
    getOrCreateLatestMemorySession,
    saveMemoryMessage,
    getMemoryMessages,
    buildAiHistoryFromMemory,
    saveConversationPair,
    getMemoryContextForAi,
};
