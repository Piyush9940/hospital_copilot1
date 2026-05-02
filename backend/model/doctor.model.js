import db from "../config/db.js";
import { createError, validateId } from "../utils/helper.js";

export const createDoctor = (userId, specialization, experience, qualification, appointmentFee, hospitalName, hospitalAddress = null) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const normalizedSpecialization = typeof specialization === "string" ? specialization.trim() : "";
        const normalizedQualification = typeof qualification === "string" ? qualification.trim() : "";
        const normalizedHospitalName = typeof hospitalName === "string" ? hospitalName.trim() : "";
        const normalizedHospitalAddress = typeof hospitalAddress === "string" && hospitalAddress.trim() ? hospitalAddress.trim() : null;
        const validExperience = Number(experience);
        const validAppointmentFee = Number(appointmentFee);

        if (!normalizedSpecialization) throw createError("Specialization is required", 400);
        if (!normalizedQualification) throw createError("Qualification is required", 400);
        if (!normalizedHospitalName) throw createError("Hospital name is required", 400);
        if (!Number.isFinite(validExperience) || validExperience < 0) throw createError("Valid experience is required", 400);
        if (!Number.isFinite(validAppointmentFee) || validAppointmentFee < 0) throw createError("Valid appointment fee is required", 400);

        const stmt = db.prepare(`
            INSERT INTO doctors (
                user_id,
                specialization,
                experience,
                qualification,
                appointment_fee,
                hospital_name,
                hospital_address,
                rating,
                total_patients,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(
            validUserId,
            normalizedSpecialization,
            validExperience,
            normalizedQualification,
            validAppointmentFee,
            normalizedHospitalName,
            normalizedHospitalAddress
        );
    } catch (error) {
        throw createError(error.message || "Failed to create doctor profile", error.statusCode || 500);
    }
};

export const getDoctorByUserId = (userId) => {
    try {
        const validUserId = validateId(userId, "User ID");

        const stmt = db.prepare(`
            SELECT d.*, u.name, u.email, u.phone, u.profile_image
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?
        `);

        return stmt.get(validUserId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch doctor by user ID", error.statusCode || 500);
    }
};

export const getDoctorById = (id) => {
    try {
        const doctorId = validateId(id, "Doctor ID");

        const stmt = db.prepare(`
            SELECT d.*, u.name, u.email, u.phone, u.profile_image
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ?
        `);

        return stmt.get(doctorId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch doctor", error.statusCode || 500);
    }
};

export const getAllDoctors = () => {
    try {
        const stmt = db.prepare(`
            SELECT d.*, u.name, u.email, u.phone, u.profile_image
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE u.is_active = 1
            ORDER BY d.rating DESC, d.created_at DESC
        `);

        return stmt.all();
    } catch (error) {
        throw createError(error.message || "Failed to fetch doctors", error.statusCode || 500);
    }
};

export const updateDoctorRating = (doctorId, rating) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");
        const validRating = Number(rating);

        if (!Number.isFinite(validRating) || validRating < 0 || validRating > 5) {
            throw createError("Rating must be between 0 and 5", 400);
        }

        const stmt = db.prepare(`
            UPDATE doctors
            SET rating = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(validRating, validDoctorId);
    } catch (error) {
        throw createError(error.message || "Failed to update doctor rating", error.statusCode || 500);
    }
};

export const incrementPatientCount = (doctorId) => {
    try {
        const validDoctorId = validateId(doctorId, "Doctor ID");

        const stmt = db.prepare(`
            UPDATE doctors
            SET total_patients = total_patients + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(validDoctorId);
    } catch (error) {
        throw createError(error.message || "Failed to increment patient count", error.statusCode || 500);
    }
};