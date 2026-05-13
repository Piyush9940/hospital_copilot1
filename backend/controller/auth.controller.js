import bcrypt from "bcryptjs";

import {
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    updateUserPassword,
    deactivateUser,
    getUsersByRole
} from "../model/user.model.js";

import { generateToken } from "../config/jwt.js";
import {
    createError,
    validateEmail,
    validatePhone,
    sanitize,
    validateId,
} from "../utils/helper.js";

import db from "../config/db.js";

const ALLOWED_ROLES = ["admin", "doctor", "patient", "nurse"];

const normalizeUser = (user) => {
    if (!user) return null;

    return {
        id: user.id || null,
        name: user.name || null,
        email: user.email || null,
        role: user.role || null,
        phone: user.phone || null,
        profileImage: user.profile_image || null,
        isActive: user.is_active ?? 1,
        createdAt: user.created_at || null,
        updatedAt: user.updated_at || null,
    };
};

export const register = async (req, res, next) => {
    try {
        const name = sanitize(req.body?.name);
        const email = validateEmail(req.body?.email);
        const password =
            typeof req.body?.password === "string" ? req.body.password.trim() : "";
        const role =
            typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";
        const phone = req.body?.phone ? validatePhone(req.body.phone) : null;
        const profileImage =
            typeof req.body?.profileImage === "string" && req.body.profileImage.trim()
                ? req.body.profileImage.trim()
                : null;
        const faceDescriptorInput = req.body?.faceDescriptor || null;
        let faceDescriptor = null;

        if (!name) throw createError("Name is required", 400);
        if (!password) throw createError("Password is required", 400);
        if (password.length < 6) {
            throw createError("Password must be at least 6 characters long", 400);
        }
        if (!ALLOWED_ROLES.includes(role)) {
            throw createError(
                `Invalid role. Allowed values: ${ALLOWED_ROLES.join(", ")}`,
                400
            );
        }

        const existingUser = findUserByEmail(email);
        if (existingUser) {
            throw createError("User with this email already exists", 409);
        }
        
        if (faceDescriptorInput) {
            let descriptorArray = null;
            if (Array.isArray(faceDescriptorInput)) {
                descriptorArray = faceDescriptorInput;
            } else if (typeof faceDescriptorInput === "object") {
                descriptorArray = Object.values(faceDescriptorInput);
            }
            if (descriptorArray && descriptorArray.length > 0) {
                faceDescriptor = { path: null, embedding: descriptorArray };
            }
        }

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const tx = db.transaction((payload) => {
            const result = createUser(
                payload.name,
                payload.email,
                payload.hashedPassword,
                payload.role,
                payload.phone,
                payload.profileImage,
                payload.faceDescriptor
            );

            if (!result || !result.lastInsertRowid) {
                throw createError("Failed to create user", 500);
            }

            const user = findUserById(result.lastInsertRowid);
            if (!user) {
                throw createError("User created but could not be fetched", 500);
            }

            const token = generateToken({
                id: user.id,
                email: user.email,
                role: user.role,
            });

            return { user, token };
        });

        const { user, token } = tx({
            name,
            email,
            hashedPassword,
            role,
            phone,
            profileImage,
            faceDescriptor,
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: normalizeUser(user),
                token,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Registration failed",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const login = async (req, res, next) => {
    try {
        const email = validateEmail(req.body?.email);
        const password =
            typeof req.body?.password === "string" ? req.body.password.trim() : "";
        const requestedRole =
            typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";

        if (!password) {
            throw createError("Password is required", 400);
        }

        if (!["patient", "doctor", "nurse"].includes(requestedRole)) {
            throw createError("Please select a valid role before logging in", 400);
        }

        const user = findUserByEmail(email);

        if (!user) {
            throw createError("Invalid email or password", 401);
        }

        if (Number(user.is_active) === 0) {
            throw createError("Your account is inactive", 403);
        }

        if (String(user.role || "").toLowerCase() !== requestedRole) {
            throw createError(
                `This account is registered as ${user.role}. Please choose the ${user.role} role to log in.`,
                403
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw createError("Invalid email or password", 401);
        }

        let faceDescriptorInput = req.body?.faceDescriptor;
        if (faceDescriptorInput && !Array.isArray(faceDescriptorInput) && typeof faceDescriptorInput === "object") {
            faceDescriptorInput = Object.values(faceDescriptorInput);
        }

        if (user.face_registered === 1 && Array.isArray(faceDescriptorInput)) {
            try {
                const storedEmbedding = JSON.parse(user.face_embedding_json);
                const distance = calculateEuclideanDistance(faceDescriptorInput, storedEmbedding);
                
                // Using 0.6 threshold for face-api.js
                if (distance > 0.6) {
                    throw createError("Face verification failed: Not a match", 401);
                }
            } catch (err) {
                console.error("Face verification error:", err);
                throw createError("Face verification failed: " + err.message, 401);
            }
        }

        const safeUser = findUserById(user.id);
        if (!safeUser) {
            throw createError("Failed to fetch user profile", 500);
        }

        const token = generateToken({
            id: safeUser.id,
            email: safeUser.email,
            role: safeUser.role,
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: normalizeUser(safeUser),
                token,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Login failed",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

const calculateEuclideanDistance = (emb1, emb2) => {
    if (emb1.length !== emb2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < emb1.length; i++) {
        const diff = emb1[i] - emb2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
};

export const faceLogin = async (req, res, next) => {
    try {
        let faceDescriptorInput = req.body?.faceDescriptor;
        if (faceDescriptorInput && !Array.isArray(faceDescriptorInput) && typeof faceDescriptorInput === "object") {
            faceDescriptorInput = Object.values(faceDescriptorInput);
        }

        const role = typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";

        if (!faceDescriptorInput || !Array.isArray(faceDescriptorInput)) {
            throw createError("Face descriptor is required", 400);
        }
        if (!ALLOWED_ROLES.includes(role)) {
            throw createError(`Invalid role. Allowed values: ${ALLOWED_ROLES.join(", ")}`, 400);
        }

        const currentEmbedding = faceDescriptorInput;

        // 2. Fetch users with faces
        const usersStmt = db.prepare('SELECT id, email, role, face_embedding_json FROM users WHERE role = ? AND is_active = 1 AND face_embedding_json IS NOT NULL');
        const users = usersStmt.all(role);

        if (!users.length) {
            throw createError(`No face-registered ${role} account was found`, 404);
        }

        // 3. Find best match using Euclidean Distance
        let bestMatch = null;
        let minDistance = Infinity;
        const DISTANCE_THRESHOLD = 0.60; // face-api.js threshold

        for (const u of users) {
            try {
                const storedEmbedding = JSON.parse(u.face_embedding_json);
                const distance = calculateEuclideanDistance(currentEmbedding, storedEmbedding);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = u;
                }
            } catch(e) {
                // Ignore parse errors
            }
        }

        if (!bestMatch || minDistance > DISTANCE_THRESHOLD) {
            throw createError("Face not recognized", 401);
        }

        const safeUser = findUserById(bestMatch.id);
        if (!safeUser) {
            throw createError("Failed to fetch user profile", 500);
        }

        const token = generateToken({
            id: safeUser.id,
            email: safeUser.email,
            role: safeUser.role,
        });

        return res.status(200).json({
            success: true,
            message: "Face Login successful",
            data: {
                user: normalizeUser(safeUser),
                token,
            },
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Face Login failed",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const getMe = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");
        const user = findUserById(userId);

        if (!user) {
            throw createError("User not found", 404);
        }

        return res.status(200).json({
            success: true,
            message: "User profile fetched successfully",
            data: normalizeUser(user),
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const updateMe = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const existingUser = findUserById(userId);
        if (!existingUser) {
            throw createError("User not found", 404);
        }

        const payload = {
            name:
                typeof req.body?.name === "string" && req.body.name.trim()
                    ? sanitize(req.body.name)
                    : null,
            phone:
                req.body?.phone && String(req.body.phone).trim()
                    ? validatePhone(req.body.phone)
                    : null,
            email:
                req.body?.email && String(req.body.email).trim()
                    ? validateEmail(req.body.email)
                    : null,
            profileImage:
                typeof req.body?.profileImage === "string" &&
                req.body.profileImage.trim()
                    ? req.body.profileImage.trim()
                    : null,
        };

        if (!payload.name && !payload.email && !payload.phone && !payload.profileImage) {
            throw createError("At least one field is required to update profile", 400);
        }

        const result = updateUser(userId, payload);

        if (!result || result.changes === 0) {
            throw createError("Profile was not updated", 500);
        }

        const updatedUser = findUserById(userId);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: normalizeUser(updatedUser),
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const updateMyPassword = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");

        const currentPassword =
            typeof req.body?.currentPassword === "string"
                ? req.body.currentPassword.trim()
                : "";
        const newPassword =
            typeof req.body?.newPassword === "string"
                ? req.body.newPassword.trim()
                : "";
        const confirmPassword =
            typeof req.body?.confirmPassword === "string"
                ? req.body.confirmPassword.trim()
                : "";

        if (!currentPassword) {
            throw createError("Current password is required", 400);
        }

        if (!newPassword) {
            throw createError("New password is required", 400);
        }

        if (newPassword.length < 6) {
            throw createError("New password must be at least 6 characters long", 400);
        }

        if (newPassword !== confirmPassword) {
            throw createError("New password and confirm password do not match", 400);
        }

        const userWithPassword = db
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(userId);
        if (!userWithPassword) {
            throw createError("User not found", 404);
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            currentPassword,
            userWithPassword.password
        );

        if (!isCurrentPasswordValid) {
            throw createError("Current password is incorrect", 401);
        }

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const result = updateUserPassword(userId, hashedPassword);

        if (!result || result.changes === 0) {
            throw createError("Password was not updated", 500);
        }

        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update password",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

export const deleteMyProfile = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const userId = validateId(req.user.id, "User ID");
        const password =
            typeof req.body?.password === "string" ? req.body.password.trim() : "";

        if (!password) {
            throw createError("Password is required", 400);
        }

        const userWithPassword = db
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(userId);
        if (!userWithPassword) {
            throw createError("User not found", 404);
        }

        const isPasswordValid = await bcrypt.compare(password, userWithPassword.password);

        if (!isPasswordValid) {
            throw createError("Invalid password", 401);
        }

        const result = deactivateUser(userId);

        if (!result || result.changes === 0) {
            throw createError("Profile was not deleted", 500);
        }

        return res.status(200).json({
            success: true,
            message: "Profile deleted successfully",
        });
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to delete profile",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};
