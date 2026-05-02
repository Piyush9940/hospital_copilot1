import express from "express";
import { body } from "express-validator";

import {
  createPaymentOrder,
  verifyPayment,
  getPaymentById,
  getOrderById,
  markPaymentFailed,
  razorpayWebhook,
} from "../controller/payment.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import validateMiddleware from "../middleware/validate.middleware.js";

const router = express.Router();

router.post(
  "/create-order",
  authMiddleware,
  roleMiddleware("patient"),
  [body("appointmentId").notEmpty().withMessage("appointmentId is required")],
  validateMiddleware,
  createPaymentOrder
);

router.post(
  "/verify",
  authMiddleware,
  roleMiddleware("patient"),
  [
    body("appointmentId").notEmpty().withMessage("appointmentId is required"),
    body("razorpay_order_id")
      .trim()
      .notEmpty()
      .withMessage("razorpay_order_id is required"),
    body("razorpay_payment_id")
      .trim()
      .notEmpty()
      .withMessage("razorpay_payment_id is required"),
    body("razorpay_signature")
      .trim()
      .notEmpty()
      .withMessage("razorpay_signature is required"),
  ],
  validateMiddleware,
  verifyPayment
);

router.get(
  "/payment/:paymentId",
  authMiddleware,
  roleMiddleware("patient", "doctor"),
  getPaymentById
);

router.get(
  "/order/:orderId",
  authMiddleware,
  roleMiddleware("patient", "doctor"),
  getOrderById
);

router.post(
  "/mark-failed",
  authMiddleware,
  roleMiddleware("patient"),
  [body("appointmentId").notEmpty().withMessage("appointmentId is required")],
  validateMiddleware,
  markPaymentFailed
);

router.post("/webhook", razorpayWebhook);

export default router;