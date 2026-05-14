import fs from "fs";

import { createMedicalReport } from "../services/report.service.js";
import { generateMedicalScanReportPdf } from "../services/pdf.service.js";
import { getPatientByUserId } from "../model/patient.model.js";
import { createError, sanitize, validateId, validateStringId } from "../utils/helper.js";

const PATH_LABS_BASE_URL =
    process.env.PATH_LABS_API_URL || "https://avinashmaharoliya-path-labs.hf.space";

const SCAN_ENDPOINTS = Object.freeze({
    ultrasound: {
        endpoint: "/ultrasound",
        label: "Ultrasound",
    },
    xray: {
        endpoint: "/xray",
        label: "X-Ray",
    },
    mri: {
        endpoint: "/mri2d-3d",
        label: "MRI 2D/3D",
    },
    ct: {
        endpoint: "/ct2d-3d",
        label: "CT 2D/3D",
    },
});

const prettifyKey = (key) =>
    String(key || "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

const stringifyValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
};

const findValueByKeys = (value, keys) => {
    if (!value || typeof value !== "object") return "";

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findValueByKeys(item, keys);
            if (found) return found;
        }
        return "";
    }

    for (const [key, nestedValue] of Object.entries(value)) {
        if (keys.includes(String(key).toLowerCase()) && nestedValue !== null && nestedValue !== undefined) {
            return stringifyValue(nestedValue);
        }
    }

    for (const nestedValue of Object.values(value)) {
        const found = findValueByKeys(nestedValue, keys);
        if (found) return found;
    }

    return "";
};

const normalizePrediction = (scanLabel, result) => {
    const condition =
        findValueByKeys(result, [
            "predicted_class",
            "prediction",
            "predicted_condition",
            "disease",
            "disease_name",
            "class",
            "label",
            "diagnosis",
            "result",
        ]) || `${scanLabel} Analysis`;

    const confidence = findValueByKeys(result, ["confidence", "confidence_percent", "score", "probability", "accuracy"]);
    const impression = findValueByKeys(result, ["impression", "summary", "description", "findings", "report"]);
    const recommendation = findValueByKeys(result, ["recommendation", "recommendations", "recommended_next_steps", "next_steps", "precautions", "advice"]);

    const summaryParts = [
        condition ? `Detected/Predicted: ${condition}` : "",
        confidence ? `Confidence: ${confidence}` : "",
        impression ? `Findings: ${impression}` : "",
        recommendation ? `Recommendation: ${recommendation}` : "",
    ].filter(Boolean);

    return {
        condition,
        confidence,
        impression,
        recommendation,
        summary: summaryParts.join("\n") || `${scanLabel} report generated from AI scan analysis.`,
    };
};

const resolvePatientId = (req) => {
    const bodyPatientId = req.body?.patientId || req.body?.patient_id;
    if (bodyPatientId) return validateStringId(bodyPatientId, "Patient ID");

    if (req.user?.role === "patient") {
        const patient = getPatientByUserId(req.user.id);
        if (patient?.patient_id) return patient.patient_id;
    }

    throw createError("Patient profile not found for this user", 404);
};

const callPathLabsApi = async (endpoint, file) => {
    const form = new FormData();
    const fileBuffer = fs.readFileSync(file.path);
    const blob = new Blob([fileBuffer], {
        type: file.mimetype || "application/octet-stream",
    });
    form.append("file", blob, file.originalname || "scan-file");

    const response = await fetch(`${PATH_LABS_BASE_URL}${endpoint}`, {
        method: "POST",
        body: form,
    });

    let result = null;
    try {
        result = await response.json();
    } catch {
        result = { responseText: await response.text().catch(() => "") };
    }

    if (!response.ok) {
        throw createError(
            result?.detail || result?.message || `Path Labs API failed with status ${response.status}`,
            response.status,
            result
        );
    }

    return result;
};

export const analyzeMedicalScan = async (req, res, next) => {
    try {
        if (!req.file) {
            throw createError("Scan file is required", 400);
        }

        const scanType = sanitize(req.body?.scanType || req.body?.type).toLowerCase();
        const config = SCAN_ENDPOINTS[scanType];
        if (!config) {
            throw createError(
                `Invalid scanType. Allowed values: ${Object.keys(SCAN_ENDPOINTS).join(", ")}`,
                400
            );
        }

        const patientId = resolvePatientId(req);

        const apiResult = await callPathLabsApi(config.endpoint, req.file);
        const prediction = normalizePrediction(config.label, apiResult);

        const pdfResult = await generateMedicalScanReportPdf({
            scanLabel: config.label,
            originalFileName: req.file.originalname || req.file.filename,
            prediction,
            result: apiResult,
            outputDir: "uploads/reports",
            fileName: `${scanType}-ai-report-${Date.now()}`,
        });

        const pdfUrl = `/uploads/reports/${pdfResult.data.fileName}`;
        const savedReport = createMedicalReport({
            patientId,
            title: `${config.label} AI Detection Report`,
            diagnosis: prediction.condition || config.label,
            summary: prediction.summary,
            pdfPath: pdfUrl,
        });

        return res.status(201).json({
            success: true,
            message: "Medical scan analyzed, PDF generated, and report saved",
            data: {
                scanType,
                scanLabel: config.label,
                prediction,
                rawResult: apiResult,
                pdfUrl,
                report: savedReport?.data || null,
            },
        });
    } catch (error) {
        console.error("Medical scan analysis error:", error);
        return next(
            createError(
                error.message || "Failed to analyze medical scan",
                error.statusCode || 500,
                error.details || null
            )
        );
    }
};
