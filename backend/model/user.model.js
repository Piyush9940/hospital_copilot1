import db from "../config/db.js";
import { createError, validateId, validateEmail, validatePhone } from "../utils/helper.js";

const USER_ROLES = ["admin", "doctor", "patient", "nurse"];

export const createUser = (name, email, password, role, phone = null, profileImage = null, faceDescriptor = null) => {
    try {
        const normalizedName = typeof name === "string" ? name.trim() : "";
        const normalizedEmail = validateEmail(email);
        const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
        const normalizedPhone = phone ? validatePhone(phone) : null;
        const normalizedProfileImage =
            typeof profileImage === "string" && profileImage.trim()
                ? profileImage.trim()
                : "default-profile.jpg";
        const normalizedFaceImagePath = typeof faceDescriptor === "object" && faceDescriptor?.path ? faceDescriptor.path : null;
        const normalizedFaceEmbedding = typeof faceDescriptor === "object" && faceDescriptor?.embedding ? JSON.stringify(faceDescriptor.embedding) : null;
        const normalizedFaceRegistered = normalizedFaceEmbedding ? 1 : 0;

        if (!normalizedName) throw createError("Name is required", 400);
        if (!password || typeof password !== "string" || !password.trim()) {
            throw createError("Password is required", 400);
        }
        if (!USER_ROLES.includes(normalizedRole)) {
            throw createError(`Invalid role. Allowed values: ${USER_ROLES.join(", ")}`, 400);
        }

        const existingStmt = db.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`);
        const existingUser = existingStmt.get(normalizedEmail);

        if (existingUser) {
            throw createError("User with this email already exists", 409);
        }

        const stmt = db.prepare(`
            INSERT INTO users (
                name,
                email,
                password,
                role,
                phone,
                profile_image,
                face_image_path,
                face_embedding_json,
                face_registered,
                is_active,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(
            normalizedName,
            normalizedEmail,
            password,
            normalizedRole,
            normalizedPhone,
            normalizedProfileImage,
            normalizedFaceImagePath,
            normalizedFaceEmbedding,
            normalizedFaceRegistered
        );
    } catch (error) {
        throw createError(error.message || "Failed to create user", error.statusCode || 500);
    }
};

export const findUserByEmail = (email) => {
    try {
        const normalizedEmail = validateEmail(email);

        const stmt = db.prepare(`
            SELECT *
            FROM users
            WHERE email = ?
        `);

        return stmt.get(normalizedEmail);
    } catch (error) {
        throw createError(error.message || "Failed to find user by email", error.statusCode || 500);
    }
};

export const findUserById = (id) => {
    try {
        const userId = validateId(id, "User ID");

        const stmt = db.prepare(`
            SELECT id, name, email, role, phone, profile_image, is_active, created_at, updated_at
            FROM users
            WHERE id = ?
        `);

        return stmt.get(userId);
    } catch (error) {
        throw createError(error.message || "Failed to find user by ID", error.statusCode || 500);
    }
};

export const getUsersByRole = (role) => {
    try {
        const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";

        if (!USER_ROLES.includes(normalizedRole)) {
            throw createError(`Invalid role. Allowed values: ${USER_ROLES.join(", ")}`, 400);
        }

        const stmt = db.prepare(`
            SELECT id, name, email, phone, profile_image
            FROM users
            WHERE role = ? AND is_active = 1
        `);

        return stmt.all(normalizedRole);
    } catch (error) {
        throw createError(error.message || "Failed to fetch users by role", error.statusCode || 500);
    }
};

export const updateUser = (id, data) => {
    try {
        const userId = validateId(id, "User ID");

        if (!data || typeof data !== "object") {
            throw createError("Update data is required", 400);
        }

        const name =
            typeof data.name === "string" && data.name.trim() ? data.name.trim() : null;
        const email =
            typeof data.email === "string" && data.email.trim() ? validateEmail(data.email) : null;
        const phone = data.phone ? validatePhone(data.phone) : null;
        const profileImage =
            typeof data.profileImage === "string" && data.profileImage.trim()
                ? data.profileImage.trim()
                : null;

        if (email) {
            const existingStmt = db.prepare(`SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1`);
            if (existingStmt.get(email, userId)) {
                throw createError("User with this email already exists", 409);
            }
        }

        const stmt = db.prepare(`
            UPDATE users
            SET name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                profile_image = COALESCE(?, profile_image),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(name, email, phone, profileImage, userId);
    } catch (error) {
        throw createError(error.message || "Failed to update user", error.statusCode || 500);
    }
};

export const updateUserPassword = (id, hashedPassword) => {
    try {
        const userId = validateId(id, "User ID");

        if (!hashedPassword || typeof hashedPassword !== "string" || !hashedPassword.trim()) {
            throw createError("Hashed password is required", 400);
        }

        const stmt = db.prepare(`
            UPDATE users
            SET password = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(hashedPassword.trim(), userId);
    } catch (error) {
        throw createError(error.message || "Failed to update user password", error.statusCode || 500);
    }
};

export const deactivateUser = (id) => {
    try {
        const userId = validateId(id, "User ID");

        const stmt = db.prepare(`
            UPDATE users
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(userId);
    } catch (error) {
        throw createError(error.message || "Failed to deactivate user", error.statusCode || 500);
    }
};
