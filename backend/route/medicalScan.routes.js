import express from "express";

import { analyzeMedicalScan } from "../controller/medicalScan.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post(
    "/analyze",
    authMiddleware,
    uploadSingle("file"),
    analyzeMedicalScan
);

export default router;
