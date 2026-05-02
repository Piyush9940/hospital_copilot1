import bcrypt from "bcryptjs";
import { createUser } from "../models/user.model.js";
import { createDoctor } from "../models/doctor.model.js";

const testDoctor = async () => {
    console.log("🧪 Testing Doctor Registration...\n");

    // Create doctor user
    const hashedPassword = await bcrypt.hash("doctor123", 10);
    
    const userResult = createUser(
        "Dr. Rajesh Kumar",
        "dr.rajesh@hospital.com",
        hashedPassword,
        "doctor",
        "9876543210",
        "doctor-rajesh.jpg"
    );
    
    console.log("✅ Doctor user created with ID:", userResult.lastInsertRowid);
    
    // Create doctor profile
    const doctorResult = createDoctor(
        userResult.lastInsertRowid,
        "Cardiologist",
        12,
        "MD, DM Cardiology",
        800,
        "Apollo Hospital",
        "Bangalore"
    );
    
    console.log("✅ Doctor profile created with ID:", doctorResult.lastInsertRowid);
    console.log("\n🎉 Doctor test complete!");
};

testDoctor();