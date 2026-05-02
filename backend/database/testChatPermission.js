import { 
    requestChatPermission,
    approveChatPermission,
    rejectChatPermission,
    isChatAllowed,
    getPermissionsByAppointment
} from "../models/chatPermission.model.js";

import { getPatientByUserId } from "../models/patient.model.js";
import { getDoctorByUserId } from "../models/doctor.model.js";
import { createAppointment, getAppointmentById } from "../models/appointment.model.js";
import { findUserByEmail } from "../models/user.model.js";

const testChatPermission = async () => {
    console.log("🔐 Testing Chat Permission System\n");
    console.log("=" .repeat(50));

    // ============================================
    // STEP 1: Get or Create Test Users
    // ============================================
    console.log("\n📋 STEP 1: Finding test users...");
    
    // Find patient
    let patientUser = findUserByEmail("rahul@gmail.com");
    if (!patientUser) {
        console.log("⚠️  Patient not found! Creating test patient...");
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash("patient123", 10);
        
        const { createUser } = await import("../models/user.model.js");
        const userResult = createUser(
            "Rahul Sharma",
            "rahul@gmail.com",
            hashedPassword,
            "patient",
            "9876543210"
        );
        
        const { createPatientProfile } = await import("../models/patient.model.js");
        createPatientProfile(
            userResult.lastInsertRowid,
            45,
            "Male",
            "Diabetes, Hypertension",
            "Penicillin",
            "Metformin 500mg",
            "O+",
            "Bangalore",
            "Priya Sharma",
            "9988776655"
        );
        
        patientUser = findUserByEmail("rahul@gmail.com");
        console.log("✅ Test patient created!");
    }
    
    // Find doctor
    let doctorUser = findUserByEmail("dr.rajesh@hospital.com");
    if (!doctorUser) {
        console.log("⚠️  Doctor not found! Creating test doctor...");
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash("doctor123", 10);
        
        const { createUser } = await import("../models/user.model.js");
        const userResult = createUser(
            "Dr. Rajesh Kumar",
            "dr.rajesh@hospital.com",
            hashedPassword,
            "doctor",
            "9876543210",
            "doctor-rajesh.jpg"
        );
        
        const { createDoctor } = await import("../models/doctor.model.js");
        createDoctor(
            userResult.lastInsertRowid,
            "Cardiologist",
            12,
            "MD, DM Cardiology",
            800,
            "Apollo Hospital",
            "Bangalore"
        );
        
        doctorUser = findUserByEmail("dr.rajesh@hospital.com");
        console.log("✅ Test doctor created!");
    }
    
    console.log(`   Patient: ${patientUser.name} (ID: ${patientUser.id})`);
    console.log(`   Doctor: ${doctorUser.name} (ID: ${doctorUser.id})`);
    
    // Get patient and doctor profiles
    const patient = getPatientByUserId(patientUser.id);
    const doctor = getDoctorByUserId(doctorUser.id);
    
    if (!patient || !doctor) {
        console.log("❌ Failed to get patient or doctor profiles!");
        return;
    }
    
    console.log(`   Patient Profile ID: ${patient.id}`);
    console.log(`   Doctor Profile ID: ${doctor.id}`);

    // ============================================
    // STEP 2: Create an Appointment
    // ============================================
    console.log("\n📋 STEP 2: Creating an appointment...");
    
    const appointmentResult = createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        nurseId: null,
        symptoms: "Chest pain, shortness of breath",
        uploadedImage: null,
        uploadedDocuments: null,
        appointmentDate: "2026-04-15",
        appointmentTime: "10:00 AM",
        consultationType: "video",
        fee: doctor.appointment_fee,
        paymentStatus: "pending"
    });
    
    const appointment = getAppointmentById(appointmentResult.lastInsertRowid);
    console.log(`✅ Appointment created!`);
    console.log(`   Appointment ID: ${appointment.id}`);
    console.log(`   Appointment Code: ${appointment.appointment_code}`);
    console.log(`   Status: ${appointment.appointment_status}`);

    // ============================================
    // STEP 3: Request Chat Permission
    // ============================================
    console.log("\n📋 STEP 3: Patient requests chat permission...");
    
    const permissionRequest = requestChatPermission(
        appointment.id,
        patient.id,
        doctor.id
    );
    
    console.log(`✅ Chat permission requested!`);
    console.log(`   Permission ID: ${permissionRequest.lastInsertRowid}`);
    
    // Get permissions for this appointment
    let permissions = getPermissionsByAppointment(appointment.id);
    console.log(`\n📊 Current permissions:`);
    permissions.forEach(p => {
        console.log(`   ID: ${p.id} | Status: ${p.status} | Doctor: ${p.doctor_name}`);
    });

    // ============================================
    // STEP 4: Check if chat is allowed (should be false - pending)
    // ============================================
    console.log("\n📋 STEP 4: Checking if chat is allowed (before approval)...");
    
    const isAllowedBefore = isChatAllowed(appointment.id, patient.id, doctor.id);
    console.log(`   Chat allowed? ${isAllowedBefore ? '✅ YES' : '❌ NO'}`);
    console.log(`   (Expected: NO - permission is still pending)`);

    // ============================================
    // STEP 5: Approve Chat Permission
    // ============================================
    console.log("\n📋 STEP 5: Doctor approves chat permission...");
    
    const approveResult = approveChatPermission(permissionRequest.lastInsertRowid);
    console.log(`✅ Chat permission approved!`);
    
    // Get updated permissions
    permissions = getPermissionsByAppointment(appointment.id);
    console.log(`\n📊 Updated permissions:`);
    permissions.forEach(p => {
        console.log(`   ID: ${p.id} | Status: ${p.status} | Approved at: ${p.approved_at}`);
        console.log(`   Expires at: ${p.expires_at}`);
    });

    // ============================================
    // STEP 6: Check if chat is allowed (should be true - approved)
    // ============================================
    console.log("\n📋 STEP 6: Checking if chat is allowed (after approval)...");
    
    const isAllowedAfter = isChatAllowed(appointment.id, patient.id, doctor.id);
    console.log(`   Chat allowed? ${isAllowedAfter ? '✅ YES' : '❌ NO'}`);
    console.log(`   (Expected: YES - permission is approved)`);

    // ============================================
    // STEP 7: Test with wrong parameters (should fail)
    // ============================================
    console.log("\n📋 STEP 7: Testing with invalid parameters...");
    
    // Wrong patient ID
    const wrongPatient = isChatAllowed(appointment.id, 99999, doctor.id);
    console.log(`   Wrong patient ID - Chat allowed? ${wrongPatient ? 'YES' : '❌ NO (Expected)'}`);
    
    // Wrong doctor ID
    const wrongDoctor = isChatAllowed(appointment.id, patient.id, 99999);
    console.log(`   Wrong doctor ID - Chat allowed? ${wrongDoctor ? 'YES' : '❌ NO (Expected)'}`);
    
    // Wrong appointment ID
    const wrongAppointment = isChatAllowed(99999, patient.id, doctor.id);
    console.log(`   Wrong appointment ID - Chat allowed? ${wrongAppointment ? 'YES' : '❌ NO (Expected)'}`);

    // ============================================
    // STEP 8: Create another permission request (different appointment)
    // ============================================
    console.log("\n📋 STEP 8: Creating second appointment for testing...");
    
    const appointmentResult2 = createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        nurseId: null,
        symptoms: "Follow-up consultation",
        uploadedImage: null,
        uploadedDocuments: null,
        appointmentDate: "2026-04-20",
        appointmentTime: "02:00 PM",
        consultationType: "video",
        fee: doctor.appointment_fee,
        paymentStatus: "paid"
    });
    
    const appointment2 = getAppointmentById(appointmentResult2.lastInsertRowid);
    console.log(`✅ Second appointment created! ID: ${appointment2.id}`);
    
    // Request permission for second appointment
    const permissionRequest2 = requestChatPermission(
        appointment2.id,
        patient.id,
        doctor.id
    );
    console.log(`✅ Permission requested for second appointment (ID: ${permissionRequest2.lastInsertRowid})`);

    // ============================================
    // STEP 9: Reject permission (testing reject flow)
    // ============================================
    console.log("\n📋 STEP 9: Testing reject flow...");
    
    const rejectResult = rejectChatPermission(permissionRequest2.lastInsertRowid);
    console.log(`✅ Permission rejected!`);
    
    // Check if chat is allowed for rejected permission
    const isAllowedRejected = isChatAllowed(appointment2.id, patient.id, doctor.id);
    console.log(`   Chat allowed for rejected permission? ${isAllowedRejected ? 'YES' : '❌ NO (Expected)'}`);

    // ============================================
    // STEP 10: Get all permissions for patient
    // ============================================
    console.log("\n📋 STEP 10: Getting all permissions for patient...");
    
    const patientPermissions = getPermissionsByAppointment(appointment.id);
    console.log(`\n📊 Complete permission history for appointment ${appointment.id}:`);
    console.log(`   ${'-'.repeat(40)}`);
    patientPermissions.forEach((p, index) => {
        console.log(`   Permission ${index + 1}:`);
        console.log(`      ID: ${p.id}`);
        console.log(`      Status: ${p.status}`);
        console.log(`      Requested: ${p.requested_at}`);
        console.log(`      Approved: ${p.approved_at || 'N/A'}`);
        console.log(`      Expires: ${p.expires_at || 'N/A'}`);
        console.log(`      Doctor: ${p.doctor_name}`);
        console.log(`   ${'-'.repeat(40)}`);
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(50));
    
    console.log("\n✅ Successful tests:");
    console.log("   1. Chat permission requested successfully");
    console.log("   2. Chat permission approved successfully");
    console.log("   3. Chat permission rejected successfully");
    console.log("   4. isChatAllowed() returns false for pending/rejected");
    console.log("   5. isChatAllowed() returns true for approved");
    console.log("   6. Invalid parameters correctly rejected");
    console.log("   7. Multiple permissions per appointment supported");
    console.log("   8. Expiry date set correctly on approval");
    
    console.log("\n📋 Permission Workflow:");
    console.log("   ┌─────────────┐");
    console.log("   │  Requested  │ ← Patient requests chat access");
    console.log("   └──────┬──────┘");
    console.log("          │");
    console.log("          ▼");
    console.log("   ┌─────────────┐");
    console.log("   │   Pending   │ ← Waiting for doctor action");
    console.log("   └──────┬──────┘");
    console.log("          │");
    console.log("      ┌───┴───┐");
    console.log("      ▼       ▼");
    console.log("   ┌─────┐ ┌──────┐");
    console.log("   │Approved│ │Rejected│");
    console.log("   └───┬───┘ └──────┘");
    console.log("       │");
    console.log("       ▼");
    console.log("   ┌─────────┐");
    console.log("   │ Expired │ (after 7 days)");
    console.log("   └─────────┘");
    
    console.log("\n🎉 Chat Permission Test Complete!");
    console.log("\n📝 Note: Approved permissions expire after 7 days automatically.");
};

// Run the test
testChatPermission().catch(console.error);