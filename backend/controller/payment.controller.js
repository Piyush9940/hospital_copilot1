import {
  createAppointmentPaymentOrder,
  verifyAppointmentPayment,
  getPaymentDetails,
  getOrderDetails,
  failAppointmentPayment,
} from "../services/payment.service.js";

import { createError, validateId, sanitize } from "../utils/helper.js";

/**
 * Create Razorpay order for appointment
 */
export const createPaymentOrder = async (req, res, next) => {
  try {
    const appointmentId = validateId(req.body?.appointmentId, "Appointment ID");

    const result = await createAppointmentPaymentOrder({
      appointmentId,
      userId: req.user?.id,
      userRole: req.user?.role,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(
      createError(
        error.message || "Failed to create payment order",
        error.statusCode || 500,
        error.details || null
      )
    );
  }
};

/**
 * Verify Razorpay payment and update appointment payment status
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const appointmentId = validateId(req.body?.appointmentId, "Appointment ID");

    const razorpay_order_id =
      typeof req.body?.razorpay_order_id === "string"
        ? req.body.razorpay_order_id.trim()
        : "";

    const razorpay_payment_id =
      typeof req.body?.razorpay_payment_id === "string"
        ? req.body.razorpay_payment_id.trim()
        : "";

    const razorpay_signature =
      typeof req.body?.razorpay_signature === "string"
        ? req.body.razorpay_signature.trim()
        : "";

    if (!razorpay_order_id) {
      throw createError("razorpay_order_id is required", 400);
    }

    if (!razorpay_payment_id) {
      throw createError("razorpay_payment_id is required", 400);
    }

    if (!razorpay_signature) {
      throw createError("razorpay_signature is required", 400);
    }

    const result = await verifyAppointmentPayment({
      appointmentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId: req.user?.id,
      userRole: req.user?.role,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(
      createError(
        error.message || "Failed to verify payment",
        error.statusCode || 500,
        error.details || null
      )
    );
  }
};

/**
 * Get Razorpay payment details by payment ID
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const paymentId =
      typeof req.params?.paymentId === "string"
        ? req.params.paymentId.trim()
        : "";

    if (!paymentId) {
      throw createError("Payment ID is required", 400);
    }

    const result = await getPaymentDetails({ paymentId });

    return res.status(200).json(result);
  } catch (error) {
    return next(
      createError(
        error.message || "Failed to fetch payment details",
        error.statusCode || 500,
        error.details || null
      )
    );
  }
};

/**
 * Get Razorpay order details by order ID
 */
export const getOrderById = async (req, res, next) => {
  try {
    const orderId =
      typeof req.params?.orderId === "string" ? req.params.orderId.trim() : "";

    if (!orderId) {
      throw createError("Order ID is required", 400);
    }

    const result = await getOrderDetails({ orderId });

    return res.status(200).json(result);
  } catch (error) {
    return next(
      createError(
        error.message || "Failed to fetch order details",
        error.statusCode || 500,
        error.details || null
      )
    );
  }
};

/**
 * Mark appointment payment as failed manually
 */
export const markPaymentFailed = async (req, res, next) => {
  try {
    const appointmentId = validateId(req.body?.appointmentId, "Appointment ID");

    const reason =
      typeof req.body?.reason === "string" && req.body.reason.trim()
        ? sanitize(req.body.reason)
        : "Payment failed";

    const result = await failAppointmentPayment({
      appointmentId,
      userId: req.user?.id,
      userRole: req.user?.role,
      reason,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(
      createError(
        error.message || "Failed to mark payment as failed",
        error.statusCode || 500,
        error.details || null
      )
    );
  }
};

/**
 * Razorpay webhook handler
 * Basic placeholder. For production, verify webhook signature with raw body.
 */
export const razorpayWebhook = async (req, res, next) => {
  try {
    const event = req.body?.event || null;
    const payload = req.body?.payload || null;

    return res.status(200).json({
      success: true,
      message: "Webhook received successfully",
      data: {
        event,
        payload,
      },
    });
  } catch (error) {
    return next(
      createError(
        error.message || "Failed to process Razorpay webhook",
        error.statusCode || 500,
        error.details || null
      )
    );
  }
};