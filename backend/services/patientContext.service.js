import { getPatientByUserId, getAllPatients } from "../model/patient.model.js";
import { getLatestVitals, getVitalsByPatientId } from "../model/vital.model.js";
import { getReportsByPatientId } from "../model/report.model.js";
import { getAppointmentById } from "../model/appointment.model.js";
import { createError, validateId, safeJsonParse } from "../utils/helper.js";

/**
 * Normalize text field into array
 */
const normalizeListField = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const parsed = safeJsonParse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

/**
 * Normalize patient profile for AI use
 */
const normalizePatientProfile = (patient) => {
  if (!patient) {
    return null;
  }

  return {
    patientId: patient.id || null,
    userId: patient.user_id || null,
    age: patient.age ?? null,
    gender: patient.gender || null,
    history: normalizeListField(patient.history),
    allergies: normalizeListField(patient.allergies),
    medications: normalizeListField(patient.medications),
  };
};

/**
 * Normalize latest vitals
 */
const normalizeVitals = (vitals) => {
  if (!vitals) {
    return null;
  }

  return {
    heartRate: vitals.heart_rate ?? null,
    spo2: vitals.spo2 ?? null,
    bp: vitals.bp ?? null,
    temperature: vitals.temperature ?? null,
    status: vitals.status || null,
    recordedAt: vitals.created_at || null,
  };
};

/**
 * Normalize reports list
 */
const normalizeReports = (reports = [], limit = 5) => {
  if (!Array.isArray(reports)) {
    return [];
  }

  return reports.slice(0, limit).map((report) => ({
    reportId: report.id || null,
    diagnosis: report.diagnosis || null,
    summary: report.summary || null,
    pdfPath: report.pdf_path || null,
    createdAt: report.created_at || null,
  }));
};

/**
 * Normalize appointment info
 */
const normalizeAppointment = (appointment) => {
  if (!appointment) {
    return null;
  }

  return {
    appointmentId: appointment.id || null,
    appointmentCode: appointment.appointment_code || null,
    appointmentDate: appointment.appointment_date || null,
    appointmentTime: appointment.appointment_time || null,
    consultationType: appointment.consultation_type || null,
    appointmentStatus: appointment.appointment_status || null,
    paymentStatus: appointment.payment_status || null,
    doctorId: appointment.doctor_id || null,
    doctorName: appointment.doctor_name || null,
    nurseId: appointment.nurse_id || null,
    nurseName: appointment.nurse_name || null,
    symptoms: appointment.symptoms || null,
  };
};

/**
 * Get patient profile using user ID
 */
