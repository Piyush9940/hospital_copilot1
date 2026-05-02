import { 
    createEmergencyAlert, 
    getPendingAlerts, 
    updateAlertStatus,
    getAlertStats 
} from "../models/emergency.model.js";
import { getPatientByUserId } from "../model/patient.model.js";
import { findUserByEmail } from "../model/user.model.js";

const testEmergency = () => {
    console.log("🚨 Testing Emergency Alerts Model...\n");

    // Find a patient
    const patientUser = findUserByEmail("patient@gmail.com");
    const patientProfile = getPatientByUserId(patientUser.id);

    // Create emergency alert
    const alert = createEmergencyAlert(
        patientProfile.id,
        "Patient experiencing severe chest pain and difficulty breathing",
        "pending"
    );
    console.log("✅ Emergency alert created:", alert.lastInsertRowid);

    // Get pending alerts
    const pending = getPendingAlerts();
    console.log(`\n📋 Pending alerts: ${pending.length}`);

    // Update alert status
    updateAlertStatus(alert.lastInsertRowid, "acknowledged");
    console.log("✅ Alert acknowledged");

    // Get statistics
    const stats = getAlertStats();
    console.log("\n📊 Alert Statistics:");
    stats.forEach(stat => {
        console.log(`   ${stat.status}: ${stat.count}`);
    });
};

testEmergency();