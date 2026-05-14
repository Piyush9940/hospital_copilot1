class VideoCall {
    constructor() {
        this.peer = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callDuration = 0;
        this.durationInterval = null;
        this.isMuted = false;
        this.isVideoOff = false;
        this.signalPoller = null;
        this.appointmentId = this.getAppointmentId();
        this.isEmergency = this.checkIfEmergency();
        this.initialized = false;
        this.ending = false;
        this.lastSignalPayload = null;
        this.callStatusPoller = null;
    }

    async initialize() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            if (this.isEmergency) {
                await this.initializeEmergencyCall();
                return;
            }

            if (!this.appointmentId) {
                Toast.show("Please select a specific appointment to start a video call.", "warning");
                setTimeout(() => {
                    const role = Auth.getRole();
                    if (role === 'doctor') window.location.href = 'doctor-appointments.html';
                    else if (role === 'nurse') window.location.href = 'nurse-dashboard.html';
                    else window.location.href = 'patient-dashboard.html';
                }, 2000);
                return;
            }

            await this.checkCallAccess();
            await this.initializeMedia();
            this.setupPeerConnection();
            this.startCallDuration();
            await this.loadAppointmentDetails();
            this.startSignalPolling();
            this.startCallStatusPolling();

            const callStatus = document.getElementById("callStatus");
            if (callStatus) {
                callStatus.textContent = "Waiting for connection...";
            }
        } catch (error) {
            console.error("Video call initialize error:", error);
            Toast.show(error.message || "Unable to start video call", "error");
        }
    }

    async initializeEmergencyCall() {
        try {
            await this.initializeMedia();
            this.startCallDuration();
            
            const doctorNameEl = document.getElementById("doctorName");
            if (doctorNameEl) {
                doctorNameEl.textContent = "Emergency Operator";
            }
            
            const callStatus = document.getElementById("callStatus");
            if (callStatus) {
                callStatus.textContent = "Connecting to Emergency Response...";
                
                // Simulate connection
                setTimeout(() => {
                    callStatus.textContent = "Connected to Emergency Operator";
                    const placeholder = document.getElementById("remotePlaceholder");
                    if (placeholder) {
                        placeholder.innerHTML = '<div style="font-size: 3rem;">🚨</div><p style="margin-top: 10px;">Emergency Response Team</p>';
                    }
                }, 2000);
            }
        } catch (error) {
            console.error("Emergency call error:", error);
            Toast.show("Failed to initialize emergency video call", "error");
        }
    }

    checkIfEmergency() {
        const params = new URLSearchParams(window.location.search);
        return params.get("emergency") === "true";
    }

    async checkCallAccess() {
        try {
            const response = await API.get(`/video-call/status/${this.appointmentId}`);
            const result = response?.data || response;

            if (result?.success === false && result?.message) {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error("Call access check failed:", error);
            throw new Error(
                error?.message || "You are not allowed to join this video call"
            );
        }
    }

    async initializeMedia() {
        try {
            // Use optimized video constraints to reduce bandwidth and prevent lag
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15, max: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const localVideo = document.getElementById("localVideo");
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }

            const callStatus = document.getElementById("callStatus");
            if (callStatus) {
                callStatus.textContent = "Camera and microphone ready";
            }
        } catch (error) {
            console.error("Media error:", error);
            Toast.show("Unable to access camera/microphone. Switching to audio only.", "warning");
            await this.useAudioOnly();
        }
    }

    async useAudioOnly() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });

            const localVideo = document.getElementById("localVideo");
            if (localVideo) {
                localVideo.style.display = "none";
            }

            const callStatus = document.getElementById("callStatus");
            if (callStatus) {
                callStatus.textContent = "Audio only mode";
            }
        } catch (error) {
            console.error("Audio only failed:", error);
            throw new Error("Unable to access microphone");
        }
    }

    setupPeerConnection() {
        if (this.peer && !this.peer.destroyed) {
            return;
        }

        this.peer = new SimplePeer({
            initiator: this.isInitiator(),
            stream: this.localStream,
            trickle: false,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" }
                ]
            }
        });

        this.peer.on("signal", async (data) => {
            await this.sendSignal(data);
        });

        this.peer.on("stream", (stream) => {
            this.remoteStream = stream;

            const remoteVideo = document.getElementById("remoteVideo");
            if (remoteVideo) {
                remoteVideo.srcObject = stream;
            }

            const placeholder = document.getElementById("remotePlaceholder");
            if (placeholder) {
                placeholder.style.display = "none";
            }

            const callStatus = document.getElementById("callStatus");
            if (callStatus) {
                callStatus.textContent = "In Call";
            }
        });

        this.peer.on("connect", () => {
            const callStatus = document.getElementById("callStatus");
            if (callStatus) {
                callStatus.textContent = "Connected";
            }
        });

        this.peer.on("error", (err) => {
            console.error("Peer error:", err);
            Toast.show("Connection error", "error");
        });

        this.peer.on("close", () => {
            const callStatus = document.getElementById("callStatus");
            if (callStatus) {
                callStatus.textContent = "Call Ended";
            }
        });
    }

    async sendSignal(signal) {
        try {
            await API.post(`/video-call/signal`, {
                appointmentId: this.appointmentId,
                signal
            });
        } catch (error) {
            console.error("Signal send error:", error);
        }
    }

    async receiveSignal() {
        try {
            const response = await API.get(`/video-call/signal/${this.appointmentId}`);
            const result = response?.data || response;
            const signal = result?.data?.signal || result?.signal || null;

            if (!signal || !this.peer || this.peer.destroyed) return;

            const serialized = JSON.stringify(signal);
            if (this.lastSignalPayload === serialized) return;
            this.lastSignalPayload = serialized;

            this.peer.signal(signal);
        } catch (error) {
            console.error("Signal receive error:", error);
        }
    }

    startSignalPolling() {
        this.stopSignalPolling();

        this.signalPoller = setInterval(async () => {
            if (this.peer && !this.peer.destroyed && !this.peer.connected) {
                await this.receiveSignal();
            }
        }, 2000);
    }

    stopSignalPolling() {
        if (this.signalPoller) {
            clearInterval(this.signalPoller);
            this.signalPoller = null;
        }
    }

    startCallStatusPolling() {
        this.stopCallStatusPolling();

        this.callStatusPoller = setInterval(async () => {
            if (this.ending || this.isEmergency || !this.appointmentId) return;

            try {
                const response = await API.get(`/video-call/status/${this.appointmentId}`);
                const result = response?.data || response;
                const callState = result?.callState || result?.data?.callState || null;

                if (callState?.call_status === "ended") {
                    this.handleRemoteCallEnded(callState.ended_by);
                }
            } catch (error) {
                console.error("Call status polling error:", error);
            }
        }, 2500);
    }

    stopCallStatusPolling() {
        if (this.callStatusPoller) {
            clearInterval(this.callStatusPoller);
            this.callStatusPoller = null;
        }
    }

    handleRemoteCallEnded(endedBy = "") {
        if (this.ending) return;
        this.ending = true;

        this.cleanup();

        const callStatus = document.getElementById("callStatus");
        if (callStatus) {
            callStatus.textContent = endedBy ? `Call ended by ${endedBy}` : "Call ended";
        }

        Toast.show("Call ended", "info");

        setTimeout(() => {
            this.redirectAfterCall();
        }, 900);
    }

    isInitiator() {
        const role = Auth.getRole();
        return role === "doctor";
    }

    getAppointmentId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id") || params.get("appointmentId") || params.get("appointment");
    }

    async loadAppointmentDetails() {
        try {
            const response = await API.get(`/appointments/${this.appointmentId}`);
            const result = response?.data || response;
            const appointment = result?.data || result;

            const doctorNameEl = document.getElementById("doctorName");
            if (doctorNameEl) {
                const doctorName =
                    appointment?.doctorName ||
                    appointment?.doctor?.name ||
                    "Doctor";

                const specialization =
                    appointment?.specialization ||
                    appointment?.doctor?.specialization ||
                    "";

                doctorNameEl.textContent = specialization
                    ? `Dr. ${doctorName} • ${specialization}`
                    : `Dr. ${doctorName}`;
            }
        } catch (error) {
            console.error("Error loading appointment details:", error);
        }
    }

    toggleMic() {
        if (!this.localStream) return;

        this.isMuted = !this.isMuted;

        this.localStream.getAudioTracks().forEach((track) => {
            track.enabled = !this.isMuted;
        });

        const btn = document.getElementById("micBtn");
        if (btn) {
            btn.classList.toggle("active", this.isMuted);
        }

        Toast.show(
            this.isMuted ? "Microphone muted" : "Microphone unmuted",
            "info"
        );
    }

    toggleVideo() {
        if (!this.localStream) return;

        this.isVideoOff = !this.isVideoOff;

        this.localStream.getVideoTracks().forEach((track) => {
            track.enabled = !this.isVideoOff;
        });

        const btn = document.getElementById("videoBtn");
        if (btn) {
            btn.classList.toggle("active", this.isVideoOff);
        }

        Toast.show(
            this.isVideoOff ? "Video off" : "Video on",
            "info"
        );
    }

    toggleChat() {
        const panel = document.getElementById("chatPanel");
        if (!panel) return;

        panel.style.display = panel.style.display === "none" ? "block" : "none";
    }

    async shareScreen() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            const sender = this.peer?._pc?.getSenders()?.find(
                (s) => s.track && s.track.kind === "video"
            );

            if (sender) {
                await sender.replaceTrack(screenTrack);
            }

            screenTrack.onended = async () => {
                const cameraTrack = this.localStream?.getVideoTracks()?.[0];
                if (sender && cameraTrack) {
                    await sender.replaceTrack(cameraTrack);
                }
            };

            Toast.show("Screen sharing started", "success");
        } catch (error) {
            console.error("Screen share error:", error);
            Toast.show("Screen sharing failed", "error");
        }
    }

    startCallDuration() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
        }

        this.durationInterval = setInterval(() => {
            this.callDuration++;
            const minutes = Math.floor(this.callDuration / 60);
            const seconds = this.callDuration % 60;

            const durationEl = document.getElementById("callDuration");
            if (durationEl) {
                durationEl.textContent =
                    `${minutes.toString().padStart(2, "0")}:${seconds
                        .toString()
                        .padStart(2, "0")}`;
            }
        }, 1000);
    }

    async endCall() {
        if (this.ending) return;
        if (!confirm("End this call?")) return;

        this.ending = true;

        try {
            if (!this.isEmergency && this.appointmentId) {
                await API.post(`/video-call/end/${this.appointmentId}`, {});
            }

            this.stopSignalPolling();
            this.stopCallStatusPolling();

            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }

            if (this.localStream) {
                this.localStream.getTracks().forEach((track) => track.stop());
            }

            if (this.peer && !this.peer.destroyed) {
                this.peer.destroy();
            }

            Toast.show("Call ended", "info");
        } catch (error) {
            console.error("End call error:", error);
            Toast.show("Failed to end call properly on server", "warning");
        } finally {
            this.ending = false;
            setTimeout(() => {
                this.redirectAfterCall();
            }, 1000);
        }
    }

    redirectAfterCall() {
        const role = Auth.getRole();
        if (role === 'doctor') {
            window.location.href = 'doctor-appointments.html';
        } else if (role === 'nurse') {
            window.location.href = 'nurse-dashboard.html';
        } else {
            window.location.href = 'patient-dashboard.html';
        }
    }

    sendChatMessage() {
        const input = document.getElementById("chatInput");
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        this.addChatMessage("You", message, "user");
        input.value = "";
    }

    addChatMessage(sender, text, type) {
        const container = document.getElementById("callChatMessages");
        if (!container) return;

        const messageEl = document.createElement("div");
        messageEl.className = `chat-message ${type}`;
        messageEl.innerHTML = `
            <span class="sender">${sender}:</span>
            <span class="text">${text}</span>
            <span class="time">${new Date().toLocaleTimeString()}</span>
        `;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    handleChatKeyPress(event) {
        if (event.key === "Enter") {
            this.sendChatMessage();
        }
    }

    cleanup() {
        this.stopSignalPolling();
        this.stopCallStatusPolling();

        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
        }

        if (this.peer && !this.peer.destroyed) {
            this.peer.destroy();
        }
    }
}

const videoCall = new VideoCall();
window.videoCall = videoCall;

function toggleMic() {
    videoCall.toggleMic();
}

function toggleVideo() {
    videoCall.toggleVideo();
}

function toggleChat() {
    videoCall.toggleChat();
}

function shareScreen() {
    videoCall.shareScreen();
}

function endCall() {
    videoCall.endCall();
}

function sendChatMessage() {
    videoCall.sendChatMessage();
}

function handleChatKeyPress(event) {
    videoCall.handleChatKeyPress(event);
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.body?.dataset?.videoManualStart === "true") {
        return;
    }

    if (requireRole(["patient", "doctor"])) {
        videoCall.initialize();
    }
});

window.addEventListener("beforeunload", () => {
    videoCall.cleanup();
});
