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
    [
        body("patientId")
            .notEmpty()
            .withMessage("patientId is required"),

        body("diagnosis")
            .trim()
            .notEmpty()
            .withMessage("diagnosis is required"),

        body("summary")
            .trim()
            .notEmpty()
            .withMessage("summary is required"),
    ],
    validateMiddleware,
    uploadSingle("pdf"),
    createReport
);

router.post("/generate", authMiddleware, generateReportPDF);

router.get("/my", authMiddleware, getMyReports);
router.get("/", authMiddleware, getAllReports);
router.get("/:reportId", authMiddleware, getReportById);
router.get("/patient/:patientId", authMiddleware, getReportsByPatientId);

router.put(
    "/:reportId",
    authMiddleware,
    uploadSingle("pdf"),
    updateReport
);

router.delete("/:reportId", authMiddleware, deleteReport);

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

export default router;