import express from "express";
import { body } from "express-validator";

import {
    getAppointmentsForDoctor,
    getTodayAppointmentsForDoctor,
    getAppointmentById,
    confirmAppointment,
    completeAppointment,
    cancelAppointment,
    updateVideoStatus,
    updateFaceVerification,
    verifyVideoAccess,
    sendReminder,
} from "../controller/doctorAppointment.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get(
    "/doctor/:doctorId",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    getAppointmentsForDoctor
);

router.get(
    "/doctor/:doctorId/today",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    getTodayAppointmentsForDoctor
);

router.get(
    "/:appointmentId",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    getAppointmentById
);

router.put(
    "/:appointmentId/confirm",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    confirmAppointment
);

router.put(
    "/:appointmentId/complete",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    completeAppointment
);

router.put(
    "/:appointmentId/cancel",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    cancelAppointment
);

router.put(
    "/:appointmentId/video-status",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    [
        body("status")
            .trim()
            .notEmpty()
            .withMessage("status is required"),
    ],
    validateMiddleware,
    updateVideoStatus
);

router.put(
    "/:appointmentId/face-verification",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    uploadSingle("image"),
    [
        body("status")
            .trim()
            .notEmpty()
            .withMessage("status is required"),
    ],
    validateMiddleware,
    updateFaceVerification
);

router.get(
    "/:appointmentId/video-access",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    verifyVideoAccess
);

router.post(
    "/:appointmentId/send-reminder",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    [
        body("phoneNumber")
            .trim()
            .notEmpty()
            .withMessage("phoneNumber is required"),
    ],
    validateMiddleware,
    sendReminder
);

export default router;