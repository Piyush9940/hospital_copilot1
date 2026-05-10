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

import { createError, validateId, validateStringId, formatDateTime } from "../utils/helper.js";
import { getPatientByUserId } from "../model/patient.model.js";
import { getAllDoctors, getDoctorByUserId } from "../model/doctor.model.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toUploadUrl = (filePath) => {
    const uploadRoot = path.resolve(__dirname, "../uploads");
    const relativePath = path.relative(uploadRoot, filePath).split(path.sep).join("/");
    return `/uploads/${relativePath}`;
};

const ensureUploadsDir = () => {
    const uploadsDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return uploadsDir;
};

const resolveReportDoctorId = (req) => {
    if (req.body?.doctorId) {
        return validateId(req.body.doctorId, "Doctor ID");
    }

    if (req.user?.role === "doctor") {
        const doctor = getDoctorByUserId(req.user.id);
        if (doctor?.id) return doctor.id;
    }

    const [firstDoctor] = getAllDoctors() || [];
    if (!firstDoctor?.id) {
        throw createError("A doctor profile is required before uploading reports", 400);
    }

    return firstDoctor.id;
};

const safeText = (value, fallback = "N/A") => {
    if (value === undefined || value === null) return fallback;
    if (Array.isArray(value)) return value.filter(Boolean).join(", ") || fallback;
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    const text = String(value).trim();
    return text || fallback;
};

