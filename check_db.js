import db from "./backend/config/db.js";
const alerts = db.prepare("SELECT * FROM emergency_alerts").all();
console.log("ALERTS:", alerts);
const patients = db.prepare("SELECT * FROM patients").all();
console.log("PATIENTS:", patients);
