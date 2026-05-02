import express from "express";
import { body } from "express-validator";

import {
    createNote,
    createNoteByPatientUserId,
    getNotesByPatientId,
    getMyPatientNotes,
    getNotesByNurseId,
    getUrgentNotes,
} from "../controller/nurseNote.controller.js";

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
        body("nurseId")
            .notEmpty()
            .withMessage("nurseId is required"),
        body("note")
            .trim()
            .notEmpty()
            .withMessage("note is required"),
    ],
    validateMiddleware,
    createNote
);

router.post(
    "/by-user",
    authMiddleware,
    [
        body("patientUserId")
            .notEmpty()
            .withMessage("patientUserId is required"),
        body("nurseId")
            .notEmpty()
            .withMessage("nurseId is required"),
        body("note")
            .trim()
            .notEmpty()
            .withMessage("note is required"),
    ],
    validateMiddleware,
    createNoteByPatientUserId
);

router.get(
    "/patient/:patientId",
    authMiddleware,
    getNotesByPatientId
);

router.get(
    "/my-patient-notes",
    authMiddleware,
    getMyPatientNotes
);

router.get(
    "/nurse/:nurseId",
    authMiddleware,
    getNotesByNurseId
);

router.get(
    "/urgent",
    authMiddleware,
    roleMiddleware("nurse", "doctor", "admin"),
    getUrgentNotes
);

export default router;