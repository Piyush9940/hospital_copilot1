import * as emergencyModel from "../model/emergencySystemModel.js";
import { getReportsByPatientId } from "../model/report.model.js";
import { findNearestHospitals } from "../services/hospitalFinder.js";
import { notifyDoctorsOfEmergency } from "../services/notificationService.js";
import { createError } from "../utils/helper.js";

const normalizeText = (value) =>
    typeof value === "string" && value.trim() ? value.trim() : "";

const buildReportHighlights = (reports = [], patientData = {}) => {
    const safeReports = Array.isArray(reports) ? reports : [];
    const highlights = [];

    const allergies = normalizeText(patientData.allergies);
    const medications = normalizeText(patientData.medications);
    const history = normalizeText(patientData.history);

    if (history) highlights.push(`Known history: ${history}`);
    if (allergies) highlights.push(`Allergies: ${allergies}`);
    if (medications) highlights.push(`Current medications: ${medications}`);

    if (!safeReports.length) {
        highlights.push("No previous medical reports are stored for this patient.");
        return highlights;
    }

    highlights.push(`${safeReports.length} previous report(s) available.`);
    safeReports.slice(0, 5).forEach((report, index) => {
        const title = normalizeText(report.title) || normalizeText(report.diagnosis) || `Report ${index + 1}`;
        const diagnosis = normalizeText(report.diagnosis);
        const summary = normalizeText(report.summary);
        const date = normalizeText(report.created_at) || normalizeText(report.createdAt);
        const pieces = [title];

        if (diagnosis && diagnosis !== title) pieces.push(`diagnosis: ${diagnosis}`);
        if (summary) pieces.push(`summary: ${summary}`);
        if (date) pieces.push(`date: ${date}`);

        highlights.push(pieces.join(" | "));
    });

    return highlights;
};

const buildFallbackRagAnswer = (question, patientData = {}, highlights = []) => {
    const q = normalizeText(question).toLowerCase();
    const lines = [];

    if (q.includes("allerg")) {
        lines.push(`Allergies: ${normalizeText(patientData.allergies) || "Information not available in patient profile."}`);
    } else if (q.includes("medication") || q.includes("medicine") || q.includes("drug")) {
        lines.push(`Medications: ${normalizeText(patientData.medications) || "Information not available in patient profile."}`);
    } else if (q.includes("history") || q.includes("condition")) {
        lines.push(`Medical history: ${normalizeText(patientData.history) || "Information not available in patient profile."}`);
    } else if (q.includes("report") || q.includes("test") || q.includes("diagnosis") || q.includes("summary")) {
        lines.push("Report highlights:");
        highlights.forEach((item) => lines.push(`- ${item}`));
    } else {
        lines.push("Patient context highlights:");
        highlights.forEach((item) => lines.push(`- ${item}`));
    }

    return lines.join("\n");
};

const buildFallbackReportSummary = (reports = [], patientData = {}) => {
    const safeReports = Array.isArray(reports) ? reports : [];
    const lines = [
        `Reports reviewed: ${safeReports.length}`,
        "",
        "Overall summary:",
    ];

    if (!safeReports.length) {
        lines.push("- No previous medical reports are stored for this patient.");
    } else {
        safeReports.slice(0, 10).forEach((report, index) => {
            const title = normalizeText(report.title) || normalizeText(report.diagnosis) || `Report ${index + 1}`;
            const diagnosis = normalizeText(report.diagnosis) || "Diagnosis not stated";
            const summary = normalizeText(report.summary) || "No stored summary available";
            lines.push(`- ${title}: ${diagnosis}. ${summary}`);
        });
    }

    const allergies = normalizeText(patientData.allergies);
    const medications = normalizeText(patientData.medications);
    const history = normalizeText(patientData.history);

    lines.push("");
    lines.push("Emergency-relevant context:");
    lines.push(`- History: ${history || "Information not available"}`);
    lines.push(`- Allergies: ${allergies || "Information not available"}`);
    lines.push(`- Medications: ${medications || "Information not available"}`);
    lines.push("");
    lines.push("Note: AI service was unavailable, so this is a local summary from stored report metadata.");

    return lines.join("\n");
};

