import db from "../config/db.js";
import { createError, validateId, generateHashedPatientId, validateStringId } from "../utils/helper.js";

export const createPatientProfile = (userId, age, gender, history, allergies, medications, bloodGroup, address, dateOfBirth) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const validAge =
            age === undefined || age === null || age === "" ? null : Number(age);
        let normalizedGender = typeof gender === "string" ? gender.trim() : "";
        if (normalizedGender) {
            normalizedGender = normalizedGender.charAt(0).toUpperCase() + normalizedGender.slice(1).toLowerCase();
        }
        const normalizedHistory = typeof history === "string" ? history.trim() : "";
        const normalizedAllergies = typeof allergies === "string" ? allergies.trim() : "";
        const normalizedMedications = typeof medications === "string" ? medications.trim() : "";
        const normalizedBloodGroup = typeof bloodGroup === "string" ? bloodGroup.trim() : "";
        const normalizedAddress = typeof address === "string" ? address.trim() : "";
        const normalizedDateOfBirth = typeof dateOfBirth === "string" ? dateOfBirth.trim() : "";

        if (validAge !== null && (!Number.isInteger(validAge) || validAge <= 0)) {
            throw createError("Valid age is required", 400);
        }

        const patientIdHash = generateHashedPatientId();

        const stmt = db.prepare(`
            INSERT INTO patients (
                patient_id,
                user_id,
                age,
                gender,
                history,
                allergies,
                medications,
                blood_group,
                address,
                date_of_birth,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                age = excluded.age,
                gender = excluded.gender,
                history = excluded.history,
                allergies = excluded.allergies,
                medications = excluded.medications,
                blood_group = excluded.blood_group,
                address = excluded.address,
                date_of_birth = excluded.date_of_birth,
                updated_at = CURRENT_TIMESTAMP
        `);

        return stmt.run(
            patientIdHash,
            validUserId,
            validAge,
            normalizedGender || null,
            normalizedHistory || null,
            normalizedAllergies || null,
            normalizedMedications || null,
            normalizedBloodGroup || null,
            normalizedAddress || null,
            normalizedDateOfBirth || null
        );
    } catch (error) {
        throw createError(error.message || "Failed to create or update patient profile", error.statusCode || 500);
    }
};

export const getPatientByUserId = (userId) => {
    try {
        const validUserId = validateId(userId, "User ID");

        const stmt = db.prepare(`
            SELECT *
            FROM patients
            WHERE user_id = ?
        `);

        return stmt.get(validUserId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch patient profile", error.statusCode || 500);
    }
};

export const getAllPatients = () => {
    try {
        const stmt = db.prepare(`
            SELECT p.*, u.name, u.email
            FROM patients p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);

        return stmt.all();
    } catch (error) {
        throw createError(error.message || "Failed to fetch patients", error.statusCode || 500);
    }
};
