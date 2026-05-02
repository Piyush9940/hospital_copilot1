import express from "express";
import { body, query } from "express-validator";

import {
    requestChatPermission,
    approvePermission,
    rejectPermission,
    checkPermissionAccess,
    getPermissionsByAppointment,
} from "../controller/chatPermission.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
    "/request",
    authMiddleware,
    [
        body("appointmentId")
            .notEmpty()
            .withMessage("appointmentId is required"),

        body("patientId")
            .notEmpty()
            .withMessage("patientId is required"),

        body("doctorId")
            .notEmpty()
            .withMessage("doctorId is required"),
    ],
    validateMiddleware,
    requestChatPermission
);

router.put(
    "/approve/:permissionId",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    approvePermission
);

router.put(
    "/reject/:permissionId",
    authMiddleware,
    roleMiddleware("doctor", "admin"),
    rejectPermission
);

router.get(
    "/check-access",
    authMiddleware,
    [
        query("appointmentId")
            .notEmpty()
            .withMessage("appointmentId is required"),

        query("patientId")
            .notEmpty()
            .withMessage("patientId is required"),

        query("doctorId")
            .notEmpty()
            .withMessage("doctorId is required"),
    ],
    validateMiddleware,
    checkPermissionAccess
);

router.get(
    "/appointment/:appointmentId",
    authMiddleware,
    getPermissionsByAppointment
);

export default router;