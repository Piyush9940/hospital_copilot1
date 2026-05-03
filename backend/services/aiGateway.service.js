import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { createError, sanitize } from "../utils/helper.js";

const AI_NURSE_BASE_URL =
    process.env.AI_NURSE_BASE_URL || "https://piyush9940-hospital-copilot-ai-service.hf.space";

const AI_NURSE_TIMEOUT = Number(process.env.AI_NURSE_TIMEOUT || 120000);

console.log("LOADED NEW AI GATEWAY SERVICE");
console.log("AI_NURSE_BASE_URL =", AI_NURSE_BASE_URL);

const aiClient = axios.create({
    baseURL: AI_NURSE_BASE_URL,
    timeout: AI_NURSE_TIMEOUT,
});

const normalizeAxiosError = (error, fallbackMessage) => {
    console.error("normalizeAxiosError debug:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
    });

    if (error.response) {
        return createError(
            error.response?.data?.detail ||
                error.response?.data?.error ||
                error.response?.data?.message ||
                fallbackMessage,
            error.response?.status || 500,
            error.response?.data || null
        );
    }

    if (error.code === "ECONNABORTED") {
        return createError(
            `${fallbackMessage}. AI Nurse request timed out at ${AI_NURSE_BASE_URL}`,
            504
        );
    }

    if (error.code === "ECONNREFUSED") {
        return createError(
            `${fallbackMessage}. Connection refused at ${AI_NURSE_BASE_URL}`,
            503
        );
    }

    if (error.code === "ENOTFOUND") {
        return createError(
            `${fallbackMessage}. Host not found for ${AI_NURSE_BASE_URL}`,
            503
        );
    }

    if (error.request) {
        return createError(
            `${fallbackMessage}. Request was sent but no valid response was received from ${AI_NURSE_BASE_URL}`,
            503
        );
    }

    return createError(error.message || fallbackMessage, 500);
};

export const getAiHealthStatus = async () => {
    try {
        const response = await aiClient.get("/health");

        return {
            success: true,
            message: "AI Nurse service is healthy",
            data: response.data,
        };
    } catch (error) {
        throw normalizeAxiosError(error, "Failed to check AI Nurse health");
    }
};

export const chatWithAiNurse = async ({
    message,
    patientId,
    history = [],
    context = {},
    language = "en",
}) => {
    try {
        const normalizedMessage = sanitize(message);

        if (!normalizedMessage) {
            throw createError("Message is required", 400);
        }

        const payload = {
            message: normalizedMessage,
            patient_id: patientId ?? null,
            history: Array.isArray(history) ? history : [],
            context: context && typeof context === "object" ? context : {},
            language:
                typeof language === "string" && language.trim()
                    ? language.trim()
                    : "en",
        };

        console.log("chatWithAiNurse called");
        console.log("Sending payload to AI Nurse:", payload);

        const response = await aiClient.post("/chat", payload);

        console.log("AI Nurse raw response:", response.data);

        return {
            success: true,
            message: "AI Nurse response generated successfully",
            data: response.data,
        };
    } catch (error) {
        console.error("AI Nurse axios error:", {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data,
        });

        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Failed to chat with AI Nurse");
    }
};

export const translateText = async ({
    text,
    sourceLanguage = "en",
    targetLanguage = "en",
}) => {
    try {
        const normalizedText = sanitize(text);

        if (!normalizedText) {
            throw createError("Text is required", 400);
        }

        const payload = {
            text: normalizedText,
            source_language: sourceLanguage,
            target_language: targetLanguage,
        };

        const response = await aiClient.post("/translate", payload);

        return {
            success: true,
            message: "Text translated successfully",
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Failed to translate text");
    }
};

export const convertTextToSpeech = async ({
    text,
    language = "en",
    voice = "default",
}) => {
    try {
        const normalizedText = sanitize(text);

        if (!normalizedText) {
            throw createError("Text is required", 400);
        }

        const payload = {
            text: normalizedText,
            language,
            voice,
        };

        const response = await aiClient.post("/tts", payload);

        return {
            success: true,
            message: "Text to speech generated successfully",
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Failed to convert text to speech");
    }
};

export const convertSpeechToText = async (audioInput) => {
    try {
        let filePath = null;
        let fileName = "audio.wav";

        if (audioInput?.path) {
            filePath = audioInput.path;
            fileName = audioInput.originalname || fileName;
        } else if (typeof audioInput === "string" && audioInput.trim()) {
            filePath = audioInput.trim();
        } else if (audioInput?.audio?.path) {
            filePath = audioInput.audio.path;
            fileName = audioInput.audio.originalname || fileName;
        }

        if (!filePath) {
            throw createError("Audio file is required", 400);
        }

        if (!fs.existsSync(filePath)) {
            throw createError("Audio file not found", 404);
        }

        const form = new FormData();
        form.append("file", fs.createReadStream(filePath), fileName);

        const response = await aiClient.post("/stt", form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
        });

        return {
            success: true,
            message: "Speech converted to text successfully",
            data: response.data,
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw normalizeAxiosError(error, "Failed to convert speech to text");
    }
};

export default {
    getAiHealthStatus,
    chatWithAiNurse,
    translateText,
    convertTextToSpeech,
    convertSpeechToText,
};