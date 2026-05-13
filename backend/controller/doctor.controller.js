import {
    createDoctorProfile,
    getDoctorProfileByUserId,
    getDoctorProfileById,
    getAllDoctorProfiles,
    updateDoctorProfileRating,
    incrementDoctorPatientCounter,
    getDoctorTodayAppointments,
    getDoctorAppointmentHistory,
    getDoctorDashboardSummary,
} from "../services/doctor.service.js";

import { createError, validateId } from "../utils/helper.js";

/**
 * Create doctor profile
 */
export const createProfile = async (req, res, next) => {
    try {
        const result = await createDoctorProfile({
            userId: req.user?.id || req.body?.userId,
            specialization: req.body?.specialization,
            experience: req.body?.experience,
            qualification: req.body?.qualification,
            appointmentFee: req.body?.appointmentFee,
            hospitalName: req.body?.hospitalName,
            hospitalAddress: req.body?.hospitalAddress || null,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create doctor profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in doctor profile
 */
export const getMyProfile = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getDoctorProfileByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get doctor profile by user ID
 */
export const getProfileByUserId = async (req, res, next) => {
    try {
        const userId = validateId(req.params?.userId, "User ID");

        const result = await getDoctorProfileByUserId({
            userId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor profile by user ID",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get doctor profile by doctor table ID
 */
export const getProfileById = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await getDoctorProfileById({
            doctorId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get all doctor profiles
 */
export const getAllProfiles = async (req, res, next) => {
    try {
        const result = await getAllDoctorProfiles();

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor profiles",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Update doctor rating
 */
export const updateRating = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await updateDoctorProfileRating({
            doctorId,
            rating: req.body?.rating,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update doctor rating",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Increment doctor patient count
 * Useful after confirmed/completed consultation flows.
 */
export const incrementPatientCount = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await incrementDoctorPatientCounter({
            doctorId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to increment doctor patient count",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get doctor's today's appointments
 */
export const getTodayAppointments = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await getDoctorTodayAppointments({
            doctorId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor's today's appointments",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get doctor's appointment history
 */
export const getAppointmentHistory = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await getDoctorAppointmentHistory({
            doctorId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor appointment history",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get doctor dashboard summary
 */
export const getDashboardSummary = async (req, res, next) => {
    try {
        const doctorId = validateId(req.params?.doctorId, "Doctor ID");

        const result = await getDoctorDashboardSummary({
            doctorId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch doctor dashboard summary",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};
