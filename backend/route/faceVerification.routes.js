import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { uploadFields } from "../middleware/upload.middleware.js";

import {
    healthCheck,
    compareFaceWithVideo,
    verifyAppointmentFaceWithVideoController,
} from "../controller/faceVerification.controller.js";

const router = express.Router();

router.get("/health", authMiddleware, healthCheck);

router.post(
    "/compare-video",
    authMiddleware,
    uploadFields([
        { name: "referenceImage", maxCount: 1 },
        { name: "video", maxCount: 1 },
    ]),
    compareFaceWithVideo
);

router.post(
    "/appointment-video/:appointmentId",
    authMiddleware,
    uploadFields([
        { name: "referenceImage", maxCount: 1 },
        { name: "video", maxCount: 1 },
    ]),
    verifyAppointmentFaceWithVideoController
);

export default router;