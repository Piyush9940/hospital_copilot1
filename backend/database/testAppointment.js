import { createAppointment, getAppointmentById } from "../models/appointment.model.js";
import { getPatientByUserId } from "../models/patient.model.js";
import { getDoctorByUserId } from "../models/doctor.model.js";
import { findUserByEmail } from "../models/user.model.js";

const testAppointment = async () => {
    console.log("🧪 Testing Appointment Creation...\n");

    // Get patient
    const patientUser = findUserByEmail("rahul@gmail.com");
    const patient = getPatientByUserId(patientUser.id);
    
    // Get doctor
    const doctorUser = findUserByEmail("dr.rajesh@hospital.com");
    const doctor = getDoctorByUserId(doctorUser.id);
    
    if (!patient || !doctor) {
        console.log("❌ Please run testPatientFull.js and testDoctor.js first!");
        return;
    }
    
    console.log("Patient ID:", patient.id);
    console.log("Doctor ID:", doctor.id);
    
    // Create appointment
    const result = createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        nurseId: null,
        symptoms: "Chest pain, shortness of breath, fatigue",
        uploadedImage: null,
        uploadedDocuments: ["reports/ecg.pdf"],
        appointmentDate: "2026-04-10",
        appointmentTime: "11:00 AM",
        consultationType: "video",
        fee: doctor.appointment_fee,
        paymentStatus: "pending"
    });
    
    console.log("✅ Appointment created with ID:", result.lastInsertRowid);
    
    // Get full appointment details
    const appointment = getAppointmentById(result.lastInsertRowid);
    console.log("\n📋 Appointment Details:");
    console.log("   Code:", appointment.appointment_code);
    console.log("   Patient:", appointment.patient_name);
    console.log("   Doctor:", appointment.doctor_name);
    console.log("   Status:", appointment.appointment_status);
    
    console.log("\n🎉 Appointment test complete!");
};

testAppointment();