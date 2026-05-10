document.addEventListener("DOMContentLoaded", () => {
    const requestsGrid = document.getElementById("requestsGrid");
    const requestsSection = document.getElementById("requestsSection");
    const activeEmergencySection = document.getElementById("activeEmergencySection");
    const aiSummaryContent = document.getElementById("aiSummaryContent");
    const ragChatBox = document.getElementById("ragChatBox");
    const ragQueryInput = document.getElementById("ragQueryInput");
    const ragQueryBtn = document.getElementById("ragQueryBtn");
    const endEmergencyBtn = document.getElementById("endEmergencyBtn");

    let currentEmergencyId = null;
    let currentPatientData = null;
    let pollInterval = null;
    const ACTIVE_EMERGENCY_KEY = "doctor_active_emergency";
    const RAG_CHAT_MEMORY_PREFIX = "doctor_emergency_rag_chat_";

    const API_URL = typeof API_BASE_URL !== 'undefined' ? `${API_BASE_URL}/v2/emergency` : "http://127.0.0.1:5000/api/v2/emergency";

    // Set Doctor Name and Avatar dynamically
    const user = typeof window.Auth !== 'undefined' ? window.Auth.getUser() : null;
    if (user && user.name) {
        const docNameStr = "Dr. " + user.name.replace(/^Dr\.\s*/i, '');
        document.getElementById("docName").textContent = docNameStr;
        const avatarImg = document.querySelector(".doc-profile img");
        if (avatarImg) {
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name.replace(/^Dr\.\s*/i, ''))}&background=0D8ABC&color=fff`;
        }
    } else {
        document.getElementById("docName").textContent = "Dr. Doctor";
    }

    // Start polling for new emergencies
    if (!restoreActiveEmergency()) {
        startPolling();
    }

    function startPolling() {
        fetchEmergencies();
        fetchPastEmergencies();
        pollInterval = setInterval(() => {
            fetchEmergencies();
            fetchPastEmergencies();
        }, 5000);
    }

    function stopPolling() {
        if(pollInterval) clearInterval(pollInterval);
    }

    function saveActiveEmergency(payload) {
        try {
            sessionStorage.setItem(ACTIVE_EMERGENCY_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn("Could not save active emergency state:", error);
        }
    }

    function clearActiveEmergency() {
        try {
            sessionStorage.removeItem(ACTIVE_EMERGENCY_KEY);
            if (currentEmergencyId) {
                sessionStorage.removeItem(getRagChatMemoryKey(currentEmergencyId));
            }
        } catch (error) {
            console.warn("Could not clear active emergency state:", error);
        }
    }

    function restoreActiveEmergency() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(ACTIVE_EMERGENCY_KEY) || "null");
            if (!saved || !saved.emergencyId || !saved.patient) return false;

            currentEmergencyId = saved.emergencyId;
            currentPatientData = saved.patient;
            showActiveEmergency(saved);
            return true;
        } catch (error) {
            console.warn("Could not restore active emergency state:", error);
            clearActiveEmergency();
            return false;
        }
    }

    function showActiveEmergency(data) {
        requestsSection.classList.add("hidden");
        activeEmergencySection.classList.remove("hidden");

        if (data.patient?.patientId) {
            fetchPatientReports(data.patient.patientId);
        }

        if (data.summary) {
            let riskBadge = '';
            if (data.riskLevel) {
                const color = String(data.riskLevel).toLowerCase() === 'high' ? '#ef4444' : (String(data.riskLevel).toLowerCase() === 'medium' ? '#f59e0b' : '#10b981');
                riskBadge = `<span style="display:inline-block; margin-bottom: 15px; background-color:${color};color:white;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;">Risk Level: ${data.riskLevel}</span><br>`;
            }
            aiSummaryContent.innerHTML = riskBadge + markedToHtml(data.summary);
        }

        restoreRagChatMemory();
    }

    async function fetchEmergencies() {
        try {
            const token = typeof window.Auth !== 'undefined' ? window.Auth.getToken() : localStorage.getItem("hospital_copilot_token") || "";
            const response = await fetch(`${API_URL}/pending`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (data.success && data.emergencies.length > 0) {
                renderRequests(data.emergencies);
            } else {
                requestsGrid.innerHTML = `<div class="empty-state">No active emergencies at the moment.</div>`;
            }
        } catch (error) {
            console.error("Error fetching emergencies:", error);
        }
    }

    async function fetchPastEmergencies() {
        try {
            const token = typeof window.Auth !== 'undefined' ? window.Auth.getToken() : localStorage.getItem("hospital_copilot_token") || "";
            const response = await fetch(`${API_URL}/past`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (data.success && data.emergencies.length > 0) {
                renderPastRequests(data.emergencies);
            } else {
                document.getElementById("pastRequestsGrid").innerHTML = `<div class="empty-state">No past emergencies found.</div>`;
            }
        } catch (error) {
            console.error("Error fetching past emergencies:", error);
        }
    }

    function renderRequests(emergencies) {
        requestsGrid.innerHTML = emergencies.map(em => `
            <div class="request-card">
                <div class="req-header">
                    <h4>Emergency #${em.id}</h4>
                    <span class="badge pending">PENDING</span>
                </div>
                <div class="req-body">
                    <p><strong>Patient:</strong> ${em.patient_name} (Age: ${em.age || 'N/A'})</p>
                    <p><strong>Location:</strong> ${em.location_address}</p>
                    <p class="req-time">Time: ${new Date(em.created_at).toLocaleTimeString()}</p>
                </div>
                <div class="req-actions">
                    <button class="btn-accept" onclick="acceptEmergency(${em.id})"><i class="fa-solid fa-check"></i> Accept</button>
                    <button class="btn-reject" onclick="rejectEmergency(${em.id})"><i class="fa-solid fa-xmark"></i> Reject</button>
                </div>
            </div>
        `).join("");
    }

    function renderPastRequests(emergencies) {
        document.getElementById("pastRequestsGrid").innerHTML = emergencies.map(em => `
            <div class="request-card past-request">
                <div class="req-header">
                    <h4>Emergency #${em.id}</h4>
                    <span class="badge ${em.status}">${em.status.toUpperCase()}</span>
                </div>
                <div class="req-body">
                    <p><strong>Patient:</strong> ${em.patient_name} (Age: ${em.age || 'N/A'})</p>
                    <p><strong>Status:</strong> ${em.status}</p>
                    <p class="req-time">Updated: ${new Date(em.updated_at).toLocaleTimeString()}</p>
                </div>
            </div>
        `).join("");
    }

    window.acceptEmergency = async (id) => {
        stopPolling();
        requestsGrid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Accepting Emergency...</div>`;
        
        try {
            const token = typeof window.Auth !== 'undefined' ? window.Auth.getToken() : localStorage.getItem("hospital_copilot_token") || "";
            const response = await fetch(`${API_URL}/accept`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ emergencyId: id })
            });
            const data = await response.json();
            
            if (data.success) {
                currentEmergencyId = id;
                currentPatientData = data.patient;

                saveActiveEmergency({
                    emergencyId: id,
                    patient: data.patient,
                    summary: data.summary,
                    riskLevel: data.riskLevel
                });
                showActiveEmergency({
                    emergencyId: id,
                    patient: data.patient,
                    summary: data.summary,
                    riskLevel: data.riskLevel
                });

                if (!data.summary) {
                    aiSummaryContent.innerHTML = `<div class="text-danger">Failed to generate AI summary.</div>`;
                }
            } else {
                alert("Failed to accept: " + data.message);
                startPolling();
            }
        } catch (error) {
            console.error("Accept error:", error);
            startPolling();
        }
    };

    window.rejectEmergency = async (id) => {
        try {
            const token = typeof window.Auth !== 'undefined' ? window.Auth.getToken() : localStorage.getItem("hospital_copilot_token") || "";
            await fetch(`${API_URL}/reject`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ emergencyId: id })
            });
            fetchEmergencies();
        } catch(e) {
            console.error("Reject error", e);
        }
    };

    endEmergencyBtn.addEventListener("click", () => {
        if(confirm("Are you sure you want to end this emergency session?")) {
            clearActiveEmergency();
            activeEmergencySection.classList.add("hidden");
            requestsSection.classList.remove("hidden");
            currentEmergencyId = null;
            currentPatientData = null;
            ragChatBox.innerHTML = '<div class="chat-msg system">Ask any question regarding the patient...</div>';
            startPolling();
        }
    });

    ragQueryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handleRagQuery();
    });
    ragQueryInput.addEventListener("keypress", (e) => {
        if(e.key === 'Enter') {
            e.preventDefault();
            handleRagQuery();
        }
    });

    async function handleRagQuery() {
        const query = ragQueryInput.value.trim();
        if(!query || !currentPatientData) return;

        appendMessage("doctor", query);
        ragQueryInput.value = "";
        
        const loaderId = "loader-" + Date.now();
        appendMessage("ai", `<i class="fa-solid fa-ellipsis fa-fade"></i>`, loaderId);

        try {
            const token = typeof window.Auth !== 'undefined' ? window.Auth.getToken() : localStorage.getItem("hospital_copilot_token") || "";
            const response = await fetch(`${API_URL}/rag`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    emergencyId: currentEmergencyId,
                    patientId: currentPatientData.patientId,
                    question: query,
                    patientData: {
                        patientId: currentPatientData.patientId,
                        medicalContext: currentPatientData.medicalContext || currentPatientData.summary || null,
                        age: currentPatientData.age,
                        gender: currentPatientData.gender,
                        history: currentPatientData.history,
                        allergies: currentPatientData.allergies,
                        medications: currentPatientData.medications,
                        reports: currentPatientData.reports
                    }
                })
            });
            
            const data = await response.json();
            document.getElementById(loaderId)?.remove();
            
            if (response.ok && data.success) {
                const result = data.data || data;
                const answer = extractRagAnswer(result, data);
                const highlightsHtml = Array.isArray(result.reportHighlights) && result.reportHighlights.length
                    ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(15, 43, 61, 0.15);">
                        <strong>Report highlights considered:</strong><br>
                        ${result.reportHighlights.map(item => `&bull; ${escapeHtml(item)}`).join("<br>")}
                    </div>`
                    : "";
                appendMessage("ai", markedToHtml(answer || "No response returned.") + highlightsHtml);
            } else {
                appendMessage("system text-danger", data.message || data.detail || "Error generating response.");
            }
        } catch (error) {
            document.getElementById(loaderId)?.remove();
            console.error("Emergency RAG error:", error);
            appendMessage("system text-danger", "Network error interacting with backend AI proxy.");
        }
    }

    function appendMessage(role, content, id = null) {
        const div = document.createElement("div");
        div.className = `chat-msg ${role}`;
        if(id) div.id = id;
        div.innerHTML = content;
        ragChatBox.appendChild(div);
        ragChatBox.scrollTop = ragChatBox.scrollHeight;
        if (!id) saveRagChatMemory();
    }

    function getRagChatMemoryKey(emergencyId = currentEmergencyId) {
        return `${RAG_CHAT_MEMORY_PREFIX}${emergencyId || "none"}`;
    }

    function saveRagChatMemory() {
        if (!currentEmergencyId) return;

        try {
            const messages = Array.from(ragChatBox.querySelectorAll(".chat-msg"))
                .filter((item) => !item.id)
                .map((item) => ({
                    role: item.className.replace(/^chat-msg\s*/, ""),
                    content: item.innerHTML,
                }));
            sessionStorage.setItem(getRagChatMemoryKey(), JSON.stringify(messages));
        } catch (error) {
            console.warn("Could not save emergency assistant chat:", error);
        }
    }

    function restoreRagChatMemory() {
        if (!currentEmergencyId) return;

        try {
            const savedMessages = JSON.parse(sessionStorage.getItem(getRagChatMemoryKey()) || "[]");
            if (!Array.isArray(savedMessages) || savedMessages.length === 0) return;

            ragChatBox.innerHTML = "";
            savedMessages.forEach((message) => {
                const div = document.createElement("div");
                div.className = `chat-msg ${message.role || "system"}`;
                div.innerHTML = message.content || "";
                ragChatBox.appendChild(div);
            });
            ragChatBox.scrollTop = ragChatBox.scrollHeight;
        } catch (error) {
            console.warn("Could not restore emergency assistant chat:", error);
        }
    }

    function extractRagAnswer(result, data) {
        return normalizeAnswerText(
            result?.response ||
            result?.answer ||
            result?.reply ||
            result?.message ||
            data?.response ||
            data?.answer ||
            data?.reply ||
            result?.ragResponse?.response ||
            result?.ragResponse?.answer ||
            result?.ragResponse?.reply
        );
    }

    function normalizeAnswerText(value) {
        if (typeof value === "string") return value;
        if (!value || typeof value !== "object") return "";
        return normalizeAnswerText(value.response || value.answer || value.reply || value.message);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function markedToHtml(text) {
        // Very basic markdown to html for bullet points and bold
        let html = String(text || "").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\n\*/g, '<br>•');
        html = html.replace(/\n-/g, '<br>•');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    // Fetch Patient Reports dynamically
    async function fetchPatientReports(patientId) {
        const reportsContainer = document.getElementById("patientReportsContent");
        try {
            const token = typeof window.Auth !== 'undefined' ? window.Auth.getToken() : localStorage.getItem("hospital_copilot_token") || "";
            const reportsApiUrl = API_URL.replace('/v2/emergency', '/reports/patient') + '/' + patientId;
            const response = await fetch(reportsApiUrl, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success && data.data && data.data.length > 0) {
                reportsContainer.innerHTML = data.data.map(r => {
                    const pdfPath = r.pdf_url || r.pdfUrl || r.pdf_path || r.pdfPath;
                    return `
                    <div style="background: #f8fafc; border-left: 4px solid #2c7cb6; padding: 12px; margin-bottom: 12px; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="color: #0f2b3d; font-size: 1.05rem;">${r.diagnosis || 'Medical Report'}</strong>
                            <span style="font-size: 0.8rem; color: #64748b;"><i class="fa-regular fa-calendar"></i> ${new Date(r.createdAt || r.date || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <span style="background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: uppercase;">${r.type || 'General'}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: #334155; margin-bottom: 10px;"><strong>Summary:</strong> ${r.summary || 'No summary details provided.'}</p>
                        ${pdfPath ? `
                            <button onclick="window.open('${pdfPath.startsWith('http') ? pdfPath : (typeof CONFIG !== 'undefined' && CONFIG.NODE_API ? CONFIG.NODE_API.replace('/api', '') : 'http://127.0.0.1:5000') + pdfPath}', '_blank')" style="background: #dcfce7; color: #166534; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-weight: bold;">
                                <i class="fa-solid fa-download"></i> Download / View
                            </button>
                        ` : '<span style="font-size: 0.8rem; color: #94a3b8;"><i class="fa-solid fa-file-excel"></i> No file attached</span>'}
                    </div>
                `}).join("");
            } else {
                reportsContainer.innerHTML = `<div style="text-align: center; color: #64748b; padding: 1rem;"><i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>No past medical reports available for this patient.</div>`;
            }
        } catch (err) {
            reportsContainer.innerHTML = `<div style="color: #dc2626; padding: 1rem;"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load medical reports.</div>`;
            console.error("Error fetching reports:", err);
        }
    }
});
