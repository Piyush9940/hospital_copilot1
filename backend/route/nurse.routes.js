import express from "express";
import { body } from "express-validator";

import {
    createProfile,
    getMyProfile,
    getProfileByUserId,
    getProfileById,
    getAllProfiles,
    getProfilesByDepartment,
    createNote,
    createNoteByPatientUserId,
    getNotesByPatientId,
    getMyPatientNotes,
    getCreatedNotesByNurseId,
    getUrgentNotes,
} from "../controller/nurse.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
    "/profile",
    authMiddleware,
    [
        body("userId").notEmpty().withMessage("userId is required"),
        body("department").trim().notEmpty().withMessage("department is required"),
        body("shift").trim().notEmpty().withMessage("shift is required"),
        body("qualification").trim().notEmpty().withMessage("qualification is required"),
    ],
    validateMiddleware,
    createProfile
);

router.get("/me", authMiddleware, roleMiddleware("nurse"), getMyProfile);
router.get("/", authMiddleware, getAllProfiles);
router.get("/user/:userId", authMiddleware, getProfileByUserId);
router.get("/:nurseId", authMiddleware, getProfileById);
router.get("/department/:department", authMiddleware, getProfilesByDepartment);

router.post(
    "/note",
    authMiddleware,
    [
        body("patientId").notEmpty().withMessage("patientId is required"),
        body("nurseId").notEmpty().withMessage("nurseId is required"),
        body("note").trim().notEmpty().withMessage("note is required"),
    ],
    validateMiddleware,
    createNote
);

router.post(
    "/note/by-user",
    authMiddleware,
    [
        body("patientUserId").notEmpty().withMessage("patientUserId is required"),
        body("nurseId").notEmpty().withMessage("nurseId is required"),
        body("note").trim().notEmpty().withMessage("note is required"),
    ],
    validateMiddleware,
    createNoteByPatientUserId
);

router.get("/notes/patient/:patientId", authMiddleware, getNotesByPatientId);
router.get("/notes/my-patient", authMiddleware, getMyPatientNotes);
router.get("/notes/nurse/:nurseId", authMiddleware, getCreatedNotesByNurseId);
router.get("/notes/urgent/all", authMiddleware, getUrgentNotes);

export default router;