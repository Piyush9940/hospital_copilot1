document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("emergencyForm");
    const triggerBtn = document.getElementById("triggerEmergencyBtn");
    const statusPanel = document.getElementById("statusPanel");
    const locationStatus = document.getElementById("locationStatus");
    const requestStatus = document.getElementById("requestStatus");
    const hospitalsList = document.getElementById("hospitalsList");
    const hospitalCount = document.getElementById("hospitalCount");
    const responseSteps = document.getElementById("responseSteps");
    const connectionLabel = document.getElementById("connectionLabel");
    const connectionDetail = document.getElementById("connectionDetail");
    const contextButtons = document.querySelectorAll("[data-context]");
    const medicalContextInput = document.getElementById("medicalContext");
    const manualLocationInput = document.getElementById("manualLocation");
    const voiceInstruction = document.getElementById("voiceInstruction");
    const dashboardNavBtn = document.getElementById("dashboardNavBtn");
    const profileNavBtn = document.getElementById("profileNavBtn");

    let pollInterval = null;
    let recognition = null;
    let currentEmergencyId = null;

    const API_URL = `${window.API_BASE_URL}/v2/emergency`;
    const AUTH_STORAGE_KEYS = [
        "hospital_copilot_token",
        "hospital_copilot_user",
        "hospital_copilot_role",
        "token",
        "auth_token",
    ];

    const redirectToLogin = (message = "Please login again to continue.") => {
        if (window.Toast && typeof window.Toast.show === "function") {
            window.Toast.show(message, "warning");
        }

        AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

        if (window.Auth && typeof window.Auth.clearSession === "function") {
            window.Auth.clearSession();
        }

        setTimeout(() => {
            window.location.href = "login.html";
        }, 700);
    };

    const isTokenShapeValid = (token) => {
        if (!token || typeof token !== "string") return false;
        const parts = token.split(".");
        return parts.length === 3 && parts.every(Boolean);
    };

    const setButtonState = (state) => {
        const states = {
            idle: {
                disabled: false,
                html: '<i class="fa-solid fa-triangle-exclamation"></i><span>Trigger Emergency</span>',
                success: false,
            },
            loading: {
                disabled: true,
                html: '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Processing</span>',
                success: false,
            },
            sent: {
                disabled: true,
                html: '<i class="fa-solid fa-tower-broadcast"></i><span>Request Sent</span>',
                success: false,
            },
            accepted: {
                disabled: true,
                html: '<i class="fa-solid fa-check"></i><span>Accepted</span>',
                success: true,
            },
            retry: {
                disabled: false,
                html: '<i class="fa-solid fa-rotate-right"></i><span>Trigger Again</span>',
                success: false,
            },
        };

        const config = states[state] || states.idle;
        triggerBtn.disabled = config.disabled;
        triggerBtn.innerHTML = config.html;
        triggerBtn.classList.toggle("btn-success", config.success);
    };

    const playEmergencySound = () => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const audioContext = new AudioContext();
        const masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.72);
        masterGain.connect(audioContext.destination);

        [0, 0.24, 0.48].forEach((offset) => {
            const oscillator = audioContext.createOscillator();
            const toneGain = audioContext.createGain();
            oscillator.type = "square";
            oscillator.frequency.setValueAtTime(720, audioContext.currentTime + offset);
            oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + offset + 0.08);
            toneGain.gain.setValueAtTime(0.0001, audioContext.currentTime + offset);
            toneGain.gain.exponentialRampToValueAtTime(0.55, audioContext.currentTime + offset + 0.015);
            toneGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + offset + 0.16);
            oscillator.connect(toneGain);
            toneGain.connect(masterGain);
            oscillator.start(audioContext.currentTime + offset);
            oscillator.stop(audioContext.currentTime + offset + 0.18);
        });

        setTimeout(() => audioContext.close().catch(() => {}), 900);
    };

    const setupNavigation = () => {
        const role = window.Auth && typeof window.Auth.getRole === "function"
            ? window.Auth.getRole()
            : localStorage.getItem("hospital_copilot_role");

        const dashboardByRole = {
            doctor: "doctor-dashboard2.html",
            nurse: "nurse-dashboard.html",
            patient: "patient-dashboard.html",
        };

        const profileByRole = {
            doctor: "doctor-profile.html",
            nurse: "nurse-dashboard.html",
            patient: "patient-profile.html",
        };

        if (dashboardNavBtn) {
            dashboardNavBtn.href = dashboardByRole[role] || "dashboard-home.html";
        }

        if (profileNavBtn) {
            profileNavBtn.href = profileByRole[role] || "dashboard-home.html";
        }
    };

    const setStep = (activeStep) => {
        if (!responseSteps) return;

        const order = ["location", "dispatch", "doctor"];
        const activeIndex = order.indexOf(activeStep);

        responseSteps.querySelectorAll("li").forEach((item) => {
            const itemIndex = order.indexOf(item.dataset.step);
            item.classList.toggle("done", activeIndex > itemIndex);
            item.classList.toggle("active", activeIndex === itemIndex);
        });
    };

    const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const getToken = () => {
        if (window.Auth && typeof window.Auth.getToken === "function") {
            return window.Auth.getToken() || "";
        }

        return localStorage.getItem("hospital_copilot_token") || "";
    };

    const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, options);
        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            const message = data?.message || data?.error || `Request failed with status ${response.status}`;

            if (response.status === 401 || /token|auth/i.test(message)) {
                redirectToLogin("Your session is invalid or expired. Please login again.");
            }

            throw new Error(message);
        }

        return data;
    };

    const buildHeaders = () => {
        const token = getToken();

        if (!isTokenShapeValid(token)) {
            redirectToLogin("Login session not found. Please login again.");
            throw new Error("Login session not found. Please login again.");
        }

        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        };
    };

    const setConnectionCopy = () => {
        if (!connectionLabel || !connectionDetail) return;
        connectionLabel.textContent = "Configured";
        connectionDetail.textContent = `Using backend endpoint ${API_URL.replace(/^https?:\/\//, "")}`;
    };

    const formatLocation = (lat, lng) => `Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lng).toFixed(4)}`;

    const getDeviceLocation = () => new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
            reject(new Error("Geolocation is not supported on this device."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
            }),
            (error) => reject(error),
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 30000,
            }
        );
    });

    const renderHospitals = (hospitals = []) => {
        const safeHospitals = Array.isArray(hospitals) ? hospitals : [];

        hospitalCount.textContent = `${safeHospitals.length} found`;

        if (!safeHospitals.length) {
            hospitalsList.innerHTML = '<li class="empty-state">No nearby hospitals were returned by the backend.</li>';
            return;
        }

        hospitalsList.innerHTML = safeHospitals.map((hospital) => {
            const name = escapeHtml(hospital.name || "Hospital");
            const address = escapeHtml(hospital.address || "Address not available");
            const phone = escapeHtml(hospital.phone || "Not available");
            const rating = escapeHtml(hospital.rating || "N/A");
            const destination = hospital.lat && hospital.lng
                ? `${hospital.lat},${hospital.lng}`
                : encodeURIComponent(`${hospital.name || ""} ${hospital.address || ""}`.trim());
            const phoneHref = hospital.phone && hospital.phone !== "Not available"
                ? `<a class="phone-link" href="tel:${escapeHtml(hospital.phone)}"><i class="fa-solid fa-phone"></i> Call</a>`
                : "";

            return `
                <li>
                    <div class="hospital-row">
                        <div class="h-name">${name}</div>
                        <div class="h-addr"><i class="fa-solid fa-map-pin"></i><span>${address}</span></div>
                        <div class="h-phone"><i class="fa-solid fa-phone"></i><span>${phone}</span></div>
                        <div class="h-rating"><i class="fa-solid fa-star"></i><span>Rating: ${rating}</span></div>
                        <div class="hospital-actions">
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}" target="_blank" rel="noopener">
                                <i class="fa-solid fa-diamond-turn-right"></i> Directions
                            </a>
                            ${phoneHref}
                        </div>
                    </div>
                </li>
            `;
        }).join("");
    };

    const sendEmergencyRequest = async ({ latitude, longitude, address, medicalContext }) => {
        setStep("dispatch");
        requestStatus.innerHTML = '<span class="text-warning">Sending request to available doctors...</span>';

        const data = await fetchJson(`${API_URL}/trigger`, {
            method: "POST",
            headers: buildHeaders(),
            body: JSON.stringify({
                latitude,
                longitude,
                address,
                medicalContext,
            }),
        });

        if (!data.success) {
            throw new Error(data.message || "Emergency request was not accepted by the backend.");
        }

        currentEmergencyId = data.emergencyId;
        setButtonState("sent");
        setStep("doctor");
        requestStatus.innerHTML = '<span class="text-warning">Request pending. Waiting for a doctor to accept.</span>';
        renderHospitals(data.hospitals || []);
        pollEmergencyStatus(data.emergencyId);
    };

    const resetAfterFailure = (message) => {
        requestStatus.innerHTML = `<span class="text-danger">${escapeHtml(message)}</span>`;
        setButtonState("retry");
    };

    const triggerEmergency = async () => {
        const token = getToken();

        if (!isTokenShapeValid(token)) {
            redirectToLogin("Please login before triggering an emergency.");
            return;
        }

        playEmergencySound();
        setButtonState("loading");
        statusPanel.classList.remove("hidden");
        setStep("location");
        renderHospitals([]);
        requestStatus.textContent = "Preparing emergency request...";

        const medicalContext = medicalContextInput?.value?.trim() || "";
        const manualLocation = manualLocationInput?.value?.trim() || "";

        try {
            if (manualLocation) {
                locationStatus.textContent = `Manual location: ${manualLocation}`;
                await sendEmergencyRequest({
                    latitude: 0,
                    longitude: 0,
                    address: manualLocation,
                    medicalContext,
                });
                return;
            }

            locationStatus.textContent = "Detecting high accuracy GPS location...";
            const location = await getDeviceLocation();
            locationStatus.textContent = `${formatLocation(location.latitude, location.longitude)} (${Math.round(location.accuracy)}m accuracy)`;

            await sendEmergencyRequest({
                latitude: location.latitude,
                longitude: location.longitude,
                address: "Auto-detected Location",
                medicalContext,
            });
        } catch (error) {
            console.error("Emergency trigger failed:", error);
            const locationFailed = error.code || /geolocation|location/i.test(error.message || "");

            if (locationFailed && !manualLocation) {
                locationStatus.textContent = "GPS is unavailable. Enter your location and try again.";
                resetAfterFailure("Location is required. Please type your address or landmark, then trigger again.");
                manualLocationInput?.focus();
                return;
            }

            resetAfterFailure(error.message || "Network error. Please contact local emergency services immediately.");
        }
    };

    const pollEmergencyStatus = (emergencyId) => {
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(async () => {
            try {
                const token = getToken();

                if (!isTokenShapeValid(token)) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                    redirectToLogin("Your session is invalid or expired. Please login again.");
                    return;
                }

                const data = await fetchJson(`${API_URL}/status/${emergencyId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!data.success) return;

                if (data.status === "accepted") {
                    const doctorLabel = data.doctorId ? ` by Doctor ID: ${escapeHtml(data.doctorId)}` : "";
                    requestStatus.innerHTML = `<span class="text-success"><i class="fa-solid fa-check-circle"></i> Emergency accepted${doctorLabel}. Help is on the way.</span>`;
                    clearInterval(pollInterval);
                    pollInterval = null;
                    setButtonState("accepted");
                    setStep("doctor");
                } else if (data.status === "rejected") {
                    requestStatus.innerHTML = '<span class="text-danger"><i class="fa-solid fa-times-circle"></i> Request rejected. You can trigger again.</span>';
                    clearInterval(pollInterval);
                    pollInterval = null;
                    setButtonState("retry");
                } else if (data.status) {
                    requestStatus.innerHTML = `<span class="text-warning">Current status: ${escapeHtml(data.status)}. Waiting for doctor response...</span>`;
                }
            } catch (error) {
                console.error("Emergency status polling failed:", error);
            }
        }, 3000);
    };

    const initQuickContext = () => {
        contextButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const phrase = button.dataset.context || "";
                const current = medicalContextInput.value.trim();
                medicalContextInput.value = current ? `${current} ${phrase}` : phrase;
                medicalContextInput.focus();
            });
        });
    };

    const initVoiceTrigger = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            if (voiceInstruction) voiceInstruction.style.display = "none";
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
                triggerEmergency();
            }
        };

        recognition.onend = () => {
            if (!recognition) return;

            try {
                recognition.start();
            } catch (error) {
                console.log("Speech recognition restart skipped");
            }
        };

        try {
            recognition.start();
        } catch (error) {
            console.log("Speech recognition already active");
        }
    };

    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        triggerEmergency();
    });

    window.addEventListener("beforeunload", () => {
        if (pollInterval) clearInterval(pollInterval);
        if (recognition) {
            recognition.onend = null;
            recognition.stop();
        }
    });

    setConnectionCopy();
    setupNavigation();
    initQuickContext();
    initVoiceTrigger();
});
