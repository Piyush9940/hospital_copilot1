import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database', 'hospital.db');
const db = new Database(dbPath);

const hashedPassword = bcrypt.hashSync('demo123', 10);

console.log("Starting demo data insertion...");

try {
    // Clear existing
    db.exec("DELETE FROM users WHERE email IN ('patient@demo.com', 'doctor1@demo.com', 'doctor2@demo.com')");

    // Insert 1 Patient
    const insertUser = db.prepare(`INSERT INTO users (name, email, password, role, is_active, phone) VALUES (?, ?, ?, ?, 1, ?)`);
    const p1Info = insertUser.run('John Doe (Patient)', 'patient@demo.com', hashedPassword, 'patient', '555-0101');
    const patientUserId = p1Info.lastInsertRowid;

    const demoPatientIdHash = crypto.createHash('sha256').update('demo_patient_001').digest('hex');

    const insertPatient = db.prepare(`INSERT INTO patients (patient_id, user_id, gender, age, history, allergies, medications, blood_group, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertPatient.run(demoPatientIdHash, patientUserId, 'Male', 45, 'Type 2 Diabetes, Hypertension', 'Penicillin, Peanuts', 'Metformin 500mg, Lisinopril 10mg', 'O+', '123 Fake St, Springfield');
    console.log("Added 1 Patient Demo User");

    // Insert 2 Doctors
    const d1Info = insertUser.run('Dr. Alice Smith', 'doctor1@demo.com', hashedPassword, 'doctor', '555-0201');
    const doctor1UserId = d1Info.lastInsertRowid;
    
    const d2Info = insertUser.run('Dr. Bob Jones', 'doctor2@demo.com', hashedPassword, 'doctor', '555-0202');
    const doctor2UserId = d2Info.lastInsertRowid;

    const insertDoctor = db.prepare(`INSERT INTO doctors (user_id, specialization, experience, qualification, hospital_name, hospital_address) VALUES (?, ?, ?, ?, ?, ?)`);
    insertDoctor.run(doctor1UserId, 'Emergency Medicine', 15, 'MD, FACEP', 'City General Hospital', '456 Med Blvd');
    insertDoctor.run(doctor2UserId, 'Cardiology', 10, 'MD, FACC', 'Heart Center', '789 Cardio Way');
    console.log("Added 2 Doctor Demo Users");

} catch(e) {
    console.error("Error inserting demo data:", e.message);
}

console.log("Finished demo data insertion.");
