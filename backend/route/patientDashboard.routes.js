import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

import {
    getPatientDashboard,
    getPatientDashboardStats,
    getPatientDashboardCards,
} from "../controller/patientDashboard.controller.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("patient"),
    getPatientDashboard
);

router.get(
    "/stats",
    authMiddleware,
    roleMiddleware("patient"),
    getPatientDashboardStats
);

router.get(
    "/cards",
    authMiddleware,
    roleMiddleware("patient"),
    getPatientDashboardCards
);

export default router;