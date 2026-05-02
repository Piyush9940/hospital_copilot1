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

export default {
    generateGenericPdf,
    generateMedicalReportPdf,
    generateAppointmentSummaryPdf,
    generateVitalSummaryPdf,
};