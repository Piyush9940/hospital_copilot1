const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'hospital.db');
const db = new Database(dbPath);

try {
    db.prepare('ALTER TABLE users ADD COLUMN face_descriptor TEXT').run();
    console.log("Column added successfully");
} catch(e) {
    console.log("Column might already exist: " + e.message);
}
db.close();
