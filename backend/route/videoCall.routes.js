import express from "express";
import { body, param } from "express-validator";

import {
    postSignal,
    getSignal,
    endCall,
    getCallStatus,
    resetCall,
} from "../controller/videoCall.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
    "/signal",
    authMiddleware,
    [
        body("appointmentId")
            .isInt({ min: 1 })
            .withMessage("valid appointmentId is required"),
        body("signal")
            .isObject()
            .withMessage("signal must be a valid object"),
    ],
    validateMiddleware,
    postSignal
);

router.get(
    "/signal/:appointmentId",
    authMiddleware,
    [param("appointmentId").isInt({ min: 1 }).withMessage("valid appointmentId is required")],
    validateMiddleware,
    getSignal
);

router.get(
    "/status/:appointmentId",
    authMiddleware,
    [param("appointmentId").isInt({ min: 1 }).withMessage("valid appointmentId is required")],
    validateMiddleware,
    getCallStatus
);

router.post(
    "/end/:appointmentId",
    authMiddleware,
    [param("appointmentId").isInt({ min: 1 }).withMessage("valid appointmentId is required")],
    validateMiddleware,
    endCall
);

router.post(
    "/reset/:appointmentId",
    authMiddleware,
    [param("appointmentId").isInt({ min: 1 }).withMessage("valid appointmentId is required")],
    validateMiddleware,
    resetCall
);

export default router;