document.addEventListener("DOMContentLoaded", () => {
    const triggerBtn = document.getElementById("triggerEmergencyBtn");
    const statusPanel = document.getElementById("statusPanel");
    const locationStatus = document.getElementById("locationStatus");
    const requestStatus = document.getElementById("requestStatus");
    const hospitalsList = document.getElementById("hospitalsList");

    let pollInterval = null;
    let recognition = null;
    
    // Use the global API_BASE_URL from config.js so it points to the exact same server as auth
    const API_URL = `${API_BASE_URL}/v2/emergency`;

    triggerBtn.addEventListener("click", async () => {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span> PROCESSING...</span>`;
        statusPanel.classList.remove("hidden");
        requestStatus.textContent = "Acquiring location...";

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
                async (error) => {
                    console.error("Geolocation error:", error);
                    locationStatus.textContent = "Location access denied. Please enter manual location above.";
                    triggerBtn.disabled = false;
                    triggerBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span> TRIGGER EMERGENCY</span>`;
                }
            );
        } else {
            locationStatus.textContent = "Geolocation not supported. Please enter manual location above.";
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span> TRIGGER EMERGENCY</span>`;
        }
    });

    async function sendEmergencyRequest(lat, lng, medicalContext, address = "Auto-detected Location") {
        requestStatus.innerHTML = `<span class="text-warning">Sending request to available doctors...</span>`;
        
        try {
            const token = typeof window.Auth !== 'undefined' ? window.Auth.getToken() : localStorage.getItem("token") || "";
            const response = await fetch(`${API_URL}/trigger`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    latitude: lat,
                    longitude: lng,
                    address: address,
                    medicalContext: medicalContext
                })
            });

            const data = await response.json();
            if (data.success) {
                requestStatus.innerHTML = `<span class="text-warning">Request Pending. Waiting for Doctor to Accept...</span>`;
                
                // Display Hospitals
                if (data.hospitals && data.hospitals.length > 0) {
                    hospitalsList.innerHTML = data.hospitals.map(h => 
                        `<li>
                            <div class="h-name" style="font-weight: 600; font-size: 1.1rem; color: #1e293b;">${h.name}</div>
                            <div class="h-addr" style="color: #64748b; font-size: 0.9rem; margin-top: 4px;"><i class="fa-solid fa-map-pin"></i> ${h.address}</div>
                            <div class="h-phone" style="color: #64748b; font-size: 0.9rem; margin-top: 4px;"><i class="fa-solid fa-phone"></i> ${h.phone || "Not available"}</div>
                            <div class="h-rating" style="margin-top: 4px;">Rating: ${h.rating} ⭐</div>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat && h.lng ? `${h.lat},${h.lng}` : encodeURIComponent(h.name + ' ' + h.address)}" target="_blank" class="btn btn-primary" style="display: inline-block; margin-top: 10px; padding: 6px 12px; font-size: 0.9rem; text-decoration: none; border-radius: 6px;">
                                <i class="fa-solid fa-directions"></i> Get Directions
                            </a>
                        </li>`
                    ).join("");
                } else {
                    hospitalsList.innerHTML = "<li>No hospitals found nearby.</li>";
                }

                // Start polling
                pollEmergencyStatus(data.emergencyId);

            } else {
                requestStatus.innerHTML = `<span class="text-danger">Failed: ${data.message || 'Unknown error'}</span>`;
                if (data.details) {
                    console.error("Backend Error Details:", data.details);
                }
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span> TRIGGER EMERGENCY</span>`;
            }
        } catch (error) {
            console.error("Frontend Exception:", error);
            requestStatus.innerHTML = `<span class="text-danger">Network error: ${error.message}. Please call 911.</span>`;
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span> TRIGGER EMERGENCY</span>`;
        }
    }

    function pollEmergencyStatus(emergencyId) {
        if (pollInterval) clearInterval(pollInterval);
        
        pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}/status/${emergencyId}`);
                const data = await response.json();
                
                if (data.success) {
                    if (data.status === 'accepted') {
                        requestStatus.innerHTML = `<span class="text-success"><i class="fa-solid fa-check-circle"></i> Emergency Accepted by Doctor ID: ${data.doctorId}! Help is on the way.</span>`;
                        clearInterval(pollInterval);
                        triggerBtn.innerHTML = `<i class="fa-solid fa-check"></i><span> ACCEPTED</span>`;
                        triggerBtn.classList.add("btn-success");
                    } else if (data.status === 'rejected') {
                        requestStatus.innerHTML = `<span class="text-danger"><i class="fa-solid fa-times-circle"></i> Request Rejected. Routing to another doctor...</span>`;
                        // Realistically would retry, but we stop here for demo
                        clearInterval(pollInterval);
                        triggerBtn.disabled = false;
                        triggerBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span> TRIGGER AGAIN</span>`;
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000); // Poll every 3 seconds
    }

    // Voice Trigger Implementation (Extra Feature)
    function initVoiceTrigger() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const last = event.results.length - 1;
                const transcript = event.results[last][0].transcript.trim().toLowerCase();
                
                if (transcript.includes("help me") || transcript.includes("emergency")) {
                    console.log("Voice trigger detected!");
                    if(!triggerBtn.disabled) {
                        triggerBtn.click();
                    }
                }
            };

            recognition.onend = () => {
                // Restart listening to keep it active
                if(recognition) recognition.start();
            };

            try {
                recognition.start();
            } catch(e) {
                console.log("Speech recognition already started");
            }
        } else {
            const voiceInst = document.getElementById("voiceInstruction");
            if(voiceInst) voiceInst.style.display = "none";
        }
    }

    // Start listening for voice commands
    initVoiceTrigger();
});
