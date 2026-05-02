import {
    createDoctor,
    getDoctorByUserId,
    getDoctorById,
    getAllDoctors,
    updateDoctorRating,
    incrementPatientCount,
} from "../model/doctor.model.js";

import { getTodaysAppointments, getAppointmentsByDoctorId } from "../model/appointment.model.js";
import { createError, validateId, sanitize } from "../utils/helper.js";

/**
 * Normalize doctor object
 */
const normalizeDoctor = (doctor) => {
    if (!doctor) return null;

    return {
        id: doctor.id || null,
        userId: doctor.user_id || null,
        name: doctor.name || null,
        email: doctor.email || null,
        phone: doctor.phone || null,
        profileImage: doctor.profile_image || null,
        specialization: doctor.specialization || null,
        experience: doctor.experience ?? 0,
        qualification: doctor.qualification || null,
        appointmentFee: doctor.appointment_fee ?? null,
        hospitalName: doctor.hospital_name || null,
        hospitalAddress: doctor.hospital_address || null,
        rating: doctor.rating ?? 0,
        totalPatients: doctor.total_patients ?? 0,
        createdAt: doctor.created_at || null,
        updatedAt: doctor.updated_at || null,
    };
};

/**
 * Normalize appointment summary for doctor dashboard helpers
 */
const normalizeAppointmentSummary = (appointment) => {
    if (!appointment) return null;

    return {
        id: appointment.id || null,
        appointmentCode: appointment.appointment_code || null,
        patientId: appointment.patient_id || null,
        patientUserId: appointment.patient_user_id || null,
        patientName: appointment.patient_name || null,
        appointmentDate: appointment.appointment_date || null,
        appointmentTime: appointment.appointment_time || null,
        consultationType: appointment.consultation_type || null,
        appointmentStatus: appointment.appointment_status || null,
        paymentStatus: appointment.payment_status || null,
        symptoms: appointment.symptoms || null,
    };
};

/**
 * Create doctor profile
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @param {string} payload.specialization
 * @param {number|string} payload.experience
 * @param {string} payload.qualification
 * @param {number|string} payload.appointmentFee
 * @param {string} payload.hospitalName
 * @param {string} [payload.hospitalAddress]
 * @returns {Object}
 */