const formatLabel = (key = "") => {
    return String(key)
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
    if (typeof value === "string") {
        return value
            .split(/\r?\n|;/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    if (typeof value === "object") {
        return Object.entries(value).map(([key, item]) => `${formatLabel(key)}: ${safeText(item)}`);
    }
    return [value];
};

const ensurePdfSpace = (doc, requiredHeight = 90) => {
    if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
    }
};

const writeSectionTitle = (doc, title) => {
    ensurePdfSpace(doc, 70);
    doc.moveDown(0.9);
    doc
        .fillColor("#0f766e")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(title.toUpperCase(), { characterSpacing: 0.4 });
    doc
        .moveTo(doc.page.margins.left, doc.y + 4)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
        .strokeColor("#ccfbf1")
        .lineWidth(1)
        .stroke();
    doc.moveDown(0.8);
};

const writeKeyValueGrid = (doc, rows = []) => {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const gap = 18;
    const colWidth = (pageWidth - gap) / 2;

    rows.forEach((row, index) => {
        if (index % 2 === 0) ensurePdfSpace(doc, 54);

        const x = doc.page.margins.left + (index % 2) * (colWidth + gap);
        const y = doc.y;

        doc
            .fillColor("#64748b")
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(row.label.toUpperCase(), x, y, { width: colWidth });
        doc
            .fillColor("#111827")
            .font("Helvetica")
            .fontSize(10.5)
            .text(safeText(row.value), x, y + 13, { width: colWidth, lineGap: 2 });

        if (index % 2 === 1 || index === rows.length - 1) {
            doc.y = Math.max(doc.y, y + 44);
        }
    });
};

const writeParagraph = (doc, text) => {
    ensurePdfSpace(doc, 80);
    doc
        .fillColor("#1f2937")
        .font("Helvetica")
        .fontSize(10.5)
        .text(safeText(text, "No information provided."), {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
            align: "justify",
            lineGap: 4,
        });
};

const writeBulletList = (doc, items = []) => {
    const normalized = normalizeList(items);
    if (!normalized.length) {
        writeParagraph(doc, "No information provided.");
        return;
    }

    normalized.forEach((item) => {
        ensurePdfSpace(doc, 36);
        const x = doc.page.margins.left;
        const y = doc.y;

        doc.fillColor("#0f766e").font("Helvetica-Bold").fontSize(10).text("-", x, y);
        doc
            .fillColor("#1f2937")
            .font("Helvetica")
            .fontSize(10.5)
            .text(safeText(item), x + 14, y, {
                width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 14,
                lineGap: 3,
            });
        doc.moveDown(0.35);
    });
};

const writeObjectRows = (doc, value) => {
    if (!value || typeof value !== "object") {
        writeParagraph(doc, value);
        return;
    }

    const rows = Object.entries(value).map(([key, item]) => ({
        label: formatLabel(key),
        value: safeText(item),
    }));
    writeKeyValueGrid(doc, rows);
};

const writeGeneratedReportPdf = ({
    patientId,
    patientName,
    title = "Medical Report",
    diagnosis = "Medical Report",
    summary = "No summary provided.",
    prescription = "",
    notes = "",
}) => {
    const uploadsDir = ensureUploadsDir();
    const fileName = `report_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({
        margin: 54,
        size: "A4",
        info: {
            Title: title,
            Author: "Hospital Copilot",
            Subject: "Medical report",
        },
    });

    doc.pipe(fs.createWriteStream(filePath));

    doc
        .fillColor("#0f766e")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text(title, { align: "left" });
    doc.moveDown(0.8);

    writeKeyValueGrid(doc, [
        { label: "Patient ID", value: patientId },
        { label: "Patient Name", value: patientName || "N/A" },
        { label: "Generated At", value: formatDateTime(new Date()) },
        { label: "Diagnosis", value: diagnosis },
    ]);

    writeSectionTitle(doc, "Clinical Summary");
    writeParagraph(doc, summary);

    if (prescription) {
        writeSectionTitle(doc, "Prescription / Treatment");
        writeParagraph(doc, prescription);
    }

    if (notes) {
        writeSectionTitle(doc, "Clinical Notes");
        writeParagraph(doc, notes);
    }

    doc.end();

    return `/uploads/${fileName}`;
};

/**
 * Create new medical report
 */
export const createReport = async (req, res, next) => {
    try {
        let patientId = req.body?.patientId || req.body?.patient_id;
        if (!patientId && req.user?.role === 'patient') {
            const p = getPatientByUserId(req.user.id);
            if (p) patientId = p.patient_id;
        }

        const validPatientId = validateStringId(patientId, "Patient ID");
        const doctorId = resolveReportDoctorId(req);
        const title = typeof req.body?.title === "string" && req.body.title.trim() ? req.body.title.trim() : "Medical Report";

        const diagnosis =
            typeof req.body?.diagnosis === "string" && req.body.diagnosis.trim() ? req.body.diagnosis.trim() : "Self Upload";

        const summary =
            typeof req.body?.summary === "string" && req.body.summary.trim() ? req.body.summary.trim() : "Self Uploaded Report";

        let pdfPath = typeof req.body?.pdfPath === "string" ? req.body.pdfPath.trim() : "";
        if (req.file) {
            pdfPath = toUploadUrl(req.file.path);
        }
        if (!pdfPath) {
            pdfPath = writeGeneratedReportPdf({
                patientId: validPatientId,
                patientName: req.body?.patientName || req.body?.patient_name,
                title,
                diagnosis,
                summary,
                prescription: req.body?.prescription,
                notes: req.body?.notes,
            });
        }

        const result = await createMedicalReport({
            patientId: validPatientId,
            doctorId,
            title,
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
        const patientId = validateStringId(req.params?.patientId, "Patient ID");

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
            (req.file ? toUploadUrl(req.file.path) : null) ||
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
        const patientId = validateStringId(req.params?.patientId, "Patient ID");

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
        const {
            patientInfo,
            aiNurseSummary,
            skinResults,
            recommendations,
            vitals,
            diagnosis,
            summary,
            medications,
            followUp,
            notes,
        } = req.body;
        
        if (!patientInfo) {
            throw createError("Patient info is required", 400);
        }

        const doc = new PDFDocument({
            margin: 54,
            size: "A4",
            bufferPages: true,
            info: {
                Title: "Medical Report - Hospital Copilot",
                Author: "Hospital Copilot",
                Subject: "AI assisted medical report",
            },
        });
        
        const fileName = `report_${Date.now()}.pdf`;
        const uploadsDir = ensureUploadsDir();
        
        const filePath = path.join(uploadsDir, fileName);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const generatedAt = formatDateTime(new Date());
        const patientName = patientInfo.name || patientInfo.patientName || patientInfo.fullName;
        const bloodGroup = patientInfo.bloodGroup || patientInfo.blood_group;
        const patientRows = [
            { label: "Patient Name", value: patientName },
            { label: "Age / Gender", value: `${safeText(patientInfo.age)} / ${safeText(patientInfo.gender)}` },
            { label: "Blood Group", value: bloodGroup },
            { label: "Patient ID", value: patientInfo.patientId || patientInfo.patient_id || patientInfo.id },
            { label: "Phone", value: patientInfo.phone },
            { label: "Generated At", value: generatedAt },
        ];

        doc.rect(0, 0, doc.page.width, 96).fill("#0f766e");
        doc
            .fillColor("#ffffff")
            .font("Helvetica-Bold")
            .fontSize(22)
            .text("Medical Report", doc.page.margins.left, 28, { width: pageWidth });
        doc
            .font("Helvetica")
            .fontSize(10.5)
            .text("Hospital Copilot AI Assisted Clinical Summary", doc.page.margins.left, 58, { width: pageWidth });
        doc
            .fontSize(9)
            .text(`Report ID: ${fileName.replace(".pdf", "")}`, doc.page.margins.left, 74, {
                width: pageWidth,
                align: "right",
            });
        doc.y = 120;

        writeSectionTitle(doc, "Patient Information");
        writeKeyValueGrid(doc, patientRows);

        if (summary || diagnosis) {
            writeSectionTitle(doc, "Clinical Summary");
            if (diagnosis) {
                writeKeyValueGrid(doc, [{ label: "Diagnosis", value: diagnosis }]);
                doc.moveDown(0.3);
            }
            if (summary) writeParagraph(doc, summary);
        }

        if (aiNurseSummary) {
            writeSectionTitle(doc, "AI Nurse Summary");
            writeParagraph(doc, aiNurseSummary);
        }

        if (vitals) {
            writeSectionTitle(doc, "Vitals");
            writeObjectRows(doc, vitals);
        }

        if (skinResults) {
            const confidence = Number(skinResults.confidence);
            const confidenceText = Number.isFinite(confidence)
                ? `${(confidence <= 1 ? confidence * 100 : confidence).toFixed(2)}%`
                : skinResults.confidence;

            writeSectionTitle(doc, "Skin Detection Results");
            writeKeyValueGrid(doc, [
                { label: "Predicted Class", value: skinResults.predicted_class || skinResults.predictedClass },
                { label: "Confidence", value: confidenceText },
            ]);

            if (skinResults.description) {
                doc.moveDown(0.4);
                writeParagraph(doc, skinResults.description);
            }

            if (skinResults.precautions) {
                writeSectionTitle(doc, "Precautions");
                writeBulletList(doc, skinResults.precautions);
            }
        }

        if (recommendations) {
            writeSectionTitle(doc, "Recommendations");
            writeBulletList(doc, recommendations);
        }

        if (medications) {
            writeSectionTitle(doc, "Medication Notes");
            writeBulletList(doc, medications);
        }

        if (followUp || notes) {
            writeSectionTitle(doc, "Follow Up");
            if (followUp) writeParagraph(doc, followUp);
            if (notes) {
                doc.moveDown(0.4);
                writeParagraph(doc, notes);
            }
        }

        ensurePdfSpace(doc, 80);
        doc.moveDown(1.2);
        doc
            .roundedRect(doc.page.margins.left, doc.y, pageWidth, 48, 6)
            .fillAndStroke("#f8fafc", "#e2e8f0");
        doc
            .fillColor("#475569")
            .font("Helvetica")
            .fontSize(8.8)
            .text(
                "Disclaimer: This report may include AI generated assistance and is not a substitute for professional medical advice, diagnosis, or treatment. Please consult a qualified clinician for medical decisions.",
                doc.page.margins.left + 14,
                doc.y + 12,
                { width: pageWidth - 28, lineGap: 2 }
            );

        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i += 1) {
            doc.switchToPage(i);
            doc
                .fillColor("#94a3b8")
                .font("Helvetica")
                .fontSize(8)
                .text(
                    `Page ${i + 1} of ${range.count}`,
                    doc.page.margins.left,
                    doc.page.height - 34,
                    { width: pageWidth, align: "right" }
                );
        }

        doc.end();

        stream.on("error", (error) => {
            return next(createError(`Failed to write report PDF: ${error.message}`, 500));
        });

        stream.on('finish', async () => {
            let savedReport = null;
            const patientId =
                patientInfo.patientId ||
                patientInfo.patient_id ||
                req.body?.patientId ||
                req.body?.patient_id;

            if (patientId) {
                try {
                    const doctorId = resolveReportDoctorId(req);
                    const saveResult = await createMedicalReport({
                        patientId,
                        doctorId,
                        title: diagnosis || "Generated Medical Report",
                        diagnosis: diagnosis || "Generated Report",
                        summary: summary || aiNurseSummary || notes || "Generated medical report",
                        pdfPath: `/uploads/${fileName}`,
                    });
                    savedReport = saveResult?.data || null;
                } catch (saveError) {
                    console.error("Generated report PDF was created but could not be saved:", saveError.message);
                }
            }

            return res.status(200).json({
                success: true,
                message: "Report PDF generated successfully",
                pdfUrl: `/uploads/${fileName}`,
                data: {
                    fileName,
                    filePath: `/uploads/${fileName}`,
                    report: savedReport,
                },
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
