import express from "express";
import { body } from "express-validator";

import {
    addVital,
    getVitalsByPatientId,
    getLatestVitalByPatientId,
    getMyVitals,
    getMyLatestVital,
    getMyVitalSummary,
    checkMyCriticalVitals,
} from "../controller/vital.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    [
        body("patientId")
            .notEmpty()
            .withMessage("patientId is required"),

        body("heartRate")
            .notEmpty()
            .withMessage("heartRate is required"),

        body("spo2")
            .notEmpty()
            .withMessage("spo2 is required"),

        body("bp")
            .trim()
            .notEmpty()
            .withMessage("bp is required"),

        body("temperature")
            .notEmpty()
            .withMessage("temperature is required"),
    ],
    validateMiddleware,
    addVital
);

router.get("/patient/:patientId", authMiddleware, getVitalsByPatientId);
router.get("/patient/:patientId/latest", authMiddleware, getLatestVitalByPatientId);

router.get("/my", authMiddleware, getMyVitals);
router.get("/my/latest", authMiddleware, getMyLatestVital);
router.get("/my/summary", authMiddleware, getMyVitalSummary);
router.get("/my/check-critical", authMiddleware, checkMyCriticalVitals);

export default router;