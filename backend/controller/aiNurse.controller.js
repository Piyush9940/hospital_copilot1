import {
    getAiHealthStatus,
    chatWithAiNurse,
    translateText,
    convertSpeechToText,
    convertTextToSpeech,
} from "../services/aiGateway.service.js";

import {
    getOrCreateLatestMemorySession,
    getMemoryMessages,
    getMemoryContextForAi,
    saveConversationPair,
} from "../services/memory.service.js";

import {
    buildPatientContext,
    buildCompactPatientContext,
} from "../services/patientContext.service.js";

import db from "../config/db.js";
import { createError, validateId, sanitize } from "../utils/helper.js";

const extractServiceData = (result, fallback = null) => {
    if (!result || typeof result !== "object") {
        return fallback;
    }

    return result.data !== undefined ? result.data : fallback;
};

const resolvePatientRecordIdFromUserId = (userId) => {
    const validUserId = validateId(userId, "User ID");

    const stmt = db.prepare(`
        SELECT id
        FROM patients
        WHERE user_id = ?
        LIMIT 1
    `);

    const row = stmt.get(validUserId);
    return row?.id || null;
};

export const healthCheck = async (req, res, next) => {
    try {
        const result = await getAiHealthStatus();
        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to check AI Nurse service health",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const chat = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");
        const message = sanitize(req.body?.message);
        const language =
            typeof req.body?.language === "string" && req.body.language.trim()
                ? req.body.language.trim()
                : "en";
        const appointmentId = req.body?.appointmentId || null;

        if (!message) {
            throw createError("Message is required", 400);
        }

        const patientRecordId = resolvePatientRecordIdFromUserId(userId);

        const { session, history } = getMemoryContextForAi({
            userId,
            patientId: patientRecordId,
            limit: 20,
        });

        let patientContext = {
            gender: null,
            age: null,
            history: [],
            allergies: [],
            medications: [],
            latestVitals: null,
            recentReports: [],
            appointment: null,
        };

        try {
            patientContext = buildCompactPatientContext({
                userId,
                appointmentId,
                reportLimit: 3,
                vitalsHistoryLimit: 3,
            });
        } catch (contextError) {
            if (contextError?.message !== "Patient profile not found for this user") {
                throw contextError;
            }
        }

        const aiResult = await chatWithAiNurse({
            message,
            patientId: userId,
            history,
            context: patientContext,
            language,
        });

        const aiData = extractServiceData(aiResult, {});
        const reply =
            aiData?.reply ||
            aiData?.message ||
            aiData?.response ||
            aiData?.answer ||
            "No response generated";

        await saveConversationPair({
            sessionId: session.id,
            userId,
            userMessage: message,
            assistantReply: reply,
            medicalContext: patientContext,
        });

        return res.status(200).json({
            success: true,
            message: "AI Nurse response generated successfully",
            data: {
                sessionId: session.id,
                reply,
                language,
                context: patientContext,
                raw: aiData,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to chat with AI Nurse",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};
export const getSession = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");
        const patientRecordId = resolvePatientRecordIdFromUserId(userId);

        const session = getOrCreateLatestMemorySession({
            userId,
            patientId: patientRecordId,
        });

        return res.status(200).json({
            success: true,
            message: "AI Nurse session fetched successfully",
            data: session,
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch AI Nurse session",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const getSessionMessages = async (req, res, next) => {
    try {
        const sessionId = validateId(req.params?.sessionId, "Session ID");
        const limit =
            req.query?.limit !== undefined ? Number(req.query.limit) : 50;

        const messages = getMemoryMessages({
            sessionId,
            limit,
        });

        return res.status(200).json({
            success: true,
            message: "AI Nurse session messages fetched successfully",
            data: {
                sessionId,
                messages,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch AI Nurse session messages",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const getPatientAwareContext = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");
        const appointmentId = req.query?.appointmentId || null;

        const context = buildPatientContext({
            userId,
            appointmentId,
            reportLimit: 5,
            vitalsHistoryLimit: 5,
        });

        return res.status(200).json({
            success: true,
            message: "Patient-aware AI context fetched successfully",
            data: context,
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient-aware AI context",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const getCompactContext = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");
        const appointmentId = req.query?.appointmentId || null;

        const context = buildCompactPatientContext({
            userId,
            appointmentId,
            reportLimit: 3,
            vitalsHistoryLimit: 3,
        });

        return res.status(200).json({
            success: true,
            message: "Compact AI context fetched successfully",
            data: context,
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch compact AI context",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const translate = async (req, res, next) => {
    try {
        const text = sanitize(req.body?.text);
        const sourceLanguage =
            typeof req.body?.sourceLanguage === "string" &&
            req.body.sourceLanguage.trim()
                ? req.body.sourceLanguage.trim()
                : "en";
        const targetLanguage =
            typeof req.body?.targetLanguage === "string" &&
            req.body.targetLanguage.trim()
                ? req.body.targetLanguage.trim()
                : "en";

        if (!text) {
            throw createError("Text is required for translation", 400);
        }

        const result = await translateText({
            text,
            sourceLanguage,
            targetLanguage,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to translate text",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const textToSpeech = async (req, res, next) => {
    try {
        const text = sanitize(req.body?.text);
        const language =
            typeof req.body?.language === "string" && req.body.language.trim()
                ? req.body.language.trim()
                : "en";
        const voice =
            typeof req.body?.voice === "string" && req.body.voice.trim()
                ? req.body.voice.trim()
                : "default";

        if (!text) {
            throw createError("Text is required for text-to-speech", 400);
        }

        const result = await convertTextToSpeech({
            text,
            language,
            voice,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to convert text to speech",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const speechToText = async (req, res, next) => {
    try {
        const audioPayload = req.file || req.body?.audio || req.body;

        if (!audioPayload) {
            throw createError("Audio payload is required", 400);
        }

        const result = await convertSpeechToText(audioPayload);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to convert speech to text",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};