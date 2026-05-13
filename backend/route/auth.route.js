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
            .withMessage("Password is required"),
            
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
            .toLowerCase()
            .notEmpty()
            .withMessage("Role is required")
            .isIn(["patient", "doctor", "nurse"])
            .withMessage("Role must be patient, doctor, or nurse"),
        body("faceDescriptor")
            .optional({ nullable: true, checkFalsy: true })
            .isArray({ min: 128, max: 128 })
            .withMessage("faceDescriptor must contain 128 numeric values"),
    ],
    validateMiddleware,
    login
);

router.post(
    "/face-login",
    [
        body("role")
            .trim()
            .toLowerCase()
            .notEmpty()
            .withMessage("Role is required")
            .isIn(["patient", "doctor", "nurse"])
            .withMessage("Role must be patient, doctor, or nurse"),
        body("faceDescriptor")
            .isArray({ min: 128, max: 128 })
            .withMessage("Face descriptor must contain 128 numeric values")
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
            .withMessage("New password is required"),
            
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

