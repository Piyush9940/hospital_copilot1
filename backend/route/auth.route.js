import express from "express";
import { body } from "express-validator";

import {
    register,
    login,
    getMe,
    updateMe,
    updateMyPassword,
    deleteMyProfile,
    faceLogin
} from "../controller/auth.controller.js";

import validateMiddleware from "../middleware/validate.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
    "/register",
    [
        body("name").trim().notEmpty().withMessage("Name is required"),
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email"),
        body("password")
            .trim()
            .notEmpty()
            .withMessage("Password is required")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters long"),
        body("role")
            .trim()
            .toLowerCase()
            .notEmpty()
            .withMessage("Role is required")
            .isIn(["patient", "doctor", "nurse"])
            .withMessage("Role must be patient, doctor, or nurse"),
        body("phone").optional({ nullable: true, checkFalsy: true }).isString(),
        body("profileImage").optional({ nullable: true, checkFalsy: true }).isString(),
        body("faceDescriptor")
            .optional({ nullable: true, checkFalsy: true })
            .custom((value) => {
                if (Array.isArray(value)) return true;
                if (value && typeof value === "object") return true;
                throw new Error("faceDescriptor must be an array or object");
            }),
    ],
    validateMiddleware,
    register
);

router.post(
    "/login",
    [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email"),
        body("password").trim().notEmpty().withMessage("Password is required"),
        body("role")
            .trim()
            .notEmpty()
            .withMessage("Role is required")
            .isIn(["patient", "doctor", "nurse"])
            .withMessage("Role must be patient, doctor, or nurse"),
    ],
    validateMiddleware,
    login
);

router.post(
    "/face-login",
    [
        body("role")
            .trim()
            .notEmpty()
            .withMessage("Role is required")
            .isIn(["patient", "doctor", "nurse"])
            .withMessage("Role must be patient, doctor, or nurse"),
        body("faceDescriptor").isArray().withMessage("Face descriptor is required")
    ],
    validateMiddleware,
    faceLogin
);

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

router.put(
    "/update-password",
    authMiddleware,
    [
        body("currentPassword").trim().notEmpty().withMessage("Current password is required"),
        body("newPassword")
            .trim()
            .notEmpty()
            .withMessage("New password is required")
            .isLength({ min: 6 })
            .withMessage("New password must be at least 6 characters long"),
        body("confirmPassword").trim().notEmpty().withMessage("Confirm password is required"),
    ],
    validateMiddleware,
    updateMyPassword
);

router.delete(
    "/delete-profile",
    authMiddleware,
    [body("password").trim().notEmpty().withMessage("Password is required")],
    validateMiddleware,
    deleteMyProfile
);

export default router;
