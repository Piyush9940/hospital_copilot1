import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { createError, sanitize, formatDateTime } from "../utils/helper.js";

const DEFAULT_OUTPUT_DIR = "uploads/reports";

/**
 * Ensure directory exists
 */
const ensureDirectoryExists = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    } catch (error) {
        throw createError(`Failed to create directory: ${dirPath}`, 500);
    }
};

/**
 * Create safe filename
 */
const createSafeFilename = (prefix = "report") => {
    const safePrefix =
        typeof prefix === "string" && prefix.trim()
            ? prefix.trim().toLowerCase().replace(/[^a-z0-9-_]/gi, "-")
            : "report";

    return `${safePrefix}-${Date.now()}.pdf`;
};

/**
 * Resolve output path
 */
const resolveOutputPath = (outputDir = DEFAULT_OUTPUT_DIR, fileName = null) => {
    const safeDir =
        typeof outputDir === "string" && outputDir.trim()
            ? outputDir.trim()
            : DEFAULT_OUTPUT_DIR;

    ensureDirectoryExists(safeDir);

    const finalFileName = fileName && typeof fileName === "string" && fileName.trim()
        ? fileName.trim().endsWith(".pdf")
            ? fileName.trim()
            : `${fileName.trim()}.pdf`
        : createSafeFilename("report");

    return {
        directory: safeDir,
        fileName: finalFileName,
        fullPath: path.join(safeDir, finalFileName),
    };
};

/**
 * Write key-value rows into PDF
 */
const writeKeyValueRows = (doc, rows = []) => {
    rows.forEach((row) => {
        if (!row || typeof row !== "object") return;

        const label = row.label ? String(row.label) : "";
        const value =
            row.value !== undefined && row.value !== null && String(row.value).trim()
                ? String(row.value)
                : "N/A";

        doc
            .font("Helvetica-Bold")
            .text(`${label}: `, { continued: true })
            .font("Helvetica")
            .text(value);

        doc.moveDown(0.5);
    });
};

const stringifyPdfValue = (value) => {
    if (value === undefined || value === null || value === "") return "N/A";
    if (Array.isArray(value)) return value.filter(Boolean).map(stringifyPdfValue).join("\n");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
};

const normalizePdfList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(stringifyPdfValue);
    if (typeof value === "object") {
        return Object.entries(value).map(([key, item]) => `${key}: ${stringifyPdfValue(item)}`);
    }
    return String(value)
        .split(/\r?\n|;/)
        .map((item) => item.trim())
        .filter(Boolean);
};

const ensureSpace = (doc, height = 80) => {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
    }
};

const drawSectionHeading = (doc, title) => {
    ensureSpace(doc, 58);
    doc.moveDown(0.7);
    doc
        .fillColor("#0f766e")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(String(title).toUpperCase(), { characterSpacing: 0.3 });
    doc
        .moveTo(doc.page.margins.left, doc.y + 5)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y + 5)
        .strokeColor("#99f6e4")
        .lineWidth(1)
        .stroke();
    doc.moveDown(0.85);
};

const drawInfoGrid = (doc, rows = []) => {
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const gap = 16;
    const colWidth = (contentWidth - gap) / 2;

    rows.forEach((row, index) => {
        if (index % 2 === 0) ensureSpace(doc, 52);
        const x = doc.page.margins.left + (index % 2) * (colWidth + gap);
        const y = doc.y;

        doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7.8).text(String(row.label || "").toUpperCase(), x, y, { width: colWidth });
        doc.fillColor("#111827").font("Helvetica").fontSize(10.2).text(stringifyPdfValue(row.value), x, y + 13, { width: colWidth, lineGap: 2 });

        if (index % 2 === 1 || index === rows.length - 1) {
            doc.y = Math.max(doc.y, y + 42);
        }
    });
};

const drawParagraph = (doc, value) => {
    ensureSpace(doc, 70);
    doc.fillColor("#1f2937").font("Helvetica").fontSize(10.3).text(stringifyPdfValue(value), {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        lineGap: 4,
        align: "justify",
    });
};

const drawBulletList = (doc, value) => {
    const items = normalizePdfList(value);
    if (!items.length) {
        drawParagraph(doc, "N/A");
        return;
    }

    items.forEach((item) => {
        ensureSpace(doc, 34);
        const y = doc.y;
        doc.fillColor("#0f766e").font("Helvetica-Bold").fontSize(10).text("-", doc.page.margins.left, y);
        doc.fillColor("#1f2937").font("Helvetica").fontSize(10.2).text(item, doc.page.margins.left + 14, y, {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 14,
            lineGap: 3,
        });
        doc.moveDown(0.25);
    });
};

