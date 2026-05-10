// Simple simulated notification service
// In a production app, this could use Twilio SMS, Push Notifications, or Socket.io

export const notifyDoctorsOfEmergency = (emergencyData, doctors) => {
    console.log(`\n🚨 EMERGENCY NOTIFICATION SYSTEM 🚨`);
    console.log(`Alerting ${doctors.length} doctors about Patient ${emergencyData.patientId}`);
    
    // Simulate sending notifications
    doctors.forEach(doc => {
        console.log(`-> Notification sent to Doctor ${doc.id} (${doc.name})`);
    });
    
    return true;
};
