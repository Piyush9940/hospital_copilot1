import express from "express";
import { body } from "express-validator";

import {
    createProfile,
    getMyProfile,
    getProfileByUserId,
    getAllPatientProfiles,
    getMyVitals,
    getMyLatestVital,
    getMyVitalSummary,
    checkMyCriticalVitals,
    getMyReports,
    getMyEmergencyAlerts,
    triggerEmergency,
    getMyNurseNotes,
    getMyPatientContext,
    getMyCompactPatientContext,
} from "../controller/patient.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
    "/profile",
    authMiddleware,
    [
        body("userId").notEmpty().withMessage("userId is required"),
        body("age").notEmpty().withMessage("age is required"),
        body("gender").trim().notEmpty().withMessage("gender is required"),
    ],
    validateMiddleware,
    createProfile
);

router.get("/me", authMiddleware, getMyProfile);
router.get("/user/:userId", authMiddleware, getProfileByUserId);
router.get("/", authMiddleware, getAllPatientProfiles);

router.get("/me/vitals", authMiddleware, getMyVitals);
router.get("/me/vitals/latest", authMiddleware, getMyLatestVital);
router.get("/me/vitals/summary", authMiddleware, getMyVitalSummary);
router.get("/me/vitals/check-critical", authMiddleware, checkMyCriticalVitals);

router.get("/me/reports", authMiddleware, getMyReports);

router.get("/me/emergency-alerts", authMiddleware, getMyEmergencyAlerts);
router.post("/me/emergency-trigger", authMiddleware, triggerEmergency);

router.get("/me/nurse-notes", authMiddleware, getMyNurseNotes);

router.get("/me/context", authMiddleware, getMyPatientContext);
router.get("/me/context/compact", authMiddleware, getMyCompactPatientContext);

export default router;