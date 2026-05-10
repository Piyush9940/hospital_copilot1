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
        SELECT patient_id
        FROM patients
        WHERE user_id = ?
        LIMIT 1
    `);

    const row = stmt.get(validUserId);
    return row?.patient_id || null;
};

const MEDICAL_RELEVANCE_KEYWORDS = [
    "ache", "allerg", "ambulance", "appointment", "asthma", "blood", "bp",
    "breath", "burn", "cancer", "cardiac", "chest", "clinic", "cold", "cough",
    "diagnos", "diabetes", "dizzy", "doctor", "dose", "drug", "emergency",
    "fever", "fracture", "headache", "health", "heart", "hospital", "injury",
    "lab", "medical", "medicine", "medication", "nausea", "nurse", "oxygen",
    "pain", "patient", "prescription", "pulse", "rash", "report", "scan",
    "skin", "surgery", "symptom", "tablet", "test", "therapy", "treatment",
    "vaccine", "vital", "vomit", "wound", "xray", "x-ray", "mri", "ct",
    "ultrasound", "pdf", "discharge", "summary", "pathology", "radiology"
];

const NON_MEDICAL_REJECTION =
    "I’m here to help with medical and health-related questions only. Please ask me about symptoms, medicines, reports, vitals, appointments, or other care-related concerns.";

const normalizeAttachmentMetadata = (attachments) => {
    if (!Array.isArray(attachments)) return [];

    return attachments
        .map((item) => {
            if (typeof item === "string") {
                return { name: item, type: "", size: null };
            }

            if (!item || typeof item !== "object") return null;

            return {
                name: typeof item.name === "string" ? item.name : "",
                type: typeof item.type === "string" ? item.type : "",
                size: Number.isFinite(Number(item.size)) ? Number(item.size) : null,
            };
        })
        .filter(Boolean);
};

const isMedicalRelated = (message, attachments = []) => {
    const haystack = [
        message,
        ...attachments.flatMap((item) => [item.name, item.type]),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (!haystack.trim()) return false;

    return MEDICAL_RELEVANCE_KEYWORDS.some((keyword) => haystack.includes(keyword));
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
        const attachments = normalizeAttachmentMetadata(req.body?.attachments);

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

        if (!isMedicalRelated(message, attachments)) {
            await saveConversationPair({
                sessionId: session.id,
                userId,
                userMessage: message,
                assistantReply: NON_MEDICAL_REJECTION,
                medicalContext: {
                    patientContext,
                    attachments,
                    refusedReason: "non_medical_query",
                },
            });

            return res.status(200).json({
                success: true,
                message: "AI Nurse refused non-medical query",
                data: {
                    sessionId: session.id,
                    response: NON_MEDICAL_REJECTION,
                    reply: NON_MEDICAL_REJECTION,
                    language,
                    patientContext,
                    context: patientContext,
                    ragResponse: null,
                    refused: true,
                    refusalReason: "non_medical_query",
                },
            });
        }

        const aiResult = await chatWithAiNurse({
            message,
            patientId: userId,
            history,
            context: {
                ...patientContext,
                uploadedAttachments: attachments,
            },
            language,
            attachments,
        });

        const aiData = extractServiceData(aiResult, {});
        const reply =
            aiData?.reply ||
            aiData?.message ||
            aiData?.response ||
            aiData?.answer ||
            "No response generated";
        const ragResponse =
            aiData?.ragResponse ||
            aiData?.rag_response ||
            aiData?.rag ||
            aiData?.retrieved_context ||
            aiData?.sources ||
            aiData?.context ||
            aiData;

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
                response: reply,
                reply,
                language,
                patientContext: patientContext,
                context: patientContext,
                ragResponse,
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
