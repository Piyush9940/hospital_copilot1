import express from "express";
import { body } from "express-validator";

import {
  createAppointment,
  getAppointmentById,
  getAppointmentsForPatient,
  getAppointmentsForDoctor,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  updateAppointmentPaymentStatus,
  updateAppointmentVideoStatus,
  updateAppointmentFaceVerification,
  verifyVideoAccess,
  getDoctorTodayAppointments,
  sendAppointmentReminderController,
} from "../controller/appointment.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("patient"),
  [
    body("patientId").notEmpty().withMessage("patientId is required"),
    body("doctorId").notEmpty().withMessage("doctorId is required"),
    body("appointmentDate").notEmpty().withMessage("appointmentDate is required"),
    body("appointmentTime").notEmpty().withMessage("appointmentTime is required"),
    body("fee").notEmpty().withMessage("fee is required"),
  ],
  validateMiddleware,
  createAppointment
);

/**
 * Specific routes must come before "/:appointmentId"
 */
router.get(
  "/patient/:patientId",
  authMiddleware,
  roleMiddleware("patient", "doctor"),
  getAppointmentsForPatient
);

router.get(
  "/doctor/:doctorId/today",
  authMiddleware,
  roleMiddleware("doctor"),
  getDoctorTodayAppointments
);

router.get(
  "/doctor/:doctorId",
  authMiddleware,
  roleMiddleware("doctor"),
  getAppointmentsForDoctor
);

router.get(
  "/:appointmentId/video-access",
  authMiddleware,
  roleMiddleware("patient", "doctor"),
  verifyVideoAccess
);

router.post(
  "/:appointmentId/send-reminder",
  authMiddleware,
  roleMiddleware("doctor"),
  sendAppointmentReminderController
);

router.get(
  "/:appointmentId",
  authMiddleware,
  roleMiddleware("patient", "doctor"),
  getAppointmentById
);

router.put(
  "/:appointmentId/confirm",
  authMiddleware,
  roleMiddleware("doctor"),
  confirmAppointment
);

router.put(
  "/:appointmentId/cancel",
  authMiddleware,
  roleMiddleware("patient", "doctor"),
  cancelAppointment
);

router.put(
  "/:appointmentId/complete",
  authMiddleware,
  roleMiddleware("doctor"),
  completeAppointment
);

router.put(
  "/:appointmentId/payment-status",
  authMiddleware,
  roleMiddleware("patient"),
  updateAppointmentPaymentStatus
);

router.put(
  "/:appointmentId/video-status",
  authMiddleware,
  roleMiddleware("patient", "doctor"),
  updateAppointmentVideoStatus
);

router.put(
  "/:appointmentId/face-verification",
  authMiddleware,
  roleMiddleware("patient"),
  uploadSingle("image"),
  updateAppointmentFaceVerification
);

export default router;