import { addVital, getVitalsByPatientId, getLatestVitals } from "../model/vital.model.js";
import { getPatientByUserId } from "../model/patient.model.js";
import { findUserByEmail } from "../model/user.model.js";

const testVitals = async () => {
    console.log("🧪 Testing vitals operations...\n");

    // Find patient user and their profile
    const patientUser = findUserByEmail("patient@gmail.com");
    if (!patientUser) {
        console.log("❌ No patient found!");
        return;
    }

    const patientProfile = getPatientByUserId(patientUser.id);
    if (!patientProfile) {
        console.log("❌ No patient profile found! Run testPatient.js first.");
        return;
    }

    console.log(`Adding vitals for patient: ${patientUser.name}`);
    console.log(`Patient Profile ID: ${patientProfile.id}\n`);

    // Add some vitals
    const vitalsData = [
        { heart: 118, spo2: 91, bp: "150/95", temp: 101.2, status: "warning" },
        { heart: 98, spo2: 96, bp: "130/85", temp: 98.6, status: "normal" },
        { heart: 105, spo2: 93, bp: "145/90", temp: 99.8, status: "caution" }
    ];

    for (const v of vitalsData) {
        try {
            const result = addVital(
                patientProfile.id,
                v.heart,
                v.spo2,
                v.bp,
                v.temp,
                v.status
            );
            console.log(`✅ Added vital: HR=${v.heart}, BP=${v.bp}, Status=${v.status}`);
        } catch (error) {
            console.log("❌ Error adding vital:", error.message);
        }
    }

    // Get all vitals for patient
    console.log("\n📊 All vitals for patient:");
    const allVitals = getVitalsByPatientId(patientProfile.id);
    allVitals.forEach(vital => {
        console.log(`   ${vital.created_at}: HR=${vital.heart_rate}, BP=${vital.bp}, Status=${vital.status}`);
    });

    // Get latest vitals
    const latest = getLatestVitals(patientProfile.id);
    if (latest) {
        console.log("\n📈 Latest vitals:");
        console.log(`   Heart Rate: ${latest.heart_rate}`);
        console.log(`   SpO2: ${latest.spo2}%`);
        console.log(`   Blood Pressure: ${latest.bp}`);
        console.log(`   Temperature: ${latest.temperature}°F`);
        console.log(`   Status: ${latest.status}`);
    }

    console.log("\n🎉 Vitals test complete!");
};

testVitals();