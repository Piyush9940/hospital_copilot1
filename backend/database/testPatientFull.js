import bcrypt from "bcryptjs";
import { createUser } from "../model/user.model.js";
import { createPatientProfile } from "../model/patient.model.js";

const testPatient = async () => {
    console.log("🧪 Testing Patient Registration...\n");

    // Create patient user
    const hashedPassword = await bcrypt.hash("patient123", 10);
    
    const userResult = createUser(
        "Rahul Sharma",
        "rahul@gmail.com",
        hashedPassword,
        "patient",
        "9876543210"
    );
    
    console.log("✅ Patient user created with ID:", userResult.lastInsertRowid);
    
    // Create patient profile
    const patientResult = createPatientProfile(
        userResult.lastInsertRowid,
        45,
        "Male",
        "Diabetes, Hypertension",
        "Penicillin",
        "Metformin 500mg",
        "O+",
        "Bangalore, Karnataka",
        "Priya Sharma",
        "9988776655"
    );
    
    console.log("✅ Patient profile created with ID:", patientResult.lastInsertRowid);
    console.log("\n🎉 Patient test complete!");
};

testPatient();