import {
    createMedicalReport,
    getMedicalReportDetails,
    getPatientMedicalReports,
    getMedicalReportsByUserId,
    getAllMedicalReports,
    updateMedicalReport,
    removeMedicalReport,
    verifyReportOwnershipByPatientId,
    verifyReportOwnershipByUserId,
} from "../services/report.service.js";

import { createError, validateId } from "../utils/helper.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create new medical report
 */
export const createReport = async (req, res, next) => {
    try {
        const patientId = validateId(req.body?.patientId, "Patient ID");

        const diagnosis =
            typeof req.body?.diagnosis === "string" ? req.body.diagnosis.trim() : "";

        const summary =
            typeof req.body?.summary === "string" ? req.body.summary.trim() : "";

        const pdfPath =
            req.file?.path ||
            (typeof req.body?.pdfPath === "string" ? req.body.pdfPath.trim() : "");

        const result = await createMedicalReport({
            patientId,
            diagnosis,
            summary,
            pdfPath,
        });

        return res.status(201).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to create medical report",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get report details by report ID
 */
export const getReportById = async (req, res, next) => {
    try {
        const reportId = validateId(req.params?.reportId, "Report ID");

        const result = await getMedicalReportDetails({
            reportId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch medical report",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get reports for a patient by patient table ID
 */
export const getReportsByPatientId = async (req, res, next) => {
    try {
        const patientId = validateId(req.params?.patientId, "Patient ID");

        const result = await getPatientMedicalReports({
            patientId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch patient reports",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get logged-in patient's reports
 */
export const getMyReports = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const result = await getMedicalReportsByUserId({
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch my reports",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Get all reports
 * Useful for doctor/admin dashboards
 */
export const getAllReports = async (req, res, next) => {
    try {
        const result = await getAllMedicalReports();

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to fetch all reports",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Update report
 */
export const updateReport = async (req, res, next) => {
    try {
        const reportId = validateId(req.params?.reportId, "Report ID");

        const diagnosis =
            typeof req.body?.diagnosis === "string" && req.body.diagnosis.trim()
                ? req.body.diagnosis.trim()
                : null;

        const summary =
            typeof req.body?.summary === "string" && req.body.summary.trim()
                ? req.body.summary.trim()
                : null;

        const pdfPath =
            req.file?.path ||
            (typeof req.body?.pdfPath === "string" && req.body.pdfPath.trim()
                ? req.body.pdfPath.trim()
                : null);

        const result = await updateMedicalReport({
            reportId,
            diagnosis,
            summary,
            pdfPath,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to update report",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Delete report
 */
export const deleteReport = async (req, res, next) => {
    try {
        const reportId = validateId(req.params?.reportId, "Report ID");

        const result = await removeMedicalReport({
            reportId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to delete report",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Verify report ownership by patient ID
 */
export const verifyOwnershipByPatientId = async (req, res, next) => {
    try {
        const reportId = validateId(req.params?.reportId, "Report ID");
        const patientId = validateId(req.params?.patientId, "Patient ID");

        const result = await verifyReportOwnershipByPatientId({
            reportId,
            patientId,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to verify report ownership",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Verify report ownership for logged-in user
 */
export const verifyOwnershipByUser = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw createError("Unauthorized access", 401);
        }

        const reportId = validateId(req.params?.reportId, "Report ID");

        const result = await verifyReportOwnershipByUserId({
            reportId,
            userId: req.user.id,
        });

        return res.status(200).json(result);
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to verify report ownership by user",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};

/**
 * Generate PDF Report
 */
export const generateReportPDF = async (req, res, next) => {
    try {
        const { patientInfo, aiNurseSummary, skinResults, recommendations } = req.body;
        
        if (!patientInfo) {
            throw createError("Patient info is required", 400);
        }

        const doc = new PDFDocument({ margin: 50 });
        
        // Save to uploads folder temporarily
        const fileName = `report_${Date.now()}.pdf`;
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        
        const filePath = path.join(uploadsDir, fileName);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('Medical Report - Hospital Copilot', { align: 'center' });
        doc.moveDown();
        
        // Patient Info
        doc.fontSize(16).text('Patient Information', { underline: true });
        doc.fontSize(12).text(`Name: ${patientInfo.name || 'N/A'}`);
        doc.text(`Age/Gender: ${patientInfo.age || 'N/A'} / ${patientInfo.gender || 'N/A'}`);
        doc.text(`Blood Group: ${patientInfo.blood_group || 'N/A'}`);
        doc.moveDown();

        // AI Nurse Summary
        if (aiNurseSummary) {
            doc.fontSize(16).text('AI Nurse Summary', { underline: true });
            doc.fontSize(12).text(aiNurseSummary);
            doc.moveDown();
        }

        // Skin Results
        if (skinResults) {
            doc.fontSize(16).text('Skin Disease Detection Results', { underline: true });
            doc.fontSize(12).text(`Predicted Class: ${skinResults.predicted_class}`);
            doc.text(`Confidence: ${(skinResults.confidence * 100).toFixed(2)}%`);
            doc.text(`Description: ${skinResults.description}`);
            doc.text(`Precautions: ${skinResults.precautions}`);
            doc.moveDown();
        }

        // Recommendations
        if (recommendations) {
            doc.fontSize(16).text('Recommendations', { underline: true });
            doc.fontSize(12).text(recommendations);
            doc.moveDown();
        }

        doc.fontSize(10).text('Disclaimer: This report is partially generated by AI and is not a substitute for professional medical advice.', { align: 'center', color: 'grey' });

        doc.end();

        stream.on('finish', () => {
            return res.status(200).json({
                success: true,
                pdfUrl: `/uploads/${fileName}`
            });
        });
        
    } catch (error) {
        return next(
            createError(
                error.message || "Failed to generate report PDF",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};