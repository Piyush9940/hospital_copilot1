import {
  createAppointment,
  getAppointmentById,
  getAppointmentsByPatientId,
  getAppointmentsByDoctorId,
  updateAppointmentStatus,
  updatePaymentStatus,
  updateVideoCallStatus,
  updateFaceVerification,
  cancelAppointment,
  getTodaysAppointments,
} from "../model/appointment.model.js";

import { incrementPatientCount } from "../model/doctor.model.js";
import { createError, validateId, sanitize } from "../utils/helper.js";

import {
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  VIDEO_CALL_STATUS,
  FACE_VERIFICATION_STATUS,
  APPOINTMENT_TYPE,
} from "../utils/constants.js";

import {
  sendAppointmentConfirmationEmail,
  sendAppointmentCancellationEmail,
} from "../config/mailer.js";

import { sendAppointmentReminderSms } from "../config/twilio.js";

/**
 * Validate consultation type
 */
const validateConsultationType = (value) => {
  const allowed = Object.values(APPOINTMENT_TYPE);
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!allowed.includes(normalized)) {
    throw createError(`Invalid consultation type. Allowed values: ${allowed.join(", ")}`, 400);
  }

  return normalized;
};

/**
 * Validate payment status
 */
const validatePaymentStatus = (value) => {
  const allowed = Object.values(PAYMENT_STATUS);
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!allowed.includes(normalized)) {
    throw createError(`Invalid payment status. Allowed values: ${allowed.join(", ")}`, 400);
  }

  return normalized;
};

/**
 * Validate video call status
 */
const validateVideoStatus = (value) => {
  const allowed = Object.values(VIDEO_CALL_STATUS);
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!allowed.includes(normalized)) {
    throw createError(`Invalid video call status. Allowed values: ${allowed.join(", ")}`, 400);
  }

  return normalized;
};

/**
 * Validate face verification status
 */
const validateFaceStatus = (value) => {
  const allowed = Object.values(FACE_VERIFICATION_STATUS);
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!allowed.includes(normalized)) {
    throw createError(`Invalid face verification status. Allowed values: ${allowed.join(", ")}`, 400);
  }

  return normalized;
};

/**
 * Normalize appointment response
 */
const normalizeAppointment = (appointment) => {
  if (!appointment) return null;

  return {
    id: appointment.id,
    appointmentCode: appointment.appointment_code || null,
    patientId: appointment.patient_id || null,
    doctorId: appointment.doctor_id || null,
    nurseId: appointment.nurse_id || null,
    patientUserId: appointment.patient_user_id || null,
    doctorUserId: appointment.doctor_user_id || null,
    patientName: appointment.patient_name || null,
    doctorName: appointment.doctor_name || null,
    nurseName: appointment.nurse_name || null,
    patientEmail: appointment.patient_email || null,
    doctorEmail: appointment.doctor_email || null,
    symptoms: appointment.symptoms || null,
    uploadedImage: appointment.uploaded_image || null,
    uploadedDocuments: appointment.uploaded_documents || null,
    appointmentDate: appointment.appointment_date || null,
    appointmentTime: appointment.appointment_time || null,
    consultationType: appointment.consultation_type || null,
    fee: appointment.fee ?? null,
    paymentStatus: appointment.payment_status || null,
    appointmentStatus: appointment.appointment_status || null,
    paymentId: appointment.payment_id || null,
    videoCallStatus: appointment.video_call_status || null,
    videoCallRoomId: appointment.video_call_room_id || null,
    faceVerificationStatus: appointment.face_verification_status || null,
    faceVerificationImage: appointment.face_verification_image || null,
    cancellationReason: appointment.cancellation_reason || null,
    cancelledBy: appointment.cancelled_by || null,
    createdAt: appointment.created_at || null,
    updatedAt: appointment.updated_at || null,
  };
};

/**
 * Prevent duplicate active appointment for same doctor/date/time.
 */
const hasDuplicateDoctorSlot = (doctorId, appointmentDate, appointmentTime) => {
  const appointments = getAppointmentsByDoctorId(doctorId) || [];

  return appointments.some((appointment) => {
    return (
      String(appointment.appointment_date) === String(appointmentDate) &&
      String(appointment.appointment_time) === String(appointmentTime) &&
      ["requested", "confirmed"].includes(appointment.appointment_status)
    );
  });
};

/**
 * Create appointment request
 */
export const createAppointmentRequest = (data) => {
  try {
    if (!data || typeof data !== "object") {
      throw createError("Appointment data is required", 400);
    }

    const payload = {
      patientId: validateId(data.patientId, "Patient ID"),
      doctorId: validateId(data.doctorId, "Doctor ID"),
      nurseId: data.nurseId ? validateId(data.nurseId, "Nurse ID") : null,
      symptoms: sanitize(data.symptoms || ""),
      uploadedImage:
        typeof data.uploadedImage === "string" && data.uploadedImage.trim()
          ? data.uploadedImage.trim()
          : null,
      uploadedDocuments: data.uploadedDocuments || null,
      appointmentDate:
        typeof data.appointmentDate === "string" && data.appointmentDate.trim()
          ? data.appointmentDate.trim()
          : null,
      appointmentTime:
        typeof data.appointmentTime === "string" && data.appointmentTime.trim()
          ? data.appointmentTime.trim()
          : null,
      consultationType: validateConsultationType(
        data.consultationType || APPOINTMENT_TYPE.VIDEO
      ),
      fee: Number(data.fee),
      paymentStatus: PAYMENT_STATUS.PENDING,
    };

    if (!payload.appointmentDate) {
      throw createError("appointmentDate is required", 400);
    }

    if (!payload.appointmentTime) {
      throw createError("appointmentTime is required", 400);
    }

    if (!Number.isFinite(payload.fee) || payload.fee < 0) {
      throw createError("Valid fee is required", 400);
    }

    if (
      hasDuplicateDoctorSlot(
        payload.doctorId,
        payload.appointmentDate,
        payload.appointmentTime
      )
    ) {
      throw createError(
        "This doctor already has an active appointment at the selected date and time",
        409
      );
    }

    const result = createAppointment(payload);

    if (!result || !result.lastInsertRowid) {
      throw createError("Failed to create appointment", 500);
    }

    const appointment = getAppointmentById(result.lastInsertRowid);

    return {
      success: true,
      message: "Appointment request created successfully",
      data: normalizeAppointment(appointment),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to create appointment request",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get appointment details
 */
export const getAppointmentDetails = (appointmentId) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const appointment = getAppointmentById(validAppointmentId);

    if (!appointment) {
      throw createError("Appointment not found", 404);
    }

    return {
      success: true,
      message: "Appointment fetched successfully",
      data: normalizeAppointment(appointment),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch appointment details",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get patient appointments
 */
export const getPatientAppointments = (patientId) => {
  try {
    const validPatientId = validateId(patientId, "Patient ID");
    const appointments = getAppointmentsByPatientId(validPatientId) || [];

    return {
      success: true,
      message: "Patient appointments fetched successfully",
      data: appointments.map(normalizeAppointment),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch patient appointments",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get doctor appointments
 */
export const getDoctorAppointments = (doctorId) => {
  try {
    const validDoctorId = validateId(doctorId, "Doctor ID");
    const appointments = getAppointmentsByDoctorId(validDoctorId) || [];

    return {
      success: true,
      message: "Doctor appointments fetched successfully",
      data: appointments.map(normalizeAppointment),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch doctor appointments",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Confirm appointment
 */
export const confirmAppointmentRequest = async (appointmentId) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const existing = getAppointmentById(validAppointmentId);

    if (!existing) {
      throw createError("Appointment not found", 404);
    }

    if (existing.appointment_status === APPOINTMENT_STATUS.CANCELLED) {
      throw createError("Cancelled appointment cannot be confirmed", 400);
    }

    updateAppointmentStatus(validAppointmentId, APPOINTMENT_STATUS.CONFIRMED);
    incrementPatientCount(existing.doctor_id);

    const updated = getAppointmentById(validAppointmentId);

    try {
      if (updated?.patient_email) {
        await sendAppointmentConfirmationEmail({
          to: updated.patient_email,
          patientName: updated.patient_name || "Patient",
          doctorName: updated.doctor_name || "Doctor",
          appointmentCode: updated.appointment_code,
          appointmentDate: updated.appointment_date,
          appointmentTime: updated.appointment_time,
          consultationType: updated.consultation_type || "video",
        });
      }
    } catch {
      // Notification errors should not block appointment confirmation.
    }

    return {
      success: true,
      message: "Appointment confirmed successfully",
      data: normalizeAppointment(updated),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to confirm appointment",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Update appointment payment
 */
export const markAppointmentPayment = (appointmentId, paymentStatus, paymentId = null) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const normalizedPaymentStatus = validatePaymentStatus(paymentStatus);

    const existing = getAppointmentById(validAppointmentId);

    if (!existing) {
      throw createError("Appointment not found", 404);
    }

    updatePaymentStatus(validAppointmentId, normalizedPaymentStatus, paymentId || null);

    const updated = getAppointmentById(validAppointmentId);

    return {
      success: true,
      message: "Appointment payment updated successfully",
      data: normalizeAppointment(updated),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to update appointment payment",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Cancel appointment
 */
export const cancelAppointmentRequest = async (
  appointmentId,
  reason,
  cancelledBy = "system"
) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");

    const normalizedReason =
      typeof reason === "string" && reason.trim()
        ? reason.trim()
        : "Cancelled by user";

    const normalizedCancelledBy =
      typeof cancelledBy === "string" && cancelledBy.trim()
        ? cancelledBy.trim()
        : "system";

    const existing = getAppointmentById(validAppointmentId);

    if (!existing) {
      throw createError("Appointment not found", 404);
    }

    if (existing.appointment_status === APPOINTMENT_STATUS.CANCELLED) {
      throw createError("Appointment is already cancelled", 400);
    }

    cancelAppointment(validAppointmentId, normalizedReason, normalizedCancelledBy);

    const updated = getAppointmentById(validAppointmentId);

    try {
      if (updated?.patient_email) {
        await sendAppointmentCancellationEmail({
          to: updated.patient_email,
          patientName: updated.patient_name || "Patient",
          appointmentCode: updated.appointment_code,
          cancellationReason: normalizedReason,
        });
      }
    } catch {
      // Notification errors should not block cancellation.
    }

    return {
      success: true,
      message: "Appointment cancelled successfully",
      data: normalizeAppointment(updated),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to cancel appointment",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Complete appointment
 */
export const completeAppointmentRequest = (appointmentId) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const existing = getAppointmentById(validAppointmentId);

    if (!existing) {
      throw createError("Appointment not found", 404);
    }

    if (existing.appointment_status === APPOINTMENT_STATUS.CANCELLED) {
      throw createError("Cancelled appointment cannot be completed", 400);
    }

    updateAppointmentStatus(validAppointmentId, APPOINTMENT_STATUS.COMPLETED);

    const updated = getAppointmentById(validAppointmentId);

    return {
      success: true,
      message: "Appointment completed successfully",
      data: normalizeAppointment(updated),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to complete appointment",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Update video call state
 */
export const setAppointmentVideoCallStatus = (appointmentId, status, roomId = null) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const normalizedStatus = validateVideoStatus(status);

    const normalizedRoomId =
      typeof roomId === "string" && roomId.trim() ? roomId.trim() : null;

    const existing = getAppointmentById(validAppointmentId);

    if (!existing) {
      throw createError("Appointment not found", 404);
    }

    updateVideoCallStatus(validAppointmentId, normalizedStatus, normalizedRoomId);

    const updated = getAppointmentById(validAppointmentId);

    return {
      success: true,
      message: "Video call status updated successfully",
      data: normalizeAppointment(updated),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to update video call status",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Update face verification state
 */
export const setAppointmentFaceVerification = (
  appointmentId,
  status,
  imagePath = null
) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const normalizedStatus = validateFaceStatus(status);

    const normalizedImagePath =
      typeof imagePath === "string" && imagePath.trim() ? imagePath.trim() : null;

    const existing = getAppointmentById(validAppointmentId);

    if (!existing) {
      throw createError("Appointment not found", 404);
    }

    updateFaceVerification(validAppointmentId, normalizedStatus, normalizedImagePath);

    const updated = getAppointmentById(validAppointmentId);

    return {
      success: true,
      message: "Face verification updated successfully",
      data: normalizeAppointment(updated),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to update face verification",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Verify whether a user can join appointment video call
 */
export const verifyAppointmentVideoAccess = (appointmentId, userId, userRole) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const validUserId = validateId(userId, "User ID");

    const normalizedUserRole =
      typeof userRole === "string" ? userRole.trim().toLowerCase() : "";

    if (!normalizedUserRole) {
      throw createError("User role is required", 400);
    }

    const appointment = getAppointmentById(validAppointmentId);

    if (!appointment) {
      throw createError("Appointment not found", 404);
    }

    const isPatient =
      normalizedUserRole === "patient" &&
      Number(appointment.patient_user_id) === validUserId;

    const isDoctor =
      normalizedUserRole === "doctor" &&
      Number(appointment.doctor_user_id) === validUserId;

    if (!isPatient && !isDoctor) {
      return {
        success: false,
        canJoin: false,
        reason: "UNAUTHORIZED",
        message: "You are not authorized for this appointment call",
        data: {
          appointment: normalizeAppointment(appointment),
        },
      };
    }

    if (appointment.payment_status !== PAYMENT_STATUS.PAID) {
      return {
        success: false,
        canJoin: false,
        reason: "PAYMENT_PENDING",
        message: "Payment is required before joining video call",
        data: {
          appointment: normalizeAppointment(appointment),
        },
      };
    }

    if (appointment.appointment_status !== APPOINTMENT_STATUS.CONFIRMED) {
      return {
        success: false,
        canJoin: false,
        reason: "APPOINTMENT_NOT_CONFIRMED",
        message: "Appointment must be confirmed before video call",
        data: {
          appointment: normalizeAppointment(appointment),
        },
      };
    }

    if (
      isPatient &&
      appointment.face_verification_status !== FACE_VERIFICATION_STATUS.VERIFIED
    ) {
      return {
        success: false,
        canJoin: false,
        reason: "FACE_VERIFICATION_REQUIRED",
        message: "Face verification is required before joining video call",
        data: {
          appointment: normalizeAppointment(appointment),
        },
      };
    }

    return {
      success: true,
      canJoin: true,
      reason: "ACCESS_GRANTED",
      message: "Video call access granted",
      data: {
        appointmentId: appointment.id,
        roomId: appointment.video_call_room_id || `appointment_room_${appointment.id}`,
        appointment: normalizeAppointment(appointment),
        accessRole: normalizedUserRole,
      },
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to verify appointment video access",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get today's doctor schedule
 */
export const getDoctorTodaysSchedule = (doctorId) => {
  try {
    const validDoctorId = validateId(doctorId, "Doctor ID");
    const appointments = getTodaysAppointments(validDoctorId) || [];

    return {
      success: true,
      message: "Today's appointments fetched successfully",
      data: appointments.map(normalizeAppointment),
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch today's doctor schedule",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Send appointment reminder SMS
 */
export const sendAppointmentReminder = async (appointmentId, phoneNumber) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const appointment = getAppointmentById(validAppointmentId);

    if (!appointment) {
      throw createError("Appointment not found", 404);
    }

    if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      throw createError("Valid phone number is required", 400);
    }

    const smsResult = await sendAppointmentReminderSms({
      to: phoneNumber.trim(),
      patientName: appointment.patient_name || "Patient",
      doctorName: appointment.doctor_name || "Doctor",
      appointmentCode: appointment.appointment_code,
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      consultationType: appointment.consultation_type || "video",
    });

    return {
      success: true,
      message: "Appointment reminder sent successfully",
      data: smsResult,
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to send appointment reminder",
      error.statusCode || 500,
      error.details || null
    );
  }
};

export default {
  createAppointmentRequest,
  getAppointmentDetails,
  getPatientAppointments,
  getDoctorAppointments,
  confirmAppointmentRequest,
  markAppointmentPayment,
  cancelAppointmentRequest,
  completeAppointmentRequest,
  setAppointmentVideoCallStatus,
  setAppointmentFaceVerification,
  verifyAppointmentVideoAccess,
  getDoctorTodaysSchedule,
  sendAppointmentReminder,
};