const drawFooterPages = (doc) => {
    const range = doc.bufferedPageRange();
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.fillColor("#94a3b8").font("Helvetica").fontSize(8).text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 34, {
            width: contentWidth,
            align: "right",
        });
    }
};

/**
 * Finalize PDF and return promise
 */
const finalizePdf = (doc, fullPath) => {
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(fullPath);

        stream.on("finish", () => {
            try {
                const stats = fs.statSync(fullPath);

                resolve({
                    success: true,
                    path: fullPath,
                    size: stats.size,
                });
            } catch (error) {
                reject(createError("PDF was created but file stats could not be read", 500));
            }
        });

        stream.on("error", (error) => {
            reject(createError(`Failed to write PDF file: ${error.message}`, 500));
        });

        doc.pipe(stream);
        doc.end();
    });
};

/**
 * Generate generic PDF
 * @param {Object} payload
 * @param {string} payload.title
 * @param {Array<{label:string,value:any}>} [payload.rows]
 * @param {string} [payload.description]
 * @param {string} [payload.outputDir]
 * @param {string} [payload.fileName]
 * @returns {Promise<Object>}
 */
export const generateGenericPdf = async ({
    title,
    rows = [],
    description = "",
    outputDir = DEFAULT_OUTPUT_DIR,
    fileName = null,
}) => {
    try {
        const normalizedTitle = sanitize(title);
        const normalizedDescription =
            typeof description === "string" ? description.trim() : "";

        if (!normalizedTitle) {
            throw createError("PDF title is required", 400);
        }

        if (!Array.isArray(rows)) {
            throw createError("rows must be an array", 400);
        }

        const { fullPath, fileName: finalFileName } = resolveOutputPath(outputDir, fileName);

        const doc = new PDFDocument({
            margin: 50,
            size: "A4",
        });

        doc.fontSize(20).font("Helvetica-Bold").text(normalizedTitle, {
            align: "center",
        });

        doc.moveDown();

        doc.fontSize(10).font("Helvetica").text(`Generated at: ${formatDateTime(new Date())}`, {
            align: "right",
        });

        doc.moveDown();

        if (normalizedDescription) {
            doc.fontSize(12).font("Helvetica").text(normalizedDescription);
            doc.moveDown();
        }

        writeKeyValueRows(doc, rows);

        const result = await finalizePdf(doc, fullPath);

        return {
            success: true,
            message: "PDF generated successfully",
            data: {
                fileName: finalFileName,
                filePath: result.path,
                fileSize: result.size,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to generate PDF",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Generate medical report PDF
 * @param {Object} payload
 * @param {string} payload.patientName
 * @param {string} payload.diagnosis
 * @param {string} payload.summary
 * @param {string} [payload.doctorName]
 * @param {string} [payload.reportDate]
 * @param {string} [payload.outputDir]
 * @returns {Promise<Object>}
 */
export const generateMedicalReportPdf = async ({
    patientName,
    diagnosis,
    summary,
    doctorName = "",
    reportDate = "",
    outputDir = DEFAULT_OUTPUT_DIR,
}) => {
    try {
        const normalizedPatientName = sanitize(patientName);
        const normalizedDiagnosis = sanitize(diagnosis);
        const normalizedSummary = typeof summary === "string" ? summary.trim() : "";
        const normalizedDoctorName = sanitize(doctorName);
        const normalizedReportDate = sanitize(reportDate) || formatDateTime(new Date());

        if (!normalizedPatientName) {
            throw createError("Patient name is required", 400);
        }

        if (!normalizedDiagnosis) {
            throw createError("Diagnosis is required", 400);
        }

        if (!normalizedSummary) {
            throw createError("Summary is required", 400);
        }

        return await generateGenericPdf({
            title: "Medical Report",
            description: "Hospital Copilot System Generated Report",
            rows: [
                { label: "Patient Name", value: normalizedPatientName },
                { label: "Doctor Name", value: normalizedDoctorName || "N/A" },
                { label: "Report Date", value: normalizedReportDate },
                { label: "Diagnosis", value: normalizedDiagnosis },
                { label: "Summary", value: normalizedSummary },
            ],
            outputDir,
            fileName: `medical-report-${normalizedPatientName.replace(/\s+/g, "-").toLowerCase()}`,
        });
    } catch (error) {
        throw createError(
            error.message || "Failed to generate medical report PDF",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Generate appointment summary PDF
 * @param {Object} payload
 * @param {string} payload.patientName
 * @param {string} payload.doctorName
 * @param {string} payload.appointmentCode
 * @param {string} payload.appointmentDate
 * @param {string} payload.appointmentTime
 * @param {string} [payload.consultationType]
 * @param {string} [payload.symptoms]
 * @param {string} [payload.outputDir]
 * @returns {Promise<Object>}
 */
export const generateAppointmentSummaryPdf = async ({
    patientName,
    doctorName,
    appointmentCode,
    appointmentDate,
    appointmentTime,
    consultationType = "video",
    symptoms = "",
    outputDir = DEFAULT_OUTPUT_DIR,
}) => {
    try {
        const normalizedPatientName = sanitize(patientName);
        const normalizedDoctorName = sanitize(doctorName);
        const normalizedAppointmentCode = sanitize(appointmentCode);
        const normalizedAppointmentDate = sanitize(appointmentDate);
        const normalizedAppointmentTime = sanitize(appointmentTime);
        const normalizedConsultationType = sanitize(consultationType || "video");
        const normalizedSymptoms = typeof symptoms === "string" ? symptoms.trim() : "";

        if (!normalizedPatientName) throw createError("Patient name is required", 400);
        if (!normalizedDoctorName) throw createError("Doctor name is required", 400);
        if (!normalizedAppointmentCode) throw createError("Appointment code is required", 400);
        if (!normalizedAppointmentDate) throw createError("Appointment date is required", 400);
        if (!normalizedAppointmentTime) throw createError("Appointment time is required", 400);

        return await generateGenericPdf({
            title: "Appointment Summary",
            description: "Hospital Copilot Appointment Details",
            rows: [
                { label: "Patient Name", value: normalizedPatientName },
                { label: "Doctor Name", value: normalizedDoctorName },
                { label: "Appointment Code", value: normalizedAppointmentCode },
                { label: "Appointment Date", value: normalizedAppointmentDate },
                { label: "Appointment Time", value: normalizedAppointmentTime },
                { label: "Consultation Type", value: normalizedConsultationType },
                { label: "Symptoms", value: normalizedSymptoms || "N/A" },
            ],
            outputDir,
            fileName: `appointment-${normalizedAppointmentCode.toLowerCase()}`,
        });
    } catch (error) {
        throw createError(
            error.message || "Failed to generate appointment summary PDF",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Generate vital summary PDF
 * @param {Object} payload
 * @param {string} payload.patientName
 * @param {number|string} payload.heartRate
 * @param {number|string} payload.spo2
 * @param {string} payload.bp
 * @param {number|string} payload.temperature
 * @param {string} payload.status
 * @param {string} [payload.outputDir]
 * @returns {Promise<Object>}
 */
export const generateVitalSummaryPdf = async ({
    patientName,
    heartRate,
    spo2,
    bp,
    temperature,
    status,
    outputDir = DEFAULT_OUTPUT_DIR,
}) => {
    try {
        const normalizedPatientName = sanitize(patientName);
        const normalizedBp = sanitize(bp);
        const normalizedStatus = sanitize(status);

        const validHeartRate = Number(heartRate);
        const validSpo2 = Number(spo2);
        const validTemperature = Number(temperature);

        if (!normalizedPatientName) throw createError("Patient name is required", 400);
        if (!Number.isFinite(validHeartRate) || validHeartRate <= 0) {
            throw createError("Valid heart rate is required", 400);
        }
        if (!Number.isFinite(validSpo2) || validSpo2 <= 0) {
            throw createError("Valid SpO2 is required", 400);
        }
        if (!normalizedBp) throw createError("Blood pressure is required", 400);
        if (!Number.isFinite(validTemperature) || validTemperature <= 0) {
            throw createError("Valid temperature is required", 400);
        }
        if (!normalizedStatus) throw createError("Vital status is required", 400);

        return await generateGenericPdf({
            title: "Vital Summary Report",
            description: "Hospital Copilot Patient Vitals",
            rows: [
                { label: "Patient Name", value: normalizedPatientName },
                { label: "Heart Rate", value: validHeartRate },
                { label: "SpO2", value: validSpo2 },
                { label: "Blood Pressure", value: normalizedBp },
                { label: "Temperature", value: validTemperature },
                { label: "Status", value: normalizedStatus },
            ],
            outputDir,
            fileName: `vitals-${normalizedPatientName.replace(/\s+/g, "-").toLowerCase()}`,
        });
    } catch (error) {
        throw createError(
            error.message || "Failed to generate vital summary PDF",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export const generateMedicalScanReportPdf = async ({
    scanLabel,
    originalFileName = "",
    prediction = {},
    result = {},
    outputDir = DEFAULT_OUTPUT_DIR,
    fileName = null,
}) => {
    try {
        const normalizedScanLabel = sanitize(scanLabel);
        if (!normalizedScanLabel) throw createError("Scan label is required", 400);

        const { fullPath, fileName: finalFileName } = resolveOutputPath(outputDir, fileName);
        const doc = new PDFDocument({
            margin: 54,
            size: "A4",
            bufferPages: true,
            info: {
                Title: `${normalizedScanLabel} AI Detection Report`,
                Author: "Hospital Copilot",
                Subject: "AI medical scan analysis",
            },
        });

        const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        doc.rect(0, 0, doc.page.width, 98).fill("#0f766e");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(21).text(`${normalizedScanLabel} AI Detection Report`, doc.page.margins.left, 28, {
            width: contentWidth,
        });
        doc.font("Helvetica").fontSize(10).text("Hospital Copilot scan analysis summary", doc.page.margins.left, 58, {
            width: contentWidth,
        });
        doc.fontSize(8.5).text(`Generated: ${formatDateTime(new Date())}`, doc.page.margins.left, 76, {
            width: contentWidth,
            align: "right",
        });
        doc.y = 122;

        drawSectionHeading(doc, "Scan Overview");
        drawInfoGrid(doc, [
            { label: "Scan Type", value: normalizedScanLabel },
            { label: "Uploaded File", value: originalFileName || "N/A" },
            { label: "Detected / Predicted", value: prediction.condition || `${normalizedScanLabel} Analysis` },
            { label: "Confidence", value: prediction.confidence || "N/A" },
        ]);

        drawSectionHeading(doc, "Findings");
        drawParagraph(doc, prediction.impression || prediction.summary || "No detailed findings were returned by the scan service.");

        drawSectionHeading(doc, "Recommendations");
        drawBulletList(doc, prediction.recommendation || "Review this AI-assisted result with a qualified clinician.");

        if (result && typeof result === "object") {
            const compactRows = Object.entries(result)
                .filter(([key]) => !["image", "file", "raw", "base64"].includes(String(key).toLowerCase()))
                .slice(0, 10)
                .map(([key, value]) => ({
                    label: key.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
                    value,
                }));

            if (compactRows.length) {
                drawSectionHeading(doc, "Structured AI Output");
                drawInfoGrid(doc, compactRows);
            }

            drawSectionHeading(doc, "Raw JSON Appendix");
            doc.font("Courier").fontSize(8.2).fillColor("#334155").text(JSON.stringify(result, null, 2), {
                width: contentWidth,
                lineGap: 2,
            });
        }

        ensureSpace(doc, 76);
        doc.moveDown(1);
        const boxY = doc.y;
        doc.roundedRect(doc.page.margins.left, boxY, contentWidth, 52, 6).fillAndStroke("#f8fafc", "#e2e8f0");
        doc.fillColor("#475569").font("Helvetica").fontSize(8.8).text(
            "Disclaimer: This PDF is generated from AI scan output and should be treated as a preliminary aid only. A qualified doctor must review the scan and clinical context before diagnosis or treatment.",
            doc.page.margins.left + 14,
            boxY + 13,
            { width: contentWidth - 28, lineGap: 2 }
        );

        drawFooterPages(doc);
        const resultData = await finalizePdf(doc, fullPath);

        return {
            success: true,
            message: "Medical scan PDF generated successfully",
            data: {
                fileName: finalFileName,
                filePath: resultData.path,
                fileSize: resultData.size,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to generate medical scan PDF",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    generateGenericPdf,
    generateMedicalReportPdf,
    generateAppointmentSummaryPdf,
    generateVitalSummaryPdf,
    generateMedicalScanReportPdf,
};
