import {
    createReport,
    getReportsByPatientId,
    getReportById,
    getAllReports,
    updateReport,
    deleteReport,
} from "../model/report.model.js";

import { getPatientByUserId } from "../model/patient.model.js";
import { createError, validateId, validateStringId, sanitize } from "../utils/helper.js";

/**
 * Normalize report object
 */
const normalizeReport = (report) => {
    if (!report) return null;

    return {
        id: report.id || null,
        patientId: report.patient_id || null,
        doctorId: report.doctor_id || null,
        title: report.title || null,
        diagnosis: report.diagnosis || null,
        summary: report.summary || null,
        pdfPath: report.pdf_url || report.pdf_path || null,
        patientName: report.patient_name || null,
        patientEmail: report.patient_email || null,
        createdAt: report.created_at || null,
        updatedAt: report.updated_at || null,
    };
};

/**
 * Create a new report
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @param {string} payload.diagnosis
 * @param {string} payload.summary
 * @param {string} payload.pdfPath
 * @returns {Object}
 */
export const createMedicalReport = ({ patientId, doctorId, title, diagnosis, summary, pdfPath }) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const normalizedDiagnosis = sanitize(diagnosis);
        const normalizedSummary = sanitize(summary);
        const normalizedPdfPath =
            typeof pdfPath === "string" && pdfPath.trim() ? pdfPath.trim() : "";

        if (!normalizedDiagnosis) {
            throw createError("Diagnosis is required", 400);
        }

        if (!normalizedSummary) {
            throw createError("Summary is required", 400);
        }

        if (!normalizedPdfPath) {
            throw createError("PDF path is required", 400);
        }

        const result = createReport(
            validPatientId,
            doctorId,
            title,
            normalizedDiagnosis,
            normalizedSummary,
            normalizedPdfPath
        );

        if (!result || !result.lastInsertRowid) {
            throw createError("Failed to create report", 500);
        }

        const createdReport = getReportById(result.lastInsertRowid);

        return {
            success: true,
            message: "Medical report created successfully",
            data: normalizeReport(createdReport),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to create medical report",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Fetch a single report by ID
 * @param {Object} payload
 * @param {number|string} payload.reportId
 * @returns {Object}
 */
export const getMedicalReportDetails = ({ reportId }) => {
    try {
        const validReportId = validateId(reportId, "Report ID");
        const report = getReportById(validReportId);

        if (!report) {
            throw createError("Report not found", 404);
        }

        return {
            success: true,
            message: "Medical report fetched successfully",
            data: normalizeReport(report),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch medical report",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Fetch all reports for a patient using patient table ID
 * @param {Object} payload
 * @param {number|string} payload.patientId
 * @returns {Object}
 */
export const getPatientMedicalReports = ({ patientId }) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const reports = getReportsByPatientId(validPatientId) || [];

        return {
            success: true,
            message: "Patient medical reports fetched successfully",
            data: reports.map(normalizeReport),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch patient medical reports",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Fetch all reports for a patient using user ID
 * Useful for authenticated patient flow.
 * @param {Object} payload
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const getMedicalReportsByUserId = ({ userId }) => {
    try {
        const validUserId = validateId(userId, "User ID");
        const patient = getPatientByUserId(validUserId);

        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const reports = getReportsByPatientId(patient.patient_id) || [];

        return {
            success: true,
            message: "Medical reports fetched successfully",
            data: reports.map(normalizeReport),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch medical reports by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Fetch all reports for dashboard/admin/doctor use
 * @returns {Object}
 */
export const getAllMedicalReports = () => {
    try {
        const reports = getAllReports() || [];

        return {
            success: true,
            message: "All medical reports fetched successfully",
            data: reports.map(normalizeReport),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to fetch all medical reports",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Update report
 * @param {Object} payload
 * @param {number|string} payload.reportId
 * @param {string} [payload.diagnosis]
 * @param {string} [payload.summary]
 * @param {string} [payload.pdfPath]
 * @returns {Object}
 */
export const updateMedicalReport = ({ reportId, diagnosis, summary, pdfPath }) => {
    try {
        const validReportId = validateId(reportId, "Report ID");

        const existing = getReportById(validReportId);
        if (!existing) {
            throw createError("Report not found", 404);
        }

        const normalizedDiagnosis =
            typeof diagnosis === "string" && diagnosis.trim() ? sanitize(diagnosis) : null;
        const normalizedSummary =
            typeof summary === "string" && summary.trim() ? sanitize(summary) : null;
        const normalizedPdfPath =
            typeof pdfPath === "string" && pdfPath.trim() ? pdfPath.trim() : null;

        if (!normalizedDiagnosis && !normalizedSummary && !normalizedPdfPath) {
            throw createError("At least one field is required to update report", 400);
        }

        const result = updateReport(
            validReportId,
            normalizedDiagnosis,
            normalizedSummary,
            normalizedPdfPath
        );

        if (!result || result.changes === 0) {
            throw createError("Report was not updated", 500);
        }

        const updated = getReportById(validReportId);

        return {
            success: true,
            message: "Medical report updated successfully",
            data: normalizeReport(updated),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to update medical report",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Delete report
 * @param {Object} payload
 * @param {number|string} payload.reportId
 * @returns {Object}
 */
export const removeMedicalReport = ({ reportId }) => {
    try {
        const validReportId = validateId(reportId, "Report ID");

        const existing = getReportById(validReportId);
        if (!existing) {
            throw createError("Report not found", 404);
        }

        const result = deleteReport(validReportId);

        if (!result || result.changes === 0) {
            throw createError("Report was not deleted", 500);
        }

        return {
            success: true,
            message: "Medical report deleted successfully",
            data: {
                reportId: validReportId,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to delete medical report",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Validate that a report belongs to a patient
 * Useful for controller-level access checks.
 * @param {Object} payload
 * @param {number|string} payload.reportId
 * @param {number|string} payload.patientId
 * @returns {Object}
 */
export const verifyReportOwnershipByPatientId = ({ reportId, patientId }) => {
    try {
        const validReportId = validateId(reportId, "Report ID");
        const validPatientId = validateStringId(patientId, "Patient ID");

        const report = getReportById(validReportId);

        if (!report) {
            throw createError("Report not found", 404);
        }

        if (String(report.patient_id) !== validPatientId) {
            throw createError("You are not authorized to access this report", 403);
        }

        return {
            success: true,
            message: "Report ownership verified successfully",
            data: normalizeReport(report),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to verify report ownership",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Validate report ownership using userId
 * Useful for logged-in patient flow.
 * @param {Object} payload
 * @param {number|string} payload.reportId
 * @param {number|string} payload.userId
 * @returns {Object}
 */
export const verifyReportOwnershipByUserId = ({ reportId, userId }) => {
    try {
        const validReportId = validateId(reportId, "Report ID");
        const validUserId = validateId(userId, "User ID");

        const patient = getPatientByUserId(validUserId);
        if (!patient) {
            throw createError("Patient profile not found", 404);
        }

        const report = getReportById(validReportId);
        if (!report) {
            throw createError("Report not found", 404);
        }

        if (String(report.patient_id) !== String(patient.patient_id)) {
            throw createError("You are not authorized to access this report", 403);
        }

        return {
            success: true,
            message: "Report ownership verified successfully",
            data: normalizeReport(report),
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to verify report ownership by user ID",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    createMedicalReport,
    getMedicalReportDetails,
    getPatientMedicalReports,
    getMedicalReportsByUserId,
    getAllMedicalReports,
    updateMedicalReport,
    removeMedicalReport,
    verifyReportOwnershipByPatientId,
    verifyReportOwnershipByUserId,
};
