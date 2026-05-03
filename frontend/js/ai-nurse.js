class AINurse {
    constructor() {
        this.RAG_API_URL = window.CONFIG && window.CONFIG.NODE_API ? `${window.CONFIG.NODE_API}/ai-nurse/chat` : "https://hospital-copilot1.onrender.com/api/ai-nurse/chat";
        this.AI_SERVICE_URL = window.CONFIG && window.CONFIG.AI_API ? window.CONFIG.AI_API.replace('/api', '') : "https://piyush9940-hospital-copilot-ai-service.hf.space";

        this.messages = [];
        this.sessionId = this.getOrCreateSessionId();
        this.isVoiceEnabled = false;
        this.isTTSEnabled = false;
        this.recognition = null;
        this.synth = window.speechSynthesis || null;
        this.pendingAttachments = [];
        this.language = localStorage.getItem("ai_nurse_language") || "en";
    }

    async initialize() {
        setupNavigation();
        this.loadChatHistory();
        this.setupBrowserVoiceRecognition();
        this.setupFileUpload();
        this.setupLanguageSelector();
        this.updateTTSButton();
        await this.loadVoices();
        
        this.checkSkinContext();
    }

    getOrCreateSessionId() {
        const savedSessionId = localStorage.getItem("ai_nurse_session_id");
        if (savedSessionId) return savedSessionId;

        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem("ai_nurse_session_id", newSessionId);
        return newSessionId;
    }

    getStorageKey() {
        return `chat_${this.sessionId}`;
    }

    checkSkinContext() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('fromSkin') === 'true') {
            const skinResultStr = sessionStorage.getItem('skin_result_context');
            if (skinResultStr) {
                try {
                    const skinResult = JSON.parse(skinResultStr);
                    const contextMsg = `I just used the skin disease detector. The result is: Predicted Class: ${skinResult.predicted_class}, Confidence: ${(skinResult.confidence * 100).toFixed(2)}%, Description: ${skinResult.description}. Precautions: ${skinResult.precautions}. Can you advise me on what to do next?`;
                    
                    // Clear the session storage so it doesn't trigger again
                    sessionStorage.removeItem('skin_result_context');
                    
                    // Auto send message
                    setTimeout(() => {
                        this.sendMessage(contextMsg);
                    }, 1000);
                } catch(e) {
                    console.error("Error parsing skin context", e);
                }
            }
        }
    }

    getToken() {
        if (window.Auth && typeof Auth.getToken === "function") {
            return Auth.getToken();
        }

        return (
            localStorage.getItem("token") ||
            localStorage.getItem("authToken") ||
            localStorage.getItem("jwt") ||
            ""
        );
    }

    loadChatHistory() {
        const saved = localStorage.getItem(this.getStorageKey());
        if (!saved) return;

        try {
            this.messages = JSON.parse(saved);
            this.renderMessages();
        } catch (error) {
            console.error("Failed to parse chat history:", error);
            this.messages = [];
        }
    }

    async sendMessage(text, attachments = []) {
        const trimmedText = (text || "").trim();
        if (!trimmedText && attachments.length === 0) return;

        const attachmentNames = attachments.map(file => file.name);
        this.addMessage("user", trimmedText || "Shared attachments", attachmentNames);
        this.showTypingIndicator();
        this.clearAttachmentPreview();

        try {
            let ragInput = trimmedText;

            if (trimmedText && this.language !== "en") {
                ragInput = await this.translateText(trimmedText, this.language, "en");
            }

            const ragResponse = await this.getAIResponse(ragInput,this.language);
            let aiText = this.extractAIText(ragResponse);

            if (this.language !== "en" && aiText) {
                aiText = await this.translateText(aiText, "en", this.language);
            }

            this.hideTypingIndicator();
            this.addMessage("ai", aiText, [], [
                "Tell me more",
                "Book appointment",
                "Emergency"
            ]);

            if (this.isTTSEnabled) {
                await this.speakResponse(aiText);
            }
        } catch (error) {
            console.error("AI Nurse send error:", error);
            this.hideTypingIndicator();
            this.addMessage("ai", error.message || "Sorry, I encountered an error. Please try again.");
        }
    }

    async getAIResponse(message) {
        try {
            const data = await API.post("/ai-nurse/chat", {
                message: message,
                language: this.language
            });
            return data;
        } catch (error) {
            throw new Error(error.message || "Failed to communicate with AI Nurse");
        }
    }

    extractAIText(response) {
        return (
            response?.data?.reply ||
            response?.reply ||
            response?.answer ||
            response?.message ||
            response?.text ||
            "I understand. Please tell me more."
        );
    }

    async translateText(text, sourceLang, targetLang) {
        try {
            const response = await API.post('/ai-nurse/translate', {
                text: text,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang
            });
            const translated = response.data?.translatedText;
            console.log("TRANSLATED:", translated); // remove after testing
            return translated || text;
        } catch (error) {
            console.error("Translation failed:", error);
            return text;
        }
    }

    async speakResponse(text) {
        if (!text || !text.trim()) return;
        

        // stop any ongoing speech

        
        const chunks = this.splitTextForTTS(text);

        for (const chunk of chunks) {
            await this.speakChunk(chunk);
        }
    }

    async speakChunk(text) {
        try{
            const response = await fetch(`${this.AI_SERVICE_URL}/tts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text,
                    language: this.language
                })
            });

            if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
            
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);

                await new Promise((resolve) => {
                    audio.onended = () => {
                        URL.revokeObjectURL(audioUrl);
                        resolve();
                    };
                    audio.onerror = resolve;
                    audio.play().catch(e => {
                        console.warn("Autoplay blocked for TTS:", e);
                        resolve();
                    });
                });
        } catch(error){
            console.error("TTS failed:", error);
        }
    
        
    }

    splitTextForTTS(text) {
        const maxLen = 180;
        const sentences = text.split(/(?<=[।.!?])\s+/);
        const chunks = [];
        let current = "";

        for (const sentence of sentences) {
            if ((current + " " + sentence).trim().length <= maxLen) {
                current += " " + sentence;
            } else {
                if (current.trim()) chunks.push(current.trim());
                current = sentence;
            }
        }

        if (current.trim()) chunks.push(current.trim());
        return chunks.length ? chunks : [text];
    }

    mapLanguageForBrowser(lang) {
        const map = {
            en: "en-US",
            hi: "hi-IN",
            kn: "kn-IN",
            ta: "ta-IN",
            te: "te-IN"
        };
        return map[lang] || "en-US";
    }

// Call this once on initialize to pre-load voices
    loadVoices() {
        return new Promise((resolve) => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length) { resolve(voices); return; }

            window.speechSynthesis.onvoiceschanged = () => {
                resolve(window.speechSynthesis.getVoices());
            };
        });
    }
    browserSpeakFallback(text, lang, resolve) {
        if (!this.synth) { resolve(); return; }

        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        this.synth.speak(utterance);
    }



    addMessage(type, text, attachments = [], suggestions = []) {
        const message = {
            id: Date.now() + Math.random(),
            type,
            text,
            attachments,
            suggestions,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        this.renderMessage(message);
        this.saveChatHistory();
        this.scrollToBottom();

        if (type === "ai" && suggestions.length > 0) {
            this.updateQuickSuggestions(suggestions);
        }
    }

    renderMessage(message) {
        const container = document.getElementById("chatMessages");
        if (!container) return;

        const messageEl = document.createElement("div");
        messageEl.className = `message ${message.type}-message`;

        let attachmentsHtml = "";
        if (message.attachments?.length > 0) {
            attachmentsHtml = `
                <div class="message-attachments">
                    ${message.attachments.map(file => `
                        <div class="attachment-item">
                            <span>📎 ${this.escapeHtml(file)}</span>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        const formattedContent =
            message.type === "ai"
                ? this.formatStructuredAIResponse(message.text)
                : `<p>${this.escapeHtml(message.text).replace(/\n/g, "<br>")}</p>`;

        messageEl.innerHTML = `
            <div class="message-avatar">${message.type === "ai" ? "🤖" : "👤"}</div>
            <div class="message-content">
                ${formattedContent}
                ${attachmentsHtml}
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            </div>
        `;

        container.appendChild(messageEl);
        this.scrollToBottom();
    }

    renderMessages() {
        const container = document.getElementById("chatMessages");
        if (!container) return;

        container.innerHTML = "";
        if (!this.messages.length) {
            container.innerHTML = `
                <div class="message ai-message">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <p>Hello! I'm your AI Health Assistant. How can I help you today?</p>
                        <span class="message-time">Just now</span>
                    </div>
                </div>
            `;
            return;
        }

        this.messages.forEach(msg => this.renderMessage(msg));
    }

    formatStructuredAIResponse(text) {
        if (!text) return "<p>No response available.</p>";

        const safeText = this.escapeHtml(text);
        const lines = safeText.split("\n").map(line => line.trim()).filter(Boolean);

        let html = "";
        let inList = false;

        const closeList = () => {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
        };

        const headings = [
            "Summary:",
            "Possible causes:",
            "What you can do now:",
            "When to see a doctor:",
            "Emergency signs:",
            "Follow-up question:"
        ];

        const isHeading = (line) => headings.includes(line);

        for (const line of lines) {
            if (isHeading(line)) {
                closeList();
                html += `<div class="ai-section-title">${line}</div>`;
                continue;
            }

            if (line.startsWith("- ") || line.startsWith("• ") || /^\d+\./.test(line)) {
                if (!inList) {
                    html += `<ul class="ai-section-list">`;
                    inList = true;
                }

                const cleaned = line
                    .replace(/^- /, "")
                    .replace(/^• /, "")
                    .replace(/^\d+\.\s*/, "");

                html += `<li>${cleaned}</li>`;
                continue;
            }

            closeList();
            html += `<p class="ai-section-text">${line}</p>`;
        }

        closeList();
        return html;
    }

    showTypingIndicator() {
        const container = document.getElementById("chatMessages");
        if (!container || document.getElementById("typingIndicator")) return;

        const indicator = document.createElement("div");
        indicator.className = "message ai-message typing-indicator";
        indicator.id = "typingIndicator";
        indicator.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </div>
            </div>
        `;
        container.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById("typingIndicator");
        if (indicator) indicator.remove();
    }

    updateQuickSuggestions(suggestions) {
        const container = document.getElementById("quickSuggestions");
        if (!container) return;

        container.innerHTML = suggestions.map(s => `
            <button class="suggestion-chip" onclick="sendQuickMessage('${this.escapeForOnclick(s)}')">${this.escapeHtml(s)}</button>
        `).join("");
    }

    setupBrowserVoiceRecognition() {
        // We now use MediaRecorder directly in toggleVoice
        // to send audio to our powerful backend AI STT model
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    async toggleVoice() {
        const btn = document.getElementById("voiceBtn");

        if (this.isVoiceEnabled) {
            // Stop recording
            this.isVoiceEnabled = false;
            btn?.classList.remove("active");
            if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
                this.mediaRecorder.stop();
            }
            Toast.show("Processing voice...", "info");
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };

                this.mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());
                    
                    await this.transcribeAudioBlob(audioBlob);
                };

                this.mediaRecorder.start();
                this.isVoiceEnabled = true;
                btn?.classList.add("active");
                Toast.show("Listening... Click again to stop.", "success");

            } catch (err) {
                console.error("Microphone access error:", err);
                Toast.show("Could not access microphone. Please allow permissions.", "error");
            }
        }
    }

    async transcribeAudioBlob(blob) {
        try {
            const formData = new FormData();
            formData.append("file", blob, "voice_recording.webm");

            const response = await fetch(`${this.AI_SERVICE_URL}/stt`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.detail || `STT error: ${response.status}`);
            }

            const transcript = data?.text || "";
            if (transcript && transcript.trim()) {
                const input = document.getElementById("messageInput");
                if (input) input.value = transcript;
                await this.sendMessage(transcript);
                if (input) input.value = "";
            } else {
                Toast.show("Could not transcribe audio. Please try speaking again.", "warning");
            }
        } catch (error) {
            console.error("STT failed:", error);
            Toast.show("Audio transcription failed", "error");
        }
    }

    toggleTTS() {
        this.isTTSEnabled = !this.isTTSEnabled;
        this.updateTTSButton();
        Toast.show(
            this.isTTSEnabled ? "Voice responses enabled" : "Voice responses disabled",
            "info"
        );
    }

    updateTTSButton() {
        const btn = document.getElementById("ttsBtn");
        if (!btn) return;
        btn.classList.toggle("active", this.isTTSEnabled);
    }

    saveChatHistory() {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.messages));
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    scrollToBottom() {
        const container = document.getElementById("chatMessages");
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    clearChat() {
        if (!confirm("Clear chat history?")) return;

        localStorage.removeItem(this.getStorageKey());
        this.messages = [];
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem("ai_nurse_session_id", this.sessionId);
        this.renderMessages();
        this.updateQuickSuggestions([
            "I have a headache",
            "I have fever",
            "I have cough",
            "Book appointment"
        ]);
        Toast.show("Chat history cleared", "success");
    }

    setupFileUpload() {
        const fileInput = document.getElementById("fileInput");
        if (!fileInput || fileInput.dataset.bound === "true") return;

        fileInput.dataset.bound = "true";

        fileInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files || []);
            this.pendingAttachments = files;
            this.renderAttachmentPreview(files);

            const audioFile = files.find(file => file.type.startsWith("audio/"));
            if (audioFile) {
                await this.transcribeAudioFile(audioFile);
            }
        });
    }

    async transcribeAudioFile(file) {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${this.AI_SERVICE_URL}/stt`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.detail || `STT error: ${response.status}`);
            }

            const transcript = data?.text || "";
            const input = document.getElementById("messageInput");
            if (input && transcript) {
                input.value = transcript;
                Toast.show("Audio converted to text", "success");
            }
        } catch (error) {
            console.error("STT failed:", error);
            Toast.show("Audio transcription failed", "error");
        }
    }

    renderAttachmentPreview(files) {
        const preview = document.getElementById("attachmentPreview");
        if (!preview) return;

        preview.innerHTML = files.map(file => `
            <div class="attachment-item">📎 ${this.escapeHtml(file.name)}</div>
        `).join("");
    }

    clearAttachmentPreview() {
        this.pendingAttachments = [];
        const preview = document.getElementById("attachmentPreview");
        const fileInput = document.getElementById("fileInput");
        if (preview) preview.innerHTML = "";
        if (fileInput) fileInput.value = "";
    }

    setupLanguageSelector() {
        const select = document.getElementById("languageSelect");
        if (!select) return;

        select.value = this.language;
        select.addEventListener("change", (e) => {
            this.language = e.target.value;
            localStorage.setItem("ai_nurse_language", this.language);
            this.setupBrowserVoiceRecognition();
            Toast.show(`Language changed to ${e.target.options[e.target.selectedIndex].text}`, "success");
        });
    }

    escapeHtml(text) {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    escapeForOnclick(text) {
        return String(text ?? "").replace(/'/g, "\\'");
    }
}

const aiNurse = new AINurse();

function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input?.value?.trim() || "";
    const attachments = [...aiNurse.pendingAttachments];

    if (text || attachments.length > 0) {
        aiNurse.sendMessage(text, attachments);
        if (input) input.value = "";
    }
}

function sendQuickMessage(text) {
    aiNurse.sendMessage(text);
}

function handleKeyPress(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function toggleVoice() {
    aiNurse.toggleVoice();
}

function toggleTTS() {
    aiNurse.toggleTTS();
}

function clearChat() {
    aiNurse.clearChat();
}

function triggerFileUpload() {
    document.getElementById("fileInput")?.click();
}

function setupNavigation() {
    const navMenu = document.getElementById("navMenu");
    if (!navMenu || !window.Auth) return;

    const role = Auth.getRole();

    const navItems = {
        patient: [
            { url: "patient-dashboard.html", label: "Dashboard" },
            { url: "appointment-list.html", label: "Book Appointment" },
            { url: "patient-reports.html", label: "Reports" },
            { url: "ai-nurse.html", label: "AI Nurse" }
        ],
        doctor: [
            { url: "doctor-dashboard.html", label: "Dashboard" },
            { url: "doctor-appointments.html", label: "Appointments" },
            { url: "doctor-patient-view.html", label: "Patients" },
            { url: "ai-nurse.html", label: "AI Nurse" }
        ],
        nurse: [
            { url: "nurse-dashboard.html", label: "Dashboard" },
            { url: "nurse-patient-queue.html", label: "Patient Queue" },
            { url: "ai-nurse.html", label: "AI Nurse" }
        ]
    };

    const items = navItems[role] || [];
    navMenu.innerHTML = items.map(item => `
        <a href="${item.url}" class="nav-link">${item.label}</a>
    `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    if (requireRole(["patient", "doctor", "nurse"])) {
        aiNurse.initialize();
    }
});