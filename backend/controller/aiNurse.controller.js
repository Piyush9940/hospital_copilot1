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
    "ultrasound", "pdf", "discharge", "summary", "pathology", "radiology",
    "covid", "diet", "exercise", "flu", "hypertension", "infection",
    "insomnia", "mental", "migraine", "nutrition", "period", "pregnan",
    "pressure", "sleep", "vitamin", "wellness"
];

const GENERAL_MEDICAL_PATTERNS = [
    /\bwhat\s+(is|are|causes?)\b.*\b(disease|condition|syndrome|infection|medicine|medication|symptom|treatment|therapy|vaccine|vitamin)\b/i,
    /\b(how|why|when)\b.*\b(doctor|medicine|medication|symptom|pain|sleep|diet|exercise|health|wellness|pregnan|period|infection|fever|cough)\b/i,
    /\b(my|i\s+have|i\s+feel|i\s+am|i'm)\b.*\b(hurt|sick|unwell|weak|tired|dizzy|nauseous|feverish|anxious|depressed|pain|ache)\b/i,
];

const EMERGENCY_KEYWORDS = [
    "can't breathe", "cannot breathe", "chest pain", "stroke", "seizure",
    "unconscious", "heavy bleeding", "severe bleeding", "heart attack",
    "suicide", "poison", "overdose", "emergency", "ambulance", "sos"
];

const detectWebsiteAction = (message, role = "patient") => {
    const text = String(message || "").toLowerCase();
    if (!text) return null;
    const normalizedRole = String(role || "patient").toLowerCase();
    const pickUrl = (urls) => urls[normalizedRole] || urls.patient || urls.doctor || urls.nurse;

    if (EMERGENCY_KEYWORDS.some((keyword) => text.includes(keyword))) {
        return {
            key: "emergency",
            label: "Open emergency help",
            url: pickUrl({ patient: "emergency.html", doctor: "doctor-emergency.html" }),
        };
    }

    const actions = [
        { key: "appointments", label: "Open appointments", urls: { patient: "appointment-list.html", doctor: "doctor-appointments.html" }, terms: ["book appointment", "appointment", "consult doctor", "schedule"] },
        { key: "profile", label: "Open profile settings", urls: { patient: "profile-settings.html", doctor: "profile-settings.html", nurse: "profile-settings.html" }, terms: ["profile", "settings", "update my details"] },
        { key: "reports", label: "Open reports", urls: { patient: "patient-reports.html", doctor: "doctor-reports.html" }, terms: ["report", "medical record", "pdf"] },
        { key: "vitals", label: "Open vitals", urls: { patient: "patient-vitals.html", doctor: "doctor-vitals.html" }, terms: ["vitals", "blood pressure", "heart rate", "bp"] },
        { key: "diagnosis", label: "Open AI diagnosis summary", urls: { patient: "patient-diagnosis.html" }, terms: ["diagnosis", "scan", "summary"] },
        { key: "dashboard", label: "Open dashboard", urls: { patient: "patient-dashboard.html", doctor: "doctor-dashboard.html", nurse: "nurse-dashboard.html" }, terms: ["dashboard", "home page"] },
    ];

    const match = actions.find((action) => action.terms.some((term) => text.includes(term)));
    if (!match) return null;
    const url = pickUrl(match.urls);
    return url ? { key: match.key, label: match.label, url } : null;
};

const isEmergencyMessage = (message) => {
    const text = String(message || "").toLowerCase();
    return EMERGENCY_KEYWORDS.some((keyword) => text.includes(keyword));
};

const appendSafetyDisclaimer = (reply, emergency = false) => {
    let base = String(reply || "").trim();
    if (emergency && !base.toLowerCase().includes("emergency services")) {
        base = `If you are in immediate danger, call local emergency services now. Stay with someone if possible, keep the patient still, and share symptoms, medicines, allergies, and location with responders.\n\n${base}`;
    }
    const disclaimer = emergency
        ? "This is only AI guidance, not a medical diagnosis. If this may be an emergency, call local emergency services now and consult a doctor immediately."
        : "This is AI guidance only and is not a substitute for a doctor. Please consult a qualified clinician for medical decisions.";
    const lower = base.toLowerCase();

    return lower.includes("ai guidance") || lower.includes("consult a doctor")
        ? base
        : `${base}\n\n${disclaimer}`;
};

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

    return (
        MEDICAL_RELEVANCE_KEYWORDS.some((keyword) => haystack.includes(keyword)) ||
        GENERAL_MEDICAL_PATTERNS.some((pattern) => pattern.test(haystack))
    );
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
        const websiteAction = detectWebsiteAction(message, req.user?.role);
        const emergencyDetected = isEmergencyMessage(message);

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

        if (!isMedicalRelated(message, attachments) && websiteAction) {
            const navigationReply = `I can help you move around the website. Use the button below to ${websiteAction.label.toLowerCase()}.`;

            await saveConversationPair({
                sessionId: session.id,
                userId,
                userMessage: message,
                assistantReply: navigationReply,
                medicalContext: {
                    patientContext,
                    attachments,
                    websiteAction,
                },
            });

            return res.status(200).json({
                success: true,
                message: "AI Nurse website action prepared",
                data: {
                    sessionId: session.id,
                    response: navigationReply,
                    reply: navigationReply,
                    language,
                    patientContext,
                    context: patientContext,
                    ragResponse: null,
                    websiteAction,
                },
            });
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
        const rawReply =
            aiData?.reply ||
            aiData?.message ||
            aiData?.response ||
            aiData?.answer ||
            "No response generated";
        const reply = appendSafetyDisclaimer(rawReply, emergencyDetected);
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
                websiteAction,
                emergencyDetected,
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
