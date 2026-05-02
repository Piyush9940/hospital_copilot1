import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

import {
    getNurseDashboard,
    getNurseDashboardStats,
    getNurseDashboardCards,
} from "../controller/nurseDashboard.controller.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("nurse"),
    getNurseDashboard
);

router.get(
    "/stats",
    authMiddleware,
    roleMiddleware("nurse"),
    getNurseDashboardStats
);

router.get(
    "/cards",
    authMiddleware,
    roleMiddleware("nurse"),
    getNurseDashboardCards
);

export default router;