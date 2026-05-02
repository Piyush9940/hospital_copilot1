import crypto from "crypto";

import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  fetchRazorpayOrder,
  validateRazorpaySignaturePayload,
} from "../config/razorpay.js";

import { getAppointmentById } from "../model/appointment.model.js";
import { markAppointmentPayment } from "../services/appointment.service.js";
import { createError, validateId } from "../utils/helper.js";
import { PAYMENT_STATUS, APPOINTMENT_STATUS } from "../utils/constants.js";

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

/**
 * Validate Razorpay secret
 */
const validateRazorpaySecret = () => {
  if (
    !RAZORPAY_KEY_SECRET ||
    typeof RAZORPAY_KEY_SECRET !== "string" ||
    !RAZORPAY_KEY_SECRET.trim()
  ) {
    throw createError("RAZORPAY_KEY_SECRET is missing in environment variables", 500);
  }
};

/**
 * Normalize appointment for payment response
 */
const normalizeAppointmentPayment = (appointment) => {
  if (!appointment) return null;

  return {
    appointmentId: appointment.id || null,
    appointmentCode: appointment.appointment_code || null,
    patientId: appointment.patient_id || null,
    patientUserId: appointment.patient_user_id || null,
    doctorId: appointment.doctor_id || null,
    doctorUserId: appointment.doctor_user_id || null,
    fee: appointment.fee ?? null,
    paymentStatus: appointment.payment_status || null,
    paymentId: appointment.payment_id || null,
    appointmentStatus: appointment.appointment_status || null,
    consultationType: appointment.consultation_type || null,
    appointmentDate: appointment.appointment_date || null,
    appointmentTime: appointment.appointment_time || null,
    patientName: appointment.patient_name || null,
    doctorName: appointment.doctor_name || null,
  };
};

/**
 * Check payment ownership.
 */
const assertPatientOwnsAppointment = ({ appointment, userId, userRole }) => {
  const validUserId = validateId(userId, "User ID");
  const normalizedRole = String(userRole || "").trim().toLowerCase();

  if (normalizedRole !== "patient") {
    throw createError("Only patients can perform appointment payment actions", 403);
  }

  if (Number(appointment.patient_user_id) !== validUserId) {
    throw createError("You can only pay for your own appointment", 403);
  }
};

/**
 * Create payment order for appointment
 */
export const createAppointmentPaymentOrder = async ({
  appointmentId,
  userId,
  userRole,
}) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const appointment = getAppointmentById(validAppointmentId);

    if (!appointment) {
      throw createError("Appointment not found", 404);
    }

    assertPatientOwnsAppointment({ appointment, userId, userRole });

    if (!Number.isFinite(Number(appointment.fee)) || Number(appointment.fee) <= 0) {
      throw createError("Invalid appointment fee", 400);
    }

    if (appointment.appointment_status === APPOINTMENT_STATUS.CANCELLED) {
      throw createError("Cannot create payment order for a cancelled appointment", 400);
    }

    if (appointment.payment_status === PAYMENT_STATUS.PAID) {
      throw createError("Payment is already completed for this appointment", 400);
    }

    const order = await createRazorpayOrder({
      amount: Number(appointment.fee),
      receipt: `appointment_${appointment.id}`,
      notes: {
        appointmentId: String(appointment.id),
        appointmentCode: String(appointment.appointment_code || ""),
        patientId: String(appointment.patient_id || ""),
        doctorId: String(appointment.doctor_id || ""),
      },
    });

    return {
      success: true,
      message: "Payment order created successfully",
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        notes: order.notes || {},
        appointment: normalizeAppointmentPayment(appointment),
      },
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to create payment order",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyRazorpayPaymentSignature = (payload) => {
  try {
    validateRazorpaySecret();
    validateRazorpaySignaturePayload(payload);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET.trim())
      .update(body)
      .digest("hex");

    return expectedSignature === razorpay_signature;
  } catch (error) {
    throw createError(
      error.message || "Failed to verify payment signature",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Verify payment and update appointment
 */
export const verifyAppointmentPayment = async ({
  appointmentId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  userId,
  userRole,
}) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const appointment = getAppointmentById(validAppointmentId);

    if (!appointment) {
      throw createError("Appointment not found", 404);
    }

    assertPatientOwnsAppointment({ appointment, userId, userRole });

    if (appointment.payment_status === PAYMENT_STATUS.PAID) {
      return {
        success: true,
        message: "Payment was already verified",
        data: {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          paymentStatus: PAYMENT_STATUS.PAID,
          appointment: normalizeAppointmentPayment(appointment),
        },
      };
    }

    const isValidSignature = verifyRazorpayPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      await markAppointmentPayment(validAppointmentId, PAYMENT_STATUS.FAILED, null);
      throw createError("Invalid payment signature", 400);
    }

    const payment = await fetchRazorpayPayment(razorpay_payment_id);

    if (!payment || !payment.id) {
      await markAppointmentPayment(validAppointmentId, PAYMENT_STATUS.FAILED, null);
      throw createError("Payment details not found on Razorpay", 404);
    }

    if (payment.status !== "captured" && payment.status !== "authorized") {
      await markAppointmentPayment(validAppointmentId, PAYMENT_STATUS.FAILED, payment.id);
      throw createError(
        `Payment is not successful. Current payment status: ${payment.status}`,
        400
      );
    }

    const updated = await markAppointmentPayment(
      validAppointmentId,
      PAYMENT_STATUS.PAID,
      payment.id
    );

    return {
      success: true,
      message: "Payment verified successfully",
      data: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpayPaymentGatewayStatus: payment.status,
        paymentStatus: PAYMENT_STATUS.PAID,
        appointment: updated.data || null,
      },
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to verify appointment payment",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Fetch Razorpay payment details
 */
export const getPaymentDetails = async ({ paymentId }) => {
  try {
    if (!paymentId || typeof paymentId !== "string" || !paymentId.trim()) {
      throw createError("Payment ID is required", 400);
    }

    const payment = await fetchRazorpayPayment(paymentId.trim());

    return {
      success: true,
      message: "Payment details fetched successfully",
      data: payment,
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch payment details",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Fetch Razorpay order details
 */
export const getOrderDetails = async ({ orderId }) => {
  try {
    if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
      throw createError("Order ID is required", 400);
    }

    const order = await fetchRazorpayOrder(orderId.trim());

    return {
      success: true,
      message: "Order details fetched successfully",
      data: order,
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch order details",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Mark payment as failed manually
 */
export const failAppointmentPayment = async ({
  appointmentId,
  userId,
  userRole,
  reason = "Payment failed",
}) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const appointment = getAppointmentById(validAppointmentId);

    if (!appointment) {
      throw createError("Appointment not found", 404);
    }

    assertPatientOwnsAppointment({ appointment, userId, userRole });

    const updated = await markAppointmentPayment(
      validAppointmentId,
      PAYMENT_STATUS.FAILED,
      null
    );

    return {
      success: true,
      message: reason || "Payment marked as failed",
      data: updated.data || null,
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to mark payment as failed",
      error.statusCode || 500,
      error.details || null
    );
  }
};

export default {
  createAppointmentPaymentOrder,
  verifyRazorpayPaymentSignature,
  verifyAppointmentPayment,
  getPaymentDetails,
  getOrderDetails,
  failAppointmentPayment,
};