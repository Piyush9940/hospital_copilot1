import express from "express";
import { body, param, query } from "express-validator";

import {
    healthCheck,
    chat,
    getSession,
    getSessionMessages,
    getPatientAwareContext,
    getCompactContext,
    translate,
    textToSpeech,
    speechToText,
} from "../controller/aiNurse.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/health", healthCheck);

router.post(
    "/chat",
    authMiddleware,
    [
        body("message").trim().notEmpty().withMessage("message is required"),
        body("language").optional().isString().withMessage("language must be a string"),
    ],
    validateMiddleware,
    chat
);

router.get("/session", authMiddleware, getSession);

router.get(
    "/session/:sessionId/messages",
    authMiddleware,
    [
        param("sessionId")
            .isInt({ min: 1 })
            .withMessage("valid sessionId is required"),
        query("limit")
            .optional()
            .isInt({ min: 1, max: 500 })
            .withMessage("limit must be between 1 and 500"),
    ],
    validateMiddleware,
    getSessionMessages
);

router.get("/context", authMiddleware, getPatientAwareContext);
router.get("/context/compact", authMiddleware, getCompactContext);

router.post(
    "/translate",
    authMiddleware,
    [
        body("text").trim().notEmpty().withMessage("text is required"),
        body("sourceLanguage")
            .optional()
            .isString()
            .withMessage("sourceLanguage must be a string"),
        body("targetLanguage")
            .optional()
            .isString()
            .withMessage("targetLanguage must be a string"),
    ],
    validateMiddleware,
    translate
);

router.post(
    "/tts",
    authMiddleware,
    [
        body("text").trim().notEmpty().withMessage("text is required"),
        body("language").optional().isString().withMessage("language must be a string"),
        body("voice").optional().isString().withMessage("voice must be a string"),
    ],
    validateMiddleware,
    textToSpeech
);

router.post("/stt", authMiddleware, uploadSingle("audio"), speechToText);

export default router;