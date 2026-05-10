import express from "express";
import {
    triggerEmergency,
    getPendingRequests,
    getPastRequests,
    acceptEmergency,
    rejectEmergency,
    getEmergencyStatus,
    askEmergencyRag,
    summarizeEmergencyReports,
} from "../controller/emergencySystemController.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Route: /api/v2/emergency
router.post("/trigger", authMiddleware, triggerEmergency);
router.get("/pending", authMiddleware, getPendingRequests);
router.get("/past", authMiddleware, getPastRequests);
router.post("/accept", authMiddleware, acceptEmergency);
router.post("/reject", authMiddleware, rejectEmergency);
router.post("/rag", authMiddleware, askEmergencyRag);
router.post("/reports-summary", authMiddleware, summarizeEmergencyReports);
router.get("/status/:id", authMiddleware, getEmergencyStatus);

export default router;
