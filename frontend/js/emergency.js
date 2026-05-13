document.addEventListener("DOMContentLoaded", () => {
    const triggerBtn = document.getElementById("triggerEmergencyBtn");
    const statusPanel = document.getElementById("statusPanel");
    const locationStatus = document.getElementById("locationStatus");
    const requestStatus = document.getElementById("requestStatus");
    const hospitalsList = document.getElementById("hospitalsList");
    const hospitalCount = document.getElementById("hospitalCount");
    const emergencyForm = document.getElementById("emergencyForm");
    const responseSteps = document.getElementById("responseSteps");

    if (!triggerBtn || !statusPanel || !locationStatus || !requestStatus || !hospitalsList) {
        return;
    }

    let pollInterval = null;
    let recognition = null;

    const apiBaseUrl = typeof API_BASE_URL !== "undefined"
        ? API_BASE_URL
        : (window.CONFIG?.NODE_API || "http://127.0.0.1:5000/api");
    const API_URL = `${apiBaseUrl}/v2/emergency`;

    document.querySelectorAll(".quick-context button[data-context]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById("medicalContext");
            const context = button.dataset.context || "";
            if (!input || !context) return;
            input.value = input.value.trim() ? `${input.value.trim()}\n${context}` : context;
            input.focus();
        });
    });

    const handleEmergencySubmit = async (event) => {
        event?.preventDefault?.();

        triggerBtn.disabled = true;
        triggerBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span> PROCESSING...</span>`;
        statusPanel.classList.remove("hidden");
        requestStatus.textContent = "Acquiring location...";
        setStep("location");

        const medicalContext = document.getElementById("medicalContext")?.value || "";
        const manualLoc = document.getElementById("manualLocation")?.value?.trim();

        if (manualLoc) {
            locationStatus.textContent = `Location: ${manualLoc}`;
            await sendEmergencyRequest(0, 0, medicalContext, manualLoc);
            return;
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    locationStatus.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                    await sendEmergencyRequest(lat, lng, medicalContext);
                },
                () => {
                    locationStatus.textContent = "Location access denied. Please enter manual location above.";
                    resetTriggerButton("TRIGGER EMERGENCY");
                }
            );
        } else {
            locationStatus.textContent = "Geolocation not supported. Please enter manual location above.";
            resetTriggerButton("TRIGGER EMERGENCY");
        }
    };

    if (emergencyForm) {
        emergencyForm.addEventListener("submit", handleEmergencySubmit);
    } else {
        triggerBtn.addEventListener("click", handleEmergencySubmit);
    }

    async function sendEmergencyRequest(lat, lng, medicalContext, address = "Auto-detected Location") {
        requestStatus.innerHTML = `<span class="text-warning">Sending request to available doctors...</span>`;
        setStep("dispatch");

        try {
            const token = typeof window.Auth !== "undefined"
                ? window.Auth.getToken()
                : localStorage.getItem("token") || "";
            const response = await fetch(`${API_URL}/trigger`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    latitude: lat,
                    longitude: lng,
                    address,
                    medicalContext,
                }),
            });

            const data = await response.json();
            if (data.success) {
                requestStatus.innerHTML = `<span class="text-warning">Request pending. Waiting for a doctor to accept...</span>`;
                setStep("doctor");
                renderHospitals(data.hospitals || []);
                pollEmergencyStatus(data.emergencyId);
                return;
            }

            requestStatus.innerHTML = `<span class="text-danger">Failed: ${escapeHtml(data.message || "Unknown error")}</span>`;
            resetTriggerButton("TRIGGER EMERGENCY");
        } catch (error) {
            requestStatus.innerHTML = `<span class="text-danger">Network error: ${escapeHtml(error.message)}. Please call local emergency services.</span>`;
            resetTriggerButton("TRIGGER EMERGENCY");
        }
    }

    function renderHospitals(hospitals) {
        if (hospitalCount) hospitalCount.textContent = `${hospitals.length} found`;

        if (!hospitals.length) {
            hospitalsList.innerHTML = '<li class="empty-state">No hospitals found nearby.</li>';
            return;
        }

        hospitalsList.innerHTML = hospitals.map((hospital) => {
            const name = escapeHtml(hospital.name || "Hospital");
            const address = escapeHtml(hospital.address || "Address not available");
            const phone = escapeHtml(hospital.phone || "Not available");
            const rating = escapeHtml(hospital.rating || "Not rated");
            const destination = hospital.lat && hospital.lng
                ? `${encodeURIComponent(hospital.lat)},${encodeURIComponent(hospital.lng)}`
                : encodeURIComponent(`${hospital.name || ""} ${hospital.address || ""}`.trim());
            const phoneHref = hospital.phone ? `tel:${String(hospital.phone).replace(/[^\d+]/g, "")}` : "";

            return `
                <li>
                    <div class="hospital-row">
                        <div class="h-name">${name}</div>
                        <div class="h-addr"><i class="fa-solid fa-map-pin"></i> ${address}</div>
                        <div class="h-phone"><i class="fa-solid fa-phone"></i> ${phone}</div>
                        <div class="h-rating">Rating: ${rating}</div>
                        <div class="hospital-actions">
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}" target="_blank" rel="noopener">
                                <i class="fa-solid fa-directions"></i> Directions
                            </a>
                            ${phoneHref ? `<a href="${phoneHref}" class="phone-link"><i class="fa-solid fa-phone"></i> Call</a>` : ""}
                        </div>
                    </div>
                </li>
            `;
        }).join("");
    }

    function pollEmergencyStatus(emergencyId) {
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(async () => {
            try {
                const token = typeof window.Auth !== "undefined"
                    ? window.Auth.getToken()
                    : localStorage.getItem("hospital_copilot_token") || "";
                const response = await fetch(`${API_URL}/status/${emergencyId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });
                const data = await response.json();

                if (!data.success) return;

                if (data.status === "accepted") {
                    requestStatus.innerHTML = `<span class="text-success"><i class="fa-solid fa-check-circle"></i> Emergency accepted by Doctor ID: ${escapeHtml(data.doctorId)}. Help is on the way.</span>`;
                    clearInterval(pollInterval);
                    setStep("doctor");
                    triggerBtn.innerHTML = `<i class="fa-solid fa-check"></i><span> ACCEPTED</span>`;
                    triggerBtn.classList.add("btn-success");
                } else if (data.status === "rejected") {
                    requestStatus.innerHTML = `<span class="text-danger"><i class="fa-solid fa-times-circle"></i> Request rejected. Please trigger again or call local emergency services.</span>`;
                    clearInterval(pollInterval);
                    resetTriggerButton("TRIGGER AGAIN");
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000);
    }

    function setStep(activeStep) {
        if (!responseSteps) return;
        const order = ["location", "dispatch", "doctor"];
        const activeIndex = order.indexOf(activeStep);

        responseSteps.querySelectorAll("li[data-step]").forEach((item) => {
            const index = order.indexOf(item.dataset.step);
            item.classList.toggle("done", activeIndex > index);
            item.classList.toggle("active", activeIndex === index);
        });
    }

    function resetTriggerButton(label) {
        triggerBtn.disabled = false;
        triggerBtn.classList.remove("btn-success");
        triggerBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span> ${label}</span>`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function initVoiceTrigger() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const voiceInst = document.getElementById("voiceInstruction");
            if (voiceInst) voiceInst.style.display = "none";
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.trim().toLowerCase();

            if ((transcript.includes("help me") || transcript.includes("emergency")) && !triggerBtn.disabled) {
                triggerBtn.click();
            }
        };

        recognition.onend = () => {
            if (recognition) recognition.start();
        };

        try {
            recognition.start();
        } catch (error) {
            console.warn("Speech recognition could not start:", error);
        }
    }

    initVoiceTrigger();
});
