import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");

const ensureColumn = (tableName, columnName, alterSql) => {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = columns.some((col) => col.name === columnName);

    if (!exists) {
        db.exec(alterSql);
        console.log(`Added missing column ${columnName} to ${tableName}`);
    }
};

try {
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(schema);

    ensureColumn(
        "chat_sessions",
        "session_type",
        `ALTER TABLE chat_sessions ADD COLUMN session_type TEXT DEFAULT 'ai_nurse';`
    );

    ensureColumn(
        "users",
        "face_image_path",
        `ALTER TABLE users ADD COLUMN face_image_path TEXT;`
    );

    ensureColumn(
        "users",
        "face_embedding_json",
        `ALTER TABLE users ADD COLUMN face_embedding_json TEXT;`
    );

    ensureColumn(
        "users",
        "face_registered",
        `ALTER TABLE users ADD COLUMN face_registered INTEGER DEFAULT 0;`
    );

    ensureColumn(
        "patients",
        "blood_group",
        `ALTER TABLE patients ADD COLUMN blood_group TEXT CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'));`
    );

    ensureColumn(
        "patients",
        "address",
        `ALTER TABLE patients ADD COLUMN address TEXT;`
    );

    ensureColumn(
        "patients",
        "date_of_birth",
        `ALTER TABLE patients ADD COLUMN date_of_birth DATE;`
    );

    console.log("✅ Database initialized successfully!");
    console.log("📋 Tables ensured:");
    console.log("   1. users");
    console.log("   2. patients");
    console.log("   3. doctors");
    console.log("   4. nurses");
    console.log("   5. appointments");
    console.log("   6. chat_permissions");
    console.log("   7. reports");
    console.log("   8. vitals");
    console.log("   9. emergency_alerts");
    console.log("   10. nurse_notes");
    console.log("   11. chat_sessions");
    console.log("   12. chat_messages");
    console.log("   13. video_calls");
    console.log("   14. emergencies");
    console.log("\n📁 Database file: backend/database/hospital.db");
} catch (error) {
    console.error("❌ Error creating/updating database:", error.message);
}