import db from "../config/db.js";
import { createError, validateId } from "../utils/helper.js";

const normalizeShift = (shift) => {
    const value = typeof shift === "string" ? shift.trim().toLowerCase() : "";
    const aliases = {
        day: "Morning",
        morning: "Morning",
        evening: "Evening",
        night: "Night",
    };

    return aliases[value] || "";
};

export const createNurse = (userId, department, shift, qualification, experience = 0) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const normalizedDepartment = typeof department === "string" ? department.trim() : "";
        const normalizedShift = normalizeShift(shift);
        const normalizedQualification = typeof qualification === "string" ? qualification.trim() : "";
        const validExperience = Number(experience);

        if (!normalizedDepartment) throw createError("Department is required", 400);
        if (!normalizedShift) throw createError("Shift is required", 400);
        if (!normalizedQualification) throw createError("Qualification is required", 400);
        if (!Number.isFinite(validExperience) || validExperience < 0) throw createError("Valid experience is required", 400);

        const stmt = db.prepare(`
            INSERT INTO nurses (user_id, department, shift, qualification, experience, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(validUserId, normalizedDepartment, normalizedShift, normalizedQualification, validExperience);
    } catch (error) {
        throw createError(error.message || "Failed to create nurse profile", error.statusCode || 500);
    }
};

export const getNurseByUserId = (userId) => {
    try {
        const validUserId = validateId(userId, "User ID");

        const stmt = db.prepare(`
            SELECT n.*, u.name, u.email, u.phone, u.profile_image
            FROM nurses n
            JOIN users u ON n.user_id = u.id
            WHERE n.user_id = ?
        `);

        return stmt.get(validUserId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch nurse by user ID", error.statusCode || 500);
    }
};

export const getNurseById = (id) => {
    try {
        const nurseId = validateId(id, "Nurse ID");

        const stmt = db.prepare(`
            SELECT n.*, u.name, u.email, u.phone, u.profile_image
            FROM nurses n
            JOIN users u ON n.user_id = u.id
            WHERE n.id = ?
        `);

        return stmt.get(nurseId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch nurse", error.statusCode || 500);
    }
};

export const getAllNurses = () => {
    try {
        const stmt = db.prepare(`
            SELECT n.*, u.name, u.email, u.phone, u.profile_image
            FROM nurses n
            JOIN users u ON n.user_id = u.id
            WHERE u.is_active = 1
            ORDER BY n.created_at DESC
        `);

        return stmt.all();
    } catch (error) {
        throw createError(error.message || "Failed to fetch nurses", error.statusCode || 500);
    }
};

export const getNursesByDepartment = (department) => {
    try {
        const normalizedDepartment = typeof department === "string" ? department.trim() : "";

        if (!normalizedDepartment) {
            throw createError("Department is required", 400);
        }

        const stmt = db.prepare(`
            SELECT n.*, u.name, u.email, u.phone
            FROM nurses n
            JOIN users u ON n.user_id = u.id
            WHERE n.department = ? AND u.is_active = 1
        `);

        return stmt.all(normalizedDepartment);
    } catch (error) {
        throw createError(error.message || "Failed to fetch nurses by department", error.statusCode || 500);
    }
};
