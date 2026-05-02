import { createReport, getReportsByPatientId, getAllReports } from "../model/report.model.js";
import { getPatientByUserId } from "../model/patient.model.js";
import { findUserByEmail } from "../model/user.model.js";

const testReports = () => {
    console.log("🧪 Testing Reports Model...\n");

    // Find a patient
    const patientUser = findUserByEmail("patient@gmail.com");
    const patientProfile = getPatientByUserId(patientUser.id);

    // Create a report
    const result = createReport(
        patientProfile.id,
        "Acute Bronchitis",
        "Patient presents with cough, fever, and chest congestion. Prescribed antibiotics and rest.",
        "/uploads/reports/bronchitis_001.pdf"
    );
    console.log("✅ Report created:", result.lastInsertRowid);

    // Get patient's reports
    const reports = getReportsByPatientId(patientProfile.id);
    console.log("\n📋 Patient Reports:");
    reports.forEach(r => {
        console.log(`   - ${r.diagnosis} (${r.created_at})`);
    });

    // Get all reports
    const allReports = getAllReports();
    console.log(`\n📊 Total reports in system: ${allReports.length}`);
};

testReports();