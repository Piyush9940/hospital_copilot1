import db from "../config/db.js";
import { createError, validateId, safeJsonStringify } from "../utils/helper.js";

const APPOINTMENT_STATUSES = ["requested", "confirmed", "cancelled", "completed", "no_show"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
const VIDEO_CALL_STATUSES = ["not_started", "waiting", "active", "ended"];
const FACE_VERIFICATION_STATUSES = ["pending", "verified", "failed"];
const CONSULTATION_TYPES = ["video", "in_person"];

const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const validateEnum = (value, allowed, fieldName) => {
    if (!allowed.includes(value)) {
        throw createError(`Invalid ${fieldName}. Allowed values: ${allowed.join(", ")}`, 400);
    }
};

const generateAppointmentCode = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = `${Date.now()}`.slice(-6);
    return `APT-${year}${month}${day}-${random}`;
};

const generateUniqueAppointmentCode = () => {
    let code = generateAppointmentCode();
    const stmt = db.prepare(`SELECT id FROM appointments WHERE appointment_code = ? LIMIT 1`);

    let attempts = 0;
    while (stmt.get(code) && attempts < 5) {
        code = generateAppointmentCode();
        attempts += 1;
    }

    if (stmt.get(code)) {
        throw createError("Failed to generate unique appointment code", 500);
    }

    return code;
};

