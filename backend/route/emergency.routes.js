import express from "express";
import { body } from "express-validator";

import {
    createEmergencyAlert,
    triggerMyEmergencyAlert,
    triggerEmergencyWithNotification,
    getPendingAlerts,
    getAlertsByStatus,
    getAlertsByPatientId,
    getMyEmergencyAlerts,
    acknowledgeAlert,
    resolveAlert,
    getAlertStats,
} from "../controller/emergency.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    [
        body("patientId")
            .notEmpty()
            .withMessage("patientId is required"),
        body("message")
            .trim()
            .notEmpty()
            .withMessage("message is required"),
    ],
    validateMiddleware,
    createEmergencyAlert
);

router.post("/my", authMiddleware, triggerMyEmergencyAlert);
router.post("/my/notify", authMiddleware, triggerEmergencyWithNotification);

router.get("/pending", authMiddleware, getPendingAlerts);
router.get("/status/:status", authMiddleware, getAlertsByStatus);
router.get("/patient/:patientId", authMiddleware, getAlertsByPatientId);
router.get("/my", authMiddleware, getMyEmergencyAlerts);

router.put(
    "/acknowledge/:alertId",
    authMiddleware,
    roleMiddleware("doctor", "nurse", "admin"),
    acknowledgeAlert
);

router.put(
    "/resolve/:alertId",
    authMiddleware,
    roleMiddleware("doctor", "nurse", "admin"),
    resolveAlert
);

router.get(
    "/stats",
    authMiddleware,
    roleMiddleware("doctor", "nurse", "admin"),
    getAlertStats
);

export default router;