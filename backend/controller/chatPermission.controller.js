import {
    createCommunicationRequest,
    approveCommunicationRequest,
    rejectCommunicationRequest,
    checkCommunicationAccess,
    getAppointmentCommunicationPermissions,
} from "../services/communication.service.js";

import { createError, validateId } from "../utils/helper.js";

/**
 * Create chat/communication permission request
 * Usually patient requests permission to chat with doctor for an appointment
 */
export const requestChatPermission = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.body?.appointmentId, "Appointment ID");
        const patientId = validateId(req.body?.patientId, "Patient ID");
        const doctorId = validateId(req.body?.doctorId, "Doctor ID");

        const result = await createCommunicationRequest(
            appointmentId,
            patientId,
            doctorId
        );

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to request chat permission",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Approve communication request
 * Usually doctor-side action
 */
export const approvePermission = async (req, res, next) => {
    try {
        const permissionId = validateId(req.params?.permissionId, "Permission ID");

        const result = await approveCommunicationRequest(permissionId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to approve chat permission",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Reject communication request
 * Usually doctor-side action
 */
export const rejectPermission = async (req, res, next) => {
    try {
        const permissionId = validateId(req.params?.permissionId, "Permission ID");

        const result = await rejectCommunicationRequest(permissionId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to reject chat permission",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Check whether communication is allowed
 */
export const checkPermissionAccess = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.query?.appointmentId, "Appointment ID");
        const patientId = validateId(req.query?.patientId, "Patient ID");
        const doctorId = validateId(req.query?.doctorId, "Doctor ID");

        const result = await checkCommunicationAccess(
            appointmentId,
            patientId,
            doctorId
        );

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to check chat permission access",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get all chat permissions for an appointment
 */
export const getPermissionsByAppointment = async (req, res, next) => {
    try {
        const appointmentId = validateId(req.params?.appointmentId, "Appointment ID");

        const result = await getAppointmentCommunicationPermissions(appointmentId);

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch chat permissions",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};