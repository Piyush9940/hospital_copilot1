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
                riskBadge = `<span class="risk-badge ${getRiskClass(data.riskLevel)}">Risk Level: ${escapeHtml(data.riskLevel)}</span><br>`;
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
                    <h4>Emergency #${escapeHtml(em.id)}</h4>
                    <span class="badge pending">PENDING</span>
                </div>
                <div class="req-body">
                    <p><strong>Patient:</strong> ${escapeHtml(em.patient_name || "Unknown")} (Age: ${escapeHtml(em.age || "N/A")})</p>
                    <p><strong>Location:</strong> ${escapeHtml(em.location_address || "Location not available")}</p>
                    <p class="req-time"><i class="fa-regular fa-clock"></i> ${formatDateTime(em.created_at)}</p>
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
                    <h4>Emergency #${escapeHtml(em.id)}</h4>
                    <span class="badge ${escapeHtml(em.status || "unknown")}">${escapeHtml(String(em.status || "unknown").toUpperCase())}</span>
                </div>
                <div class="req-body">
                    <p><strong>Patient:</strong> ${escapeHtml(em.patient_name || "Unknown")} (Age: ${escapeHtml(em.age || "N/A")})</p>
                    <p><strong>Status:</strong> ${escapeHtml(em.status || "unknown")}</p>
                    <p class="req-time"><i class="fa-regular fa-clock"></i> Updated ${formatDateTime(em.updated_at)}</p>
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
                    ? `<div class="report-highlights">
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
        html = html.replace(/\n\*/g, '<br>&bull;');
        html = html.replace(/\n-/g, '<br>&bull;');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function getRiskClass(riskLevel) {
        const value = String(riskLevel || "").toLowerCase();
        if (value === "high") return "risk-high";
        if (value === "medium") return "risk-medium";
        if (value === "low") return "risk-low";
        return "risk-unknown";
    }

    function formatDateTime(value) {
        const date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime())) return "Time not available";
        return date.toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
                    const reportUrl = pdfPath
                        ? (pdfPath.startsWith('http') ? pdfPath : (typeof CONFIG !== 'undefined' && CONFIG.NODE_API ? CONFIG.NODE_API.replace('/api', '') : 'http://127.0.0.1:5000') + pdfPath)
                        : "";
                    return `
                    <div class="report-card">
                        <div class="report-card-header">
                            <strong class="report-card-title">${escapeHtml(r.diagnosis || 'Medical Report')}</strong>
                            <span class="report-date"><i class="fa-regular fa-calendar"></i> ${escapeHtml(formatDateOnly(r.createdAt || r.date || Date.now()))}</span>
                        </div>
                        <span class="report-type">${escapeHtml(r.type || 'General')}</span>
                        <p class="report-summary"><strong>Summary:</strong> ${escapeHtml(r.summary || 'No summary details provided.')}</p>
                        ${pdfPath ? `
                            <button class="report-action" data-report-url="${escapeHtml(reportUrl)}">
                                <i class="fa-solid fa-download"></i> Download / View
                            </button>
                        ` : '<span class="report-missing"><i class="fa-solid fa-file-excel"></i> No file attached</span>'}
                    </div>
                `}).join("");
            } else {
                reportsContainer.innerHTML = `<div class="report-empty"><i class="fa-solid fa-folder-open"></i>No past medical reports available for this patient.</div>`;
            }
        } catch (err) {
            reportsContainer.innerHTML = `<div class="report-error"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load medical reports.</div>`;
            console.error("Error fetching reports:", err);
        }
    }

    document.getElementById("patientReportsContent")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-report-url]");
        if (!button) return;
        const url = button.getAttribute("data-report-url");
        if (url) window.open(url, "_blank");
    });

    function formatDateOnly(value) {
        const date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime())) return "Date not available";
        return date.toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
});