const normalizeReportForAi = (report) => ({
    id: report.id || null,
    title: report.title || null,
    diagnosis: report.diagnosis || null,
    summary: report.summary || null,
    pdf_url: report.pdf_url || report.pdfPath || report.pdfUrl || null,
    created_at: report.created_at || report.createdAt || null,
    updated_at: report.updated_at || report.updatedAt || null,
});

// Step 1: Trigger Emergency
export const triggerEmergency = async (req, res, next) => {
    try {
        // For demo purposes, we will prioritize the body ID to allow demo patients/doctors
        let patientId = req.body.patientId;
        console.log("triggerEmergency - Initial patientId from body:", patientId);
        console.log("triggerEmergency - req.user:", req.user);
        
        if (!patientId && req.user?.role === 'patient') {
            const patientRecord = emergencyModel.getPatientProfileByUserId(req.user.id);
            console.log("triggerEmergency - Existing patientRecord:", patientRecord);
            if (patientRecord) {
                patientId = patientRecord.patient_id;
                console.log("triggerEmergency - Using existing patientId:", patientId);
            } else {
                console.log("triggerEmergency - No profile found, creating fallback...");
                patientId = emergencyModel.createFallbackPatientProfile(req.user.id);
                console.log("triggerEmergency - Created fallback patientId:", patientId);
            }
        }
        
        if (!patientId) {
            console.error("triggerEmergency - patientId is still missing!");
            return next(createError("Patient ID is required", 400));
        }

        const { latitude, longitude, address, medicalContext } = req.body;
        
        // Find nearest hospitals
        const hospitals = await findNearestHospitals(latitude, longitude);

        // Create Emergency Record
        console.log("triggerEmergency - Creating emergency record...");
        const emergencyId = emergencyModel.createEmergency(patientId, latitude, longitude, address || "Unknown Location", medicalContext);
        console.log("triggerEmergency - Record created, ID:", emergencyId);
        
        // Fetch patient details
        const patient = emergencyModel.getPatientProfile(patientId);
        
        // Fetch available doctors
        const doctors = emergencyModel.getAllDoctors();

        // Notify doctors
        notifyDoctorsOfEmergency({ emergencyId, patientId }, doctors);

        console.log("triggerEmergency - Successfully returning 200");
        return res.status(200).json({
            success: true,
            message: "Emergency triggered successfully",
            emergencyId,
            hospitals,
            status: "pending"
        });
    } catch (error) {
        console.error("triggerEmergency - CRASH:", error);
        next(error);
    }
};

// Fetch pending emergencies for doctor dashboard
export const getPendingRequests = async (req, res, next) => {
    try {
        const emergencies = emergencyModel.getPendingEmergencies();
        return res.status(200).json({
            success: true,
            emergencies
        });
    } catch (error) {
        next(error);
    }
};

export const getPastRequests = async (req, res, next) => {
    try {
        const emergencies = emergencyModel.getPastEmergencies();
        return res.status(200).json({
            success: true,
            emergencies
        });
    } catch (error) {
        next(error);
    }
};

