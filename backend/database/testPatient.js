import { createPatientProfile, getPatientByUserId, getAllPatients } from "../model/patient.model.js";
import { findUserByEmail } from "../model/user.model.js";

const testPatient = async () => {
    console.log("🧪 Testing patient operations...\n");

    // Find the patient user we created earlier
    const patientUser = findUserByEmail("patient@gmail.com");
    
    if (!patientUser) {
        console.log("❌ No patient user found! Run testUser.js first.");
        return;
    }

    console.log(`Found patient user: ${patientUser.name} (ID: ${patientUser.id})`);

    // Create patient profile
    try {
        const result = createPatientProfile(
            patientUser.id,
            45,
            "Male",
            "Diabetes, Hypertension",
            "Penicillin, Peanuts",
            "Metformin 500mg, Lisinopril 10mg"
        );
        console.log("✅ Patient profile created successfully!");
        console.log("   Profile ID:", result.lastInsertRowid);
    } catch (error) {
        if (error.message.includes("UNIQUE constraint failed")) {
            console.log("⚠️  Patient profile already exists");
        } else {
            console.log("❌ Error:", error.message);
        }
    }

    // Fetch patient profile
    const profile = getPatientByUserId(patientUser.id);
    if (profile) {
        console.log("\n📖 Patient Profile:");
        console.log("   Age:", profile.age);
        console.log("   Gender:", profile.gender);
        console.log("   History:", profile.history);
        console.log("   Allergies:", profile.allergies);
        console.log("   Medications:", profile.medications);
    }

    // Get all patients with user info
    console.log("\n👥 All patients:");
    const allPatients = getAllPatients();
    allPatients.forEach(patient => {
        console.log(`   - ${patient.name} (${patient.email})`);
        console.log(`     Age: ${patient.age}, History: ${patient.history}`);
    });

    console.log("\n🎉 Patient test complete!");
};

testPatient();