export const createDoctorProfile = ({
    userId,
    specialization,
    experience,
    qualification,
    appointmentFee,
    hospitalName,
    hospitalAddress = null,
}) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const normalizedSpecialization = sanitize(specialization);
        const normalizedQualification = sanitize(qualification);
        const normalizedHospitalName = sanitize(hospitalName);
        const normalizedHospitalAddress =
            typeof hospitalAddress === "string" && hospitalAddress.trim()
                ? hospitalAddress.trim()
                : null;

        const validExperience = Number(experience);
        const validAppointmentFee = Number(appointmentFee);

        if (!normalizedSpecialization) {
            throw createError("Specialization is required", 400);
        }

        if (!normalizedQualification) {
            throw createError("Qualification is required", 400);
        }

        if (!normalizedHospitalName) {
            throw createError("Hospital name is required", 400);
        }

        if (!Number.isFinite(validExperience) || validExperience < 0) {
            throw createError("Valid experience is required", 400);
        }

        if (!Number.isFinite(validAppointmentFee) || validAppointmentFee < 0) {
            throw createError("Valid appointment fee is required", 400);
        }

        const result = createDoctor(
            validUserId,
            normalizedSpecialization,
            validExperience,
            normalizedQualification,
            validAppointmentFee,
            normalizedHospitalName,
            normalizedHospitalAddress
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create doctor profile", 500);
        }

        const doctor = getDoctorById(result.lastInsertRowid);

        return {
            success: true,
            message: "Doctor profile created successfully",
            data: normalizeDoctor(doctor),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create doctor profile",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get doctor profile by user ID
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getDoctorProfileByUserId = ({ userId }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const doctor = getDoctorByUserId(validUserId);

        if (!doctor) {
            throw createError("Doctor profile not found", 404);
        }

        return {
            success: true,
            message: "Doctor profile fetched successfully",
            data: normalizeDoctor(doctor),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch doctor profile by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get doctor profile by doctor ID
 * @param {Object} payload
 * @param {number|string} payload.doctorId
 * @returns {Object}
 */
export const getDoctorProfileById = ({ doctorId }) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");
        const doctor = getDoctorById(validDoctorId);

        if (!doctor) {
            throw createError("Doctor profile not found", 404);
        }

        return {
            success: true,
            message: "Doctor profile fetched successfully",
            data: normalizeDoctor(doctor),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch doctor profile",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all doctor profiles
 * @returns {Object}
 */
export const getAllDoctorProfiles = () => {
    try {
        const doctors = getAllDoctors() || [];

        return {
            success: true,
            message: "Doctor profiles fetched successfully",
            data: doctors.map(normalizeDoctor),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch doctor profiles",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Update doctor rating
 * @param {Object} payload
 * @param {number|string} payload.doctorId
 * @param {number|string} payload.rating
 * @returns {Object}
 */
export const updateDoctorProfileRating = ({ doctorId, rating }) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");
        const validRating = Number(rating);

        if (!Number.isFinite(validRating) || validRating < 0 || validRating > 5) {
            throw createError("Rating must be between 0 and 5", 400);
        }

        const existing = getDoctorById(validDoctorId);
        if (!existing) {
            throw createError("Doctor profile not found", 404);
        }

        const result = updateDoctorRating(validDoctorId, validRating);

        if (!result || result.changes === 0) {
            throw createError("Doctor rating was not updated", 500);
        }

        const updated = getDoctorById(validDoctorId);

        return {
            success: true,
            message: "Doctor rating updated successfully",
            data: normalizeDoctor(updated),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to update doctor rating",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Increment doctor's patient count
 * @param {Object} payload
 * @param {number|string} payload.doctorId
 * @returns {Object}
 */
export const incrementDoctorPatientCounter = ({ doctorId }) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const existing = getDoctorById(validDoctorId);
        if (!existing) {
            throw createError("Doctor profile not found", 404);
        }

        const result = incrementPatientCount(validDoctorId);

        if (!result || result.changes === 0) {
            throw createError("Doctor patient count was not updated", 500);
        }

        const updated = getDoctorById(validDoctorId);

        return {
            success: true,
            message: "Doctor patient count updated successfully",
            data: normalizeDoctor(updated),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to increment doctor patient count",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get today's appointments for doctor
 * @param {Object} payload
 * @param {number|string} payload.doctorId
 * @returns {Object}
 */
export const getDoctorTodayAppointments = ({ doctorId }) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const existing = getDoctorById(validDoctorId);
        if (!existing) {
            throw createError("Doctor profile not found", 404);
        }

        const appointments = getTodaysAppointments(validDoctorId) || [];

        return {
            success: true,
            message: "Doctor today's appointments fetched successfully",
            data: appointments.map(normalizeAppointmentSummary),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch doctor's today's appointments",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get all appointments for doctor
 * @param {Object} payload
 * @param {number|string} payload.doctorId
 * @returns {Object}
 */
export const getDoctorAppointmentHistory = ({ doctorId }) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const existing = getDoctorById(validDoctorId);
        if (!existing) {
            throw createError("Doctor profile not found", 404);
        }

        const appointments = getAppointmentsByDoctorId(validDoctorId) || [];

        return {
            success: true,
            message: "Doctor appointment history fetched successfully",
            data: appointments.map(normalizeAppointmentSummary),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch doctor appointment history",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Get compact doctor dashboard summary
 * @param {Object} payload
 * @param {number|string} payload.doctorId
 * @returns {Object}
 */
export const getDoctorDashboardSummary = ({ doctorId }) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const doctor = getDoctorById(validDoctorId);
        if (!doctor) {
            throw createError("Doctor profile not found", 404);
        }

        const todayAppointments = getTodaysAppointments(validDoctorId) || [];
        const allAppointments = getAppointmentsByDoctorId(validDoctorId) || [];

        const summary = {
            totalPatients: doctor.total_patients ?? 0,
            rating: doctor.rating ?? 0,
            todayAppointmentsCount: todayAppointments.length,
            totalAppointmentsCount: allAppointments.length,
            specialization: doctor.specialization || null,
            hospitalName: doctor.hospital_name || null,
        };

        return {
            success: true,
            message: "Doctor dashboard summary fetched successfully",
            data: {
                doctor: normalizeDoctor(doctor),
                summary,
                todayAppointments: todayAppointments.map(normalizeAppointmentSummary),
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch doctor dashboard summary",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    createDoctorProfile,
    getDoctorProfileByUserId,
    getDoctorProfileById,
    getAllDoctorProfiles,
    updateDoctorProfileRating,
    incrementDoctorPatientCounter,
    getDoctorTodayAppointments,
    getDoctorAppointmentHistory,
    getDoctorDashboardSummary,
};