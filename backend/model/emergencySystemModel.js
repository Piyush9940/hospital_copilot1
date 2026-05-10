import db from "../config/db.js";
import { generateHashedPatientId } from "../utils/helper.js";

export const createEmergency = (patientId, lat, lng, locationAddress, medicalContext = null) => {
    const stmt = db.prepare(`
        INSERT INTO emergencies (patient_id, latitude, longitude, location_address, summary, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
    `);
    const result = stmt.run(patientId, lat, lng, locationAddress, medicalContext);
    return result.lastInsertRowid;
};

export const getPendingEmergencies = () => {
    const stmt = db.prepare(`
        SELECT
            e.*,
            COALESCE(u.name, 'Unknown Patient') as patient_name,
            p.age,
            p.gender,
            p.history,
            p.allergies,
            p.medications,
            p.patient_id as patientId
        FROM emergencies e
        LEFT JOIN patients p ON e.patient_id = p.patient_id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE e.status = 'pending'
        ORDER BY e.created_at DESC
    `);
    return stmt.all();
};

export const getPastEmergencies = () => {
    const stmt = db.prepare(`
        SELECT
            e.*,
            COALESCE(u.name, 'Unknown Patient') as patient_name,
            p.age,
            p.gender,
            p.history,
            p.allergies,
            p.medications,
            p.patient_id as patientId
        FROM emergencies e
        LEFT JOIN patients p ON e.patient_id = p.patient_id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE e.status != 'pending'
        ORDER BY e.updated_at DESC
    `);
    return stmt.all();
};

export const getEmergencyById = (emergencyId) => {
    const stmt = db.prepare(`
        SELECT e.*, u.name as patient_name, p.age, p.gender, p.history, p.allergies, p.medications, p.patient_id as patientId
        FROM emergencies e
        JOIN patients p ON e.patient_id = p.patient_id
        JOIN users u ON p.user_id = u.id
        WHERE e.id = ?
    `);
    return stmt.get(emergencyId);
};

export const acceptEmergency = (emergencyId, doctorId) => {
    const stmt = db.prepare(`
        UPDATE emergencies
        SET status = 'accepted', doctor_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
    `);
    const result = stmt.run(doctorId, emergencyId);
    
    if (result.changes > 0) {
        // Find patient_id for this emergency
        const em = getEmergencyById(emergencyId);
        if (em) {
            const assignStmt = db.prepare(`
                INSERT INTO doctor_assignments (patient_id, doctor_id, status)
                VALUES (?, ?, 'active')
            `);
            assignStmt.run(em.patientId, doctorId);
        }
    }
    return result;
};

export const rejectEmergency = (emergencyId, doctorId) => {
    // In a real system, rejecting might just log that this doctor rejected,
    // but the emergency stays pending for other doctors. For this demo, we'll mark it rejected.
    const stmt = db.prepare(`
        UPDATE emergencies
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(emergencyId);
};

export const updateEmergencySummary = (emergencyId, summary) => {
    const stmt = db.prepare(`
        UPDATE emergencies
        SET summary = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(summary, emergencyId);
};

export const getAllDoctors = () => {
    const stmt = db.prepare(`
        SELECT d.id, u.name, u.email 
        FROM doctors d
        JOIN users u ON d.user_id = u.id
    `);
    return stmt.all();
};

export const getDoctorProfileByUserId = (userId) => {
    const stmt = db.prepare(`SELECT * FROM doctors WHERE user_id = ?`);
    return stmt.get(userId);
};

export const getPatientProfile = (patientId) => {
    const stmt = db.prepare(`
        SELECT p.*, u.name, u.email
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.patient_id = ?
    `);
    return stmt.get(patientId);
}

export const getPatientProfileByUserId = (userId) => {
    const stmt = db.prepare(`
        SELECT p.*, u.name, u.email
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
    `);
    return stmt.get(userId);
}

export const createFallbackPatientProfile = (userId) => {
    const patientId = generateHashedPatientId();
    const stmt = db.prepare(`
        INSERT INTO patients (patient_id, user_id, age, gender, history, allergies, medications, created_at, updated_at)
        VALUES (?, ?, 30, 'Other', 'None provided', 'None provided', 'None provided', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(patientId, userId);
    return patientId;
}