export const getPatientProfileContext = (userId) => {
  try {
    const validUserId = validateId(userId, "User ID");
    const patient = getPatientByUserId(validUserId);

    return normalizePatientProfile(patient);
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch patient profile context",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get latest vitals using patient table ID
 */
export const getLatestVitalsContext = (patientId) => {
  try {
    const validPatientId = validateId(patientId, "Patient ID");
    const vitals = getLatestVitals(validPatientId);

    return normalizeVitals(vitals);
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch latest vitals context",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get recent vitals history
 */
export const getVitalsHistoryContext = (patientId, limit = 10) => {
  try {
    const validPatientId = validateId(patientId, "Patient ID");
    const validLimit = Number(limit);

    if (!Number.isInteger(validLimit) || validLimit <= 0 || validLimit > 100) {
      throw createError("Vitals history limit must be between 1 and 100", 400);
    }

    const vitals = getVitalsByPatientId(validPatientId) || [];

    return vitals.slice(0, validLimit).map((item) => ({
      heartRate: item.heart_rate ?? null,
      spo2: item.spo2 ?? null,
      bp: item.bp ?? null,
      temperature: item.temperature ?? null,
      status: item.status || null,
      recordedAt: item.created_at || null,
    }));
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch vitals history context",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get recent report summaries
 */
export const getRecentReportsContext = (patientId, limit = 5) => {
  try {
    const validPatientId = validateId(patientId, "Patient ID");
    const validLimit = Number(limit);

    if (!Number.isInteger(validLimit) || validLimit <= 0 || validLimit > 20) {
      throw createError("Report limit must be between 1 and 20", 400);
    }

    const reports = getReportsByPatientId(validPatientId) || [];

    return normalizeReports(reports, validLimit);
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch reports context",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Get appointment context
 */
export const getAppointmentContext = (appointmentId) => {
  try {
    const validAppointmentId = validateId(appointmentId, "Appointment ID");
    const appointment = getAppointmentById(validAppointmentId);

    return normalizeAppointment(appointment);
  } catch (error) {
    throw createError(
      error.message || "Failed to fetch appointment context",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Build complete AI Nurse context from user ID
 */
export const buildPatientContext = ({
  userId,
  appointmentId = null,
  reportLimit = 5,
  vitalsHistoryLimit = 5,
}) => {
  try {
    const validUserId = validateId(userId, "User ID");
    const patient = getPatientByUserId(validUserId);

    if (!patient) {
      return {
        patient: null,
        latestVitals: null,
        vitalsHistory: [],
        reports: [],
        appointment: appointmentId ? getAppointmentContext(appointmentId) : null,
        contextWarning:
          "Patient profile not found. Give only general medical guidance and ask the user to complete their profile.",
        summary: {
          gender: null,
          history: [],
          allergies: [],
          medications: [],
        },
      };
    }

    const profile = normalizePatientProfile(patient);
    const latestVitals = getLatestVitalsContext(patient.id);
    const vitalsHistory = getVitalsHistoryContext(patient.id, vitalsHistoryLimit);
    const reports = getRecentReportsContext(patient.id, reportLimit);
    const appointment = appointmentId ? getAppointmentContext(appointmentId) : null;

    return {
      patient: profile,
      latestVitals,
      vitalsHistory,
      reports,
      appointment,
      contextWarning: null,
      summary: {
        gender: profile?.gender || null,
        history: profile?.history || [],
        allergies: profile?.allergies || [],
        medications: profile?.medications || [],
      },
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to build patient context",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Build compact AI prompt-safe context
 */
export const buildCompactPatientContext = (payload) => {
  try {
    const context = buildPatientContext(payload);

    return {
      gender: context?.patient?.gender || null,
      age: context?.patient?.age || null,
      history: context?.patient?.history || [],
      allergies: context?.patient?.allergies || [],
      medications: context?.patient?.medications || [],
      contextWarning: context?.contextWarning || null,
      latestVitals: context?.latestVitals || null,
      recentReports: (context?.reports || []).map((report) => ({
        diagnosis: report.diagnosis,
        summary: report.summary,
        createdAt: report.createdAt,
      })),
      appointment: context?.appointment
        ? {
            appointmentDate: context.appointment.appointmentDate,
            appointmentTime: context.appointment.appointmentTime,
            symptoms: context.appointment.symptoms,
            doctorName: context.appointment.doctorName,
          }
        : null,
    };
  } catch (error) {
    throw createError(
      error.message || "Failed to build compact patient context",
      error.statusCode || 500,
      error.details || null
    );
  }
};

/**
 * Optional helper to list all patient contexts
 */
export const listAllPatientsContext = () => {
  try {
    const patients = getAllPatients() || [];

    return patients.map((patient) => ({
      patientId: patient.id || null,
      userId: patient.user_id || null,
      name: patient.name || null,
      email: patient.email || null,
      age: patient.age ?? null,
      gender: patient.gender || null,
    }));
  } catch (error) {
    throw createError(
      error.message || "Failed to list patient contexts",
      error.statusCode || 500,
      error.details || null
    );
  }
};

export default {
  getPatientProfileContext,
  getLatestVitalsContext,
  getVitalsHistoryContext,
  getRecentReportsContext,
  getAppointmentContext,
  buildPatientContext,
  buildCompactPatientContext,
  listAllPatientsContext,
};