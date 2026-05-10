import db from "./backend/config/db.js";
const users = db.prepare("SELECT email, face_registered, face_embedding_json FROM users").all();
console.log(users);
