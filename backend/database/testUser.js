import bcrypt from "bcryptjs";
import { createUser, findUserByEmail, getAllUsers } from "../model/user.model.js";

const testDatabase = async () => {
    console.log("🧪 Testing database operations...\n");

    // 1. Hash a password
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    // 2. Create a doctor user
    try {
        const result = createUser(
            "Dr. Smith",
            "doctor@gmail.com",
            hashedPassword,
            "doctor"
        );
        console.log("✅ Doctor inserted successfully!");
        console.log("   Insert ID:", result.lastInsertRowid);
    } catch (error) {
        if (error.message.includes("UNIQUE constraint failed")) {
            console.log("⚠️  Doctor already exists, skipping insert...");
        } else {
            console.log("❌ Error:", error.message);
        }
    }

    // 3. Create a patient user
    const patientPassword = await bcrypt.hash("patient123", 10);
    try {
        const result = createUser(
            "John Patient",
            "patient@gmail.com",
            patientPassword,
            "patient"
        );
        console.log("✅ Patient inserted successfully!");
        console.log("   Insert ID:", result.lastInsertRowid);
    } catch (error) {
        if (error.message.includes("UNIQUE constraint failed")) {
            console.log("⚠️  Patient already exists, skipping insert...");
        } else {
            console.log("❌ Error:", error.message);
        }
    }

    // 4. Fetch doctor by email
    console.log("\n📖 Fetching doctor by email:");
    const doctor = findUserByEmail("doctor@gmail.com");
    if (doctor) {
        console.log("   ✅ Found:", doctor.name);
        console.log("   Email:", doctor.email);
        console.log("   Role:", doctor.role);
        // Don't show password hash
    }

    // 5. Fetch patient by email
    console.log("\n📖 Fetching patient by email:");
    const patient = findUserByEmail("patient@gmail.com");
    if (patient) {
        console.log("   ✅ Found:", patient.name);
        console.log("   Email:", patient.email);
        console.log("   Role:", patient.role);
    }

    // 6. Get all users
    console.log("\n👥 All users in database:");
    const allUsers = getAllUsers();
    allUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    console.log("\n🎉 Database test complete!");
};

testDatabase();