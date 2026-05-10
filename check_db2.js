import db from "./backend/config/db.js";
try {
    const alerts = db.prepare("SELECT * FROM emergencies").all();
    console.log("EMERGENCIES:", alerts);
} catch(e) {
    console.log("Error:", e);
}
