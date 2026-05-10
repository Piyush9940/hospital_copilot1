import express from "express";
import { body } from "express-validator";

import {
    createReport,
    getReportById,
    getReportsByPatientId,
    getMyReports,
    getAllReports,
    updateReport,
    deleteReport,
    verifyOwnershipByPatientId,
    verifyOwnershipByUser,
    generateReportPDF,
} from "../controller/report.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    uploadSingle("file"),
    createReport
);

router.post("/generate", authMiddleware, generateReportPDF);

router.get("/patient/:patientId", authMiddleware, getReportsByPatientId);
router.get(
    "/verify/patient/:patientId/:reportId",
    authMiddleware,
    verifyOwnershipByPatientId
);
router.get(
    "/verify/me/:reportId",
    authMiddleware,
    verifyOwnershipByUser
);
router.get("/my", authMiddleware, getMyReports);
router.get("/", authMiddleware, getAllReports);
router.get("/:reportId", authMiddleware, getReportById);

router.put(
    "/:reportId",
    authMiddleware,
    uploadSingle("pdf"),
    updateReport
);

router.delete("/:reportId", authMiddleware, deleteReport);

export default router;
