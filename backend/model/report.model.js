import db from "../config/db.js";
import { createError, validateId, validateStringId } from "../utils/helper.js";

export const createReport = (patientId, title, diagnosis, summary, pdfPath) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");
        const normalizedTitle = typeof title === "string" ? title.trim() : "Medical Report";
        const normalizedDiagnosis = typeof diagnosis === "string" ? diagnosis.trim() : "";
        const normalizedSummary = typeof summary === "string" ? summary.trim() : "";
        const normalizedPdfPath = typeof pdfPath === "string" ? pdfPath.trim() : "";

        if (!normalizedDiagnosis) throw createError("Diagnosis is required", 400);
        if (!normalizedSummary) throw createError("Summary is required", 400);
        if (!normalizedPdfPath) throw createError("PDF path is required", 400);

        const stmt = db.prepare(`
            INSERT INTO reports (patient_id, title, diagnosis, summary, pdf_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        return stmt.run(validPatientId, normalizedTitle, normalizedDiagnosis, normalizedSummary, normalizedPdfPath);
    } catch (error) {
        throw createError(error.message || "Failed to create report", error.statusCode || 500);
    }
};

export const getReportsByPatientId = (patientId) => {
    try {
        const validPatientId = validateStringId(patientId, "Patient ID");

        const stmt = db.prepare(`
            SELECT *
            FROM reports
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `);

        return stmt.all(validPatientId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch patient reports", error.statusCode || 500);
    }
};

export const getReportById = (id) => {
    try {
        const reportId = validateId(id, "Report ID");

        const stmt = db.prepare(`
            SELECT *
            FROM reports
            WHERE id = ?
        `);

        return stmt.get(reportId);
    } catch (error) {
        throw createError(error.message || "Failed to fetch report", error.statusCode || 500);
    }
};

export const getAllReports = () => {
    try {
        const stmt = db.prepare(`
            SELECT r.*, u.name AS patient_name, u.email AS patient_email
            FROM reports r
            JOIN patients p ON r.patient_id = p.patient_id
            JOIN users u ON p.user_id = u.id
            ORDER BY r.created_at DESC
        `);

        return stmt.all();
    } catch (error) {
        throw createError(error.message || "Failed to fetch reports", error.statusCode || 500);
    }
};

export const updateReport = (id, diagnosis, summary, pdfPath) => {
    try {
        const reportId = validateId(id, "Report ID");
        const normalizedDiagnosis = typeof diagnosis === "string" && diagnosis.trim() ? diagnosis.trim() : null;
        const normalizedSummary = typeof summary === "string" && summary.trim() ? summary.trim() : null;
        const normalizedPdfPath = typeof pdfPath === "string" && pdfPath.trim() ? pdfPath.trim() : null;

        const stmt = db.prepare(`
            UPDATE reports
            SET diagnosis = COALESCE(?, diagnosis),
                summary = COALESCE(?, summary),
                pdf_url = COALESCE(?, pdf_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        return stmt.run(normalizedDiagnosis, normalizedSummary, normalizedPdfPath, reportId);
    } catch (error) {
        throw createError(error.message || "Failed to update report", error.statusCode || 500);
    }
};

export const deleteReport = (id) => {
    try {
        const reportId = validateId(id, "Report ID");

        const stmt = db.prepare(`
            DELETE FROM reports
            WHERE id = ?
        `);

        return stmt.run(reportId);
    } catch (error) {
        throw createError(error.message || "Failed to delete report", error.statusCode || 500);
    }
};
