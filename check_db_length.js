import db from "./backend/config/db.js";
const users = db.prepare("SELECT email, face_embedding_json FROM users WHERE face_embedding_json IS NOT NULL").all();

for (const u of users) {
    try {
        const emb = JSON.parse(u.face_embedding_json);
        console.log(`Email: ${u.email}, Embedding Length: ${emb.length}`);
    } catch(e) {
        console.log(`Email: ${u.email}, Parse Error`);
    }
}
