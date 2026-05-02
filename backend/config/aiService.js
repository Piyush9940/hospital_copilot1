import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_TIMEOUT = Number(process.env.AI_SERVICE_TIMEOUT || 30000);
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || "";

const createError = (message, statusCode = 500, details = null) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
};

const validateAiServiceConfig = () => {
    if (!AI_SERVICE_URL || typeof AI_SERVICE_URL !== "string" || !AI_SERVICE_URL.trim()) {
        throw createError("AI_SERVICE_URL is missing in environment variables", 500);
    }

    if (!Number.isFinite(AI_SERVICE_TIMEOUT) || AI_SERVICE_TIMEOUT <= 0) {
        throw createError("AI_SERVICE_TIMEOUT must be a valid positive number", 500);
    }
};

const getAiHeaders = () => {
    const headers = {
        "Content-Type": "application/json",
    };

    if (AI_SERVICE_API_KEY && AI_SERVICE_API_KEY.trim()) {
        headers["x-api-key"] = AI_SERVICE_API_KEY.trim();
    }

    return headers;
};

let aiClient = null;

/**
 * Returns singleton axios client for AI service
 * @returns {import("axios").AxiosInstance}
 */
export const getAiServiceClient = () => {
    try {
        validateAiServiceConfig();

        if (!aiClient) {
            aiClient = axios.create({
                baseURL: AI_SERVICE_URL.trim(),
                timeout: AI_SERVICE_TIMEOUT,
                headers: getAiHeaders(),
            });
        }

        return aiClient;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(`Failed to initialize AI service client: ${error.message}`, 500);
    }
};

const normalizeAxiosError = (error, fallbackMessage) => {
    if (error.response) {
        const statusCode = error.response.status || 500;
        const responseData = error.response.data || null;

        const message =
            responseData?.message ||
            responseData?.detail ||
            fallbackMessage ||
            "AI service request failed";

        return createError(message, statusCode, responseData);
    }

    if (error.code === "ECONNABORTED") {
        return createError("AI service request timed out", 504);
    }

    if (error.code === "ECONNREFUSED") {
        return createError("Unable to connect to AI service", 503);
    }

    if (error.code === "ENOTFOUND") {
        return createError("AI service host not found", 503);
    }

    return createError(`${fallbackMessage}: ${error.message}`, 500);
};

/**
 * Health check for AI service
 * @returns {Promise<Object>}
 */
export const checkAiServiceHealth = async () => {
    try {
        const client = getAiServiceClient();

        const response = await client.get("/health");

        if (!response?.data) {
            throw createError("AI service health check returned empty response", 502);
        }

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "AI service health check failed");
    }
};

/**
 * Send chat request to AI Nurse service
 * @param {Object} payload
 * @param {string} payload.message
 * @param {string|number} payload.patientId
 * @param {Array} [payload.history]
 * @param {Object} [payload.context]
 * @param {string} [payload.language]
 * @returns {Promise<Object>}
 */
export const sendAiNurseMessage = async ({
    message,
    patientId,
    history = [],
    context = {},
    language = "en",
}) => {
    try {
        const client = getAiServiceClient();

        if (!message || typeof message !== "string" || !message.trim()) {
            throw createError("Message is required", 400);
        }

        if (patientId === undefined || patientId === null || String(patientId).trim() === "") {
            throw createError("patientId is required", 400);
        }

        if (!Array.isArray(history)) {
            throw createError("history must be an array", 400);
        }

        if (!context || typeof context !== "object" || Array.isArray(context)) {
            throw createError("context must be a valid object", 400);
        }

        if (!language || typeof language !== "string" || !language.trim()) {
            throw createError("language must be a valid string", 400);
        }

        const payload = {
            message: message.trim(),
            patientId: String(patientId),
            history,
            context,
            language: language.trim(),
        };

        const response = await client.post("/nurse/chat", payload);

        if (!response?.data) {
            throw createError("AI Nurse returned empty response", 502);
        }

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Failed to get AI Nurse response");
    }
};

/**
 * Translate text using AI service
 * @param {Object} payload
 * @param {string} payload.text
 * @param {string} payload.sourceLanguage
 * @param {string} payload.targetLanguage
 * @returns {Promise<Object>}
 */
export const translateTextWithAiService = async ({
    text,
    sourceLanguage,
    targetLanguage,
}) => {
    try {
        const client = getAiServiceClient();

        if (!text || typeof text !== "string" || !text.trim()) {
            throw createError("Text is required for translation", 400);
        }

        if (!sourceLanguage || typeof sourceLanguage !== "string" || !sourceLanguage.trim()) {
            throw createError("sourceLanguage is required", 400);
        }

        if (!targetLanguage || typeof targetLanguage !== "string" || !targetLanguage.trim()) {
            throw createError("targetLanguage is required", 400);
        }

        const response = await client.post("/translation/text", {
            text: text.trim(),
            sourceLanguage: sourceLanguage.trim(),
            targetLanguage: targetLanguage.trim(),
        });

        if (!response?.data) {
            throw createError("Translation service returned empty response", 502);
        }

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Text translation failed");
    }
};

/**
 * Convert speech/audio to text using AI service
 * @param {FormData|Object} payload
 * @returns {Promise<Object>}
 */
export const speechToTextWithAiService = async (payload) => {
    try {
        const client = getAiServiceClient();

        if (!payload) {
            throw createError("Audio payload is required", 400);
        }

        const response = await client.post("/voice/stt", payload, {
            headers: {
                ...getAiHeaders(),
            },
        });

        if (!response?.data) {
            throw createError("Speech-to-text service returned empty response", 502);
        }

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Speech-to-text failed");
    }
};

/**
 * Convert text to speech using AI service
 * @param {Object} payload
 * @param {string} payload.text
 * @param {string} [payload.language]
 * @param {string} [payload.voice]
 * @returns {Promise<Object>}
 */
export const textToSpeechWithAiService = async ({
    text,
    language = "en",
    voice = "default",
}) => {
    try {
        const client = getAiServiceClient();

        if (!text || typeof text !== "string" || !text.trim()) {
            throw createError("Text is required for text-to-speech", 400);
        }

        const response = await client.post("/voice/tts", {
            text: text.trim(),
            language,
            voice,
        });

        if (!response?.data) {
            throw createError("Text-to-speech service returned empty response", 502);
        }

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Text-to-speech failed");
    }
};

export default {
    getAiServiceClient,
    checkAiServiceHealth,
    sendAiNurseMessage,
    translateTextWithAiService,
    speechToTextWithAiService,
    textToSpeechWithAiService,
};