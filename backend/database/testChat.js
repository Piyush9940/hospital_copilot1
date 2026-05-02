import { 
    createChatSession, saveMessage, getMessagesBySessionId,
    getSessionsByUserId, searchMessages 
} from "../models/chat.model.js";
import { findUserByEmail } from "../models/user.model.js";

const testChat = async () => {
    console.log("🧪 Testing AI Nurse Chat...\n");

    // Get patient user
    const user = findUserByEmail("rahul@gmail.com");
    
    if (!user) {
        console.log("❌ Please run testPatientFull.js first!");
        return;
    }
    
    // Create chat session
    const session = createChatSession(user.id, null, "Health Concerns");
    console.log("✅ Chat session created with ID:", session.lastInsertRowid);
    
    // Save user message
    saveMessage(
        session.lastInsertRowid,
        user.id,
        "user",
        "I have chest pain and feeling very tired lately. Should I be worried?"
    );
    console.log("✅ User message saved");
    
    // Save AI response
    saveMessage(
        session.lastInsertRowid,
        user.id,
        "assistant",
        "Based on your medical history of diabetes and hypertension, chest pain with fatigue could be serious. I strongly recommend you consult a cardiologist immediately. Would you like me to help you book an appointment?",
        JSON.stringify({
            symptoms: ["chest pain", "fatigue"],
            urgencyLevel: "high",
            suggestedAction: "Immediate doctor consultation"
        })
    );
    console.log("✅ AI response saved");
    
    // Get all messages
    const messages = getMessagesBySessionId(session.lastInsertRowid);
    console.log(`\n📋 Chat History (${messages.length} messages):`);
    messages.forEach(msg => {
        console.log(`   ${msg.role}: ${msg.content.substring(0, 80)}...`);
    });
    
    // Get all sessions
    const sessions = getSessionsByUserId(user.id);
    console.log(`\n📁 Total sessions: ${sessions.length}`);
    
    console.log("\n🎉 Chat test complete!");
};

testChat();