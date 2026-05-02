import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./database/hospital.db');
const hashedPassword = bcrypt.hashSync('demo123', 10);

const insertUser = db.prepare(`
  INSERT INTO users (name, email, password, role, is_active, phone) 
  VALUES (?, ?, ?, ?, 1, '1234567890')
`);

try {
  insertUser.run('Demo Patient', 'patient@demo.com', hashedPassword, 'patient');
  console.log("Added patient demo user");
} catch(e) { console.log("Patient exists or error:", e.message); }

try {
  insertUser.run('Demo Doctor', 'doctor@demo.com', hashedPassword, 'doctor');
  console.log("Added doctor demo user");
} catch(e) { console.log("Doctor exists or error:", e.message); }

try {
  insertUser.run('Demo Nurse', 'nurse@demo.com', hashedPassword, 'nurse');
  console.log("Added nurse demo user");
} catch(e) { console.log("Nurse exists or error:", e.message); }

