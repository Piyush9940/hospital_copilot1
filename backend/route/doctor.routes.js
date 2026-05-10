import express from "express";
import { body } from "express-validator";

import {
    createProfile,
    getMyProfile,
    getProfileByUserId,
    getProfileById,
    getAllProfiles,
    updateRating,
    incrementPatientCount,
    getTodayAppointments,
    getAppointmentHistory,
    getDashboardSummary,
} from "../controller/doctor.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
    "/profile",
    authMiddleware,
    roleMiddleware("doctor"),
    [
        body("userId").notEmpty().withMessage("userId is required"),
        body("specialization").trim().notEmpty().withMessage("specialization is required"),
        body("experience").notEmpty().withMessage("experience is required"),
        body("qualification").trim().notEmpty().withMessage("qualification is required"),
        body("appointmentFee").notEmpty().withMessage("appointmentFee is required"),
        body("hospitalName").trim().notEmpty().withMessage("hospitalName is required"),
    ],
    validateMiddleware,
    createProfile
);

router.get("/me", authMiddleware, roleMiddleware("doctor"), getMyProfile);
router.get("/", authMiddleware, getAllProfiles);
router.get("/list", authMiddleware, getAllProfiles);
router.get("/user/:userId", authMiddleware, getProfileByUserId);
router.get("/:doctorId", authMiddleware, getProfileById);

router.put(
    "/:doctorId/rating",
    authMiddleware,
    [
        body("rating").notEmpty().withMessage("rating is required"),
    ],
    validateMiddleware,
    updateRating
);

router.put(
    "/:doctorId/increment-patient-count",
    authMiddleware,
    incrementPatientCount
);

router.get(
    "/:doctorId/today-appointments",
    authMiddleware,
    getTodayAppointments
);

router.get(
    "/:doctorId/appointments",
    authMiddleware,
    getAppointmentHistory
);

router.get(
    "/:doctorId/dashboard-summary",
    authMiddleware,
    getDashboardSummary
);

export default router;
