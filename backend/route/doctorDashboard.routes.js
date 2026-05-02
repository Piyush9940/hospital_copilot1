import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

import {
    getDoctorDashboard,
    getDoctorDashboardStats,
    getDoctorDashboardCards,
} from "../controller/doctorDashboard.controller.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("doctor"),
    getDoctorDashboard
);

router.get(
    "/stats",
    authMiddleware,
    roleMiddleware("doctor"),
    getDoctorDashboardStats
);

router.get(
    "/cards",
    authMiddleware,
    roleMiddleware("doctor"),
    getDoctorDashboardCards
);

export default router;