export const createAppointment = (data) => {
    try {
        if (!data || typeof data !== "object") {
            throw createError("Appointment data is required", 400);
        }

        const patientId = validateId(data.patientId, "Patient ID");
        const doctorId = validateId(data.doctorId, "Doctor ID");
        const nurseId = data.nurseId ? validateId(data.nurseId, "Nurse ID") : null;

        const symptoms = typeof data.symptoms === "string" ? data.symptoms.trim() : "";
        const uploadedImage = typeof data.uploadedImage === "string" ? data.uploadedImage.trim() : null;
        const uploadedDocuments = data.uploadedDocuments ? safeJsonStringify(data.uploadedDocuments) : null;
        const appointmentDate = typeof data.appointmentDate === "string" ? data.appointmentDate.trim() : null;
        const appointmentTime = typeof data.appointmentTime === "string" ? data.appointmentTime.trim() : null;
        const consultationType = data.consultationType ? data.consultationType.trim() : "video";
        const fee = Number(data.fee);
        const paymentStatus = data.paymentStatus ? data.paymentStatus.trim() : "pending";

        if (!appointmentDate) {
            throw createError("appointmentDate is required", 400);
        }

        if (!appointmentTime) {
            throw createError("appointmentTime is required", 400);
        }

        if (!Number.isFinite(fee) || fee < 0) {
            throw createError("Valid fee is required", 400);
        }

        validateEnum(consultationType, CONSULTATION_TYPES, "consultation type");
        validateEnum(paymentStatus, PAYMENT_STATUSES, "payment status");

        const appointmentCode = generateUniqueAppointmentCode();

        const stmt = db.prepare(`
            INSERT INTO appointments (
                appointment_code,
                patient_id,
                doctor_id,
                nurse_id,
                symptoms,
                uploaded_image,
                uploaded_documents,
                appointment_date,
                appointment_time,
                consultation_type,
                fee,
                payment_status,
                appointment_status,
                video_call_status,
                face_verification_status,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(
            appointmentCode,
            patientId,
            doctorId,
            nurseId,
            symptoms || null,
            uploadedImage,
            uploadedDocuments,
            appointmentDate,
            appointmentTime,
            consultationType,
            fee,
            paymentStatus,
            "requested",
            "not_started",
            "pending"
        );
    } catch (error) {
        throw createError(error.message || "Failed to create appointment", error.statusCode || 500);
    }
};

export const getAppointmentById = (id) => {
    try {
        const appointmentId = validateId(id, "Appointment ID");

        const stmt = db.prepare(`
            SELECT a.*,
                   p.user_id AS patient_user_id,
                   pat.name AS patient_name,
                   pat.email AS patient_email,
                   d.user_id AS doctor_user_id,
                   doc.name AS doctor_name,
                   doc.email AS doctor_email,
                   n.user_id AS nurse_user_id,
                   nur.name AS nurse_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pat ON p.user_id = pat.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users doc ON d.user_id = doc.id
            LEFT JOIN nurses n ON a.nurse_id = n.id
            LEFT JOIN users nur ON n.user_id = nur.id
            WHERE a.id = ?
        `);

        return stmt.get(appointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch appointment", error.statusCode || 500);
    }
};

export const getAppointmentsByPatientId = (patientId) => {
    try {
        const validPatientId = validateId(patientId, "Patient ID");

        const stmt = db.prepare(`
            SELECT a.*, d.specialization, u.name AS doctor_name
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `);

        return stmt.all(validPatientId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch patient appointments", error.statusCode || 500);
    }
};

export const getAppointmentsByDoctorId = (doctorId) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const stmt = db.prepare(`
            SELECT a.*, p.user_id AS patient_user_id, u.name AS patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE a.doctor_id = ?
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
        `);

        return stmt.all(validDoctorId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch doctor appointments", error.statusCode || 500);
    }
};

export const updateAppointmentStatus = (id, status) => {
    try {
        const appointmentId = validateId(id, "Appointment ID");
        const normalizedStatus = typeof status === "string" ? status.trim() : "";

        validateEnum(normalizedStatus, APPOINTMENT_STATUSES, "appointment status");

        const stmt = db.prepare(`
            UPDATE appointments
            SET appointment_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(normalizedStatus, appointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to update appointment status", error.statusCode || 500);
    }
};

export const updatePaymentStatus = (id, paymentStatus, paymentId = null) => {
    try {
        const appointmentId = validateId(id, "Appointment ID");
        const normalizedStatus = typeof paymentStatus === "string" ? paymentStatus.trim() : "";

        validateEnum(normalizedStatus, PAYMENT_STATUSES, "payment status");

        const stmt = db.prepare(`
            UPDATE appointments
            SET payment_status = ?,
                payment_id = COALESCE(?, payment_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(normalizedStatus, paymentId, appointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to update payment status", error.statusCode || 500);
    }
};

export const updateVideoCallStatus = (id, status, roomId = null) => {
    try {
        const appointmentId = validateId(id, "Appointment ID");
        const normalizedStatus = typeof status === "string" ? status.trim() : "";
        const normalizedRoomId = typeof roomId === "string" && roomId.trim() ? roomId.trim() : null;

        validateEnum(normalizedStatus, VIDEO_CALL_STATUSES, "video call status");

        const stmt = db.prepare(`
            UPDATE appointments
            SET video_call_status = ?,
                video_call_room_id = COALESCE(?, video_call_room_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(normalizedStatus, normalizedRoomId, appointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to update video call status", error.statusCode || 500);
    }
};

export const updateFaceVerification = (id, status, imagePath = null) => {
    try {
        const appointmentId = validateId(id, "Appointment ID");
        const normalizedStatus = typeof status === "string" ? status.trim() : "";
        const normalizedImagePath = typeof imagePath === "string" && imagePath.trim() ? imagePath.trim() : null;

        validateEnum(normalizedStatus, FACE_VERIFICATION_STATUSES, "face verification status");

        const stmt = db.prepare(`
            UPDATE appointments
            SET face_verification_status = ?,
                face_verification_image = COALESCE(?, face_verification_image),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(normalizedStatus, normalizedImagePath, appointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to update face verification", error.statusCode || 500);
    }
};

export const cancelAppointment = (id, reason, cancelledBy) => {
    try {
        const appointmentId = validateId(id, "Appointment ID");
        const cancellationReason = typeof reason === "string" && reason.trim() ? reason.trim() : "Not provided";
        const cancelledByValue = typeof cancelledBy === "string" && cancelledBy.trim() ? cancelledBy.trim() : "system";

        const stmt = db.prepare(`
            UPDATE appointments
            SET appointment_status = 'cancelled',
                cancellation_reason = ?,
                cancelled_by = ?,
                cancelled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(cancellationReason, cancelledByValue, appointmentId);
    } catch (error) {
        throw createError(error.message || "Failed to cancel appointment", error.statusCode || 500);
    }
};

export const getTodaysAppointments = (doctorId) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");
        const today = getLocalDate();

        const stmt = db.prepare(`
            SELECT a.*, p.user_id AS patient_user_id, u.name AS patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE a.doctor_id = ? AND a.appointment_date = ?
            ORDER BY a.appointment_time ASC
        `);

        return stmt.all(validDoctorId, today);
    } catch (error) {
        throw createError(error.message || "Failed to fetch today's appointments", error.statusCode || 500);
    }
};