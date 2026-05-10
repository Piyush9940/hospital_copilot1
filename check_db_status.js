import db from "./backend/config/db.js";
const alerts = db.prepare("SELECT * FROM emergencies").all();
console.log(alerts);