// Doctor accepts the emergency
export const acceptEmergency = async (req, res, next) => {
    try {
        const { emergencyId } = req.body;
        let doctorId = req.body.doctorId;
        if (req.user && req.user.role === 'doctor') {
            const doctor = emergencyModel.ensureDoctorProfileByUserId(req.user.id);
            doctorId = doctor.id;
        }

        if (!emergencyId) {
            return next(createError("Emergency request is missing. Please refresh and try again.", 400));
        }

        if (!doctorId) {
            return next(createError("Only a logged-in doctor can accept an emergency.", 403));
        }

        const result = emergencyModel.acceptEmergency(emergencyId, doctorId);
        if (result.changes === 0) {
            return next(createError("Emergency already handled or not found", 400));
        }

        // Fetch emergency details
        const emergency = emergencyModel.getEmergencyById(emergencyId);
        
        // Now trigger the AI Service to generate a summary
        // We will call the python fastapi service directly from here
        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:7860";
        let summary = "AI Summary generation failed.";
        let riskLevel = "Unknown";
        
        // Fetch patient reports to pass into the AI context
        let patientReports = [];
        try {
            patientReports = (getReportsByPatientId(emergency.patientId) || []).map(normalizeReportForAi);
        } catch (e) {
            console.error("Failed to fetch reports for AI summary:", e);
        }
        const reportHighlights = buildReportHighlights(patientReports, emergency);

        try {
            const aiResponse = await fetch(`${aiServiceUrl}/api/v1/emergency/summarize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId: emergency.patientId,
                    medicalContext: emergency.summary,
                    age: emergency.age,
                    gender: emergency.gender,
                    history: emergency.history,
                    allergies: emergency.allergies,
                    medications: emergency.medications,
                    reports: patientReports
                })
            });
            const aiData = await aiResponse.json();
            if (aiData.summary) {
                summary = aiData.summary;
                riskLevel = aiData.risk_level;
            }
        } catch (err) {
            console.error("Error communicating with AI service:", err.message);
        }

        // Update emergency with summary
        emergencyModel.updateEmergencySummary(emergencyId, summary);

        return res.status(200).json({
            success: true,
            message: "Emergency accepted",
            summary,
            riskLevel,
            patient: {
                name: emergency.patient_name,
                patientId: emergency.patientId,
                age: emergency.age,
                gender: emergency.gender,
                medicalContext: emergency.summary,
                history: emergency.history,
                allergies: emergency.allergies,
                medications: emergency.medications,
                reports: patientReports,
                reportHighlights
            }
        });
    } catch (error) {
        next(error);
    }
};

// Doctor rejects the emergency
export const rejectEmergency = async (req, res, next) => {
    try {
        const { emergencyId } = req.body;
        let doctorId = req.body.doctorId;
        
        if (req.user && req.user.role === 'doctor') {
            const doctor = emergencyModel.ensureDoctorProfileByUserId(req.user.id);
            doctorId = doctor.id;
        }

        if (!emergencyId) {
            return next(createError("Emergency request is missing. Please refresh and try again.", 400));
        }

        if (!doctorId) {
            return next(createError("Only a logged-in doctor can reject an emergency.", 403));
        }
        
        emergencyModel.rejectEmergency(emergencyId, doctorId);
        
        return res.status(200).json({
            success: true,
            message: "Emergency rejected"
        });
    } catch (error) {
        next(error);
    }
};

export const getEmergencyStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const emergency = emergencyModel.getEmergencyById(id);
        if (!emergency) {
            return next(createError("Emergency not found", 404));
        }
        return res.status(200).json({
            success: true,
            status: emergency.status,
            doctorId: emergency.doctor_id,
            summary: emergency.summary
        });
    } catch (error) {
        next(error);
    }
};

export const askEmergencyRag = async (req, res, next) => {
    try {
        const { emergencyId, patientId, question, patientData = {} } = req.body || {};

        if (!question || typeof question !== "string" || !question.trim()) {
            return next(createError("question is required", 400));
        }

        let emergency = null;
        let resolvedPatientId = patientId;

        if (emergencyId) {
            emergency = emergencyModel.getEmergencyById(emergencyId);
            if (!emergency) {
                return next(createError("Emergency not found", 404));
            }
            resolvedPatientId = emergency.patientId;
        }

        if (!resolvedPatientId) {
            return next(createError("patientId is required", 400));
        }

        let patientReports = [];
        try {
            patientReports = (getReportsByPatientId(resolvedPatientId) || []).map(normalizeReportForAi);
        } catch (error) {
            console.error("Emergency RAG - failed to fetch patient reports:", error);
        }

        const mergedPatientData = {
            patientId: resolvedPatientId,
            medicalContext: emergency?.summary || patientData.medicalContext || null,
            age: emergency?.age ?? patientData.age ?? null,
            gender: emergency?.gender ?? patientData.gender ?? null,
            history: emergency?.history ?? patientData.history ?? null,
            allergies: emergency?.allergies ?? patientData.allergies ?? null,
            medications: emergency?.medications ?? patientData.medications ?? null,
            reports: patientReports.length ? patientReports : (patientData.reports || []),
        };
        const reportHighlights = buildReportHighlights(mergedPatientData.reports, mergedPatientData);
        mergedPatientData.reportHighlights = reportHighlights;

        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:7860";
        const payload = {
            patient_id: String(resolvedPatientId),
            question: question.trim(),
            patientData: mergedPatientData,
        };

        console.log("Emergency RAG request:", {
            url: `${aiServiceUrl}/api/v1/emergency/rag`,
            patientId: resolvedPatientId,
            question: question.trim(),
            reports: mergedPatientData.reports.length,
        });

        const aiResponse = await fetch(`${aiServiceUrl}/api/v1/emergency/rag`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        let aiData = null;
        try {
            aiData = await aiResponse.json();
        } catch (error) {
            const text = await aiResponse.text().catch(() => "");
            aiData = { success: false, response: text };
        }

        console.log("Emergency RAG response:", {
            status: aiResponse.status,
            ok: aiResponse.ok,
            data: aiData,
        });

        let answer = normalizeText(aiData?.response) || normalizeText(aiData?.answer);

        if (!aiResponse.ok || aiData?.success === false) {
            console.error("Emergency RAG AI service failed, using local fallback:", aiData);
            answer = buildFallbackRagAnswer(question, mergedPatientData, reportHighlights);
            aiData = {
                ...(aiData || {}),
                success: false,
                fallbackUsed: true,
                fallbackReason: aiData?.detail || aiData?.message || "AI emergency RAG request failed",
            };
        }

        if (!answer) {
            answer = buildFallbackRagAnswer(question, mergedPatientData, reportHighlights);
            aiData = {
                ...(aiData || {}),
                fallbackUsed: true,
                fallbackReason: "AI service returned an empty response",
            };
        }

        return res.status(200).json({
            success: true,
            message: "Emergency RAG response generated successfully",
            data: {
                response: answer,
                patientContext: mergedPatientData,
                reportHighlights,
                ragResponse: aiData,
            },
        });
    } catch (error) {
        console.error("Emergency RAG controller error:", error);
        return next(error);
    }
};

export const summarizeEmergencyReports = async (req, res, next) => {
    try {
        const { emergencyId, patientId, patientData = {} } = req.body || {};

        let emergency = null;
        let resolvedPatientId = patientId;

        if (emergencyId) {
            emergency = emergencyModel.getEmergencyById(emergencyId);
            if (!emergency) {
                return next(createError("Emergency not found", 404));
            }
            resolvedPatientId = emergency.patientId;
        }

        if (!resolvedPatientId) {
            return next(createError("patientId is required", 400));
        }

        let patientReports = [];
        try {
            patientReports = (getReportsByPatientId(resolvedPatientId) || []).map(normalizeReportForAi);
        } catch (error) {
            console.error("Emergency report summary - failed to fetch reports:", error);
        }

        const mergedPatientData = {
            patientId: resolvedPatientId,
            medicalContext: emergency?.summary || patientData.medicalContext || null,
            age: emergency?.age ?? patientData.age ?? null,
            gender: emergency?.gender ?? patientData.gender ?? null,
            history: emergency?.history ?? patientData.history ?? null,
            allergies: emergency?.allergies ?? patientData.allergies ?? null,
            medications: emergency?.medications ?? patientData.medications ?? null,
            reports: patientReports,
        };

        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:7860";
        let aiData = null;
        let summary = "";

        try {
            const aiResponse = await fetch(`${aiServiceUrl}/api/v1/emergency/report-summary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mergedPatientData),
            });

            try {
                aiData = await aiResponse.json();
            } catch (error) {
                const text = await aiResponse.text().catch(() => "");
                aiData = { success: false, summary: text };
            }

            summary = normalizeText(aiData?.summary);

            if (!aiResponse.ok || aiData?.success === false || !summary) {
                summary = buildFallbackReportSummary(patientReports, mergedPatientData);
                aiData = {
                    ...(aiData || {}),
                    success: false,
                    fallbackUsed: true,
                    fallbackReason: aiData?.detail || aiData?.message || "AI report summary request failed",
                };
            }
        } catch (error) {
            console.error("Emergency report summary AI service failed:", error);
            summary = buildFallbackReportSummary(patientReports, mergedPatientData);
            aiData = {
                success: false,
                fallbackUsed: true,
                fallbackReason: error.message || "AI service unavailable",
            };
        }

        return res.status(200).json({
            success: true,
            message: "Emergency report summary generated successfully",
            data: {
                summary,
                reportCount: patientReports.length,
                reports: patientReports,
                patientContext: mergedPatientData,
                aiResponse: aiData,
            },
        });
    } catch (error) {
        console.error("Emergency report summary controller error:", error);
        return next(error);
    }
};
