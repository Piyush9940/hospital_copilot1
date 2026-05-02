import bcrypt from "bcryptjs";
import { createUser } from "../model/user.model.js";
import { createNurse } from "../model/nurse.model.js";

const testNurse = async () => {
    console.log("🧪 Testing Nurse Registration...\n");

    // Create nurse user
    const hashedPassword = await bcrypt.hash("nurse123", 10);
    
    const userResult = createUser(
        "Sister Meera",
        "meera@hospital.com",
        hashedPassword,
        "nurse",
        "9988776655"
    );
    
    console.log("✅ Nurse user created with ID:", userResult.lastInsertRowid);
    
    // Create nurse profile
    const nurseResult = createNurse(
        userResult.lastInsertRowid,
        "Cardiology",
        "Morning",
        "B.Sc Nursing",
        5
    );
    
    console.log("✅ Nurse profile created with ID:", nurseResult.lastInsertRowid);
    console.log("\n🎉 Nurse test complete!");
};

testNurse();