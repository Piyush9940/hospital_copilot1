class EmergencySystem {
    constructor() {
        this.location = null;
        this.emergencyActive = false;
        this.countdownInterval = null;
        this.countdownSeconds = 0;
        this.sosTriggered = false;
        this.cachedHospitals = [];
    }

    async initialize() {
        if (!requireRole(['patient'])) return;

        await this.getLocation();
        this.loadEmergencyContacts();
        await this.loadNearbyHospitals();
        await this.loadEmergencyHistory();
        this.setupSOSButton();
    }

    async getLocation() {
        if (!('geolocation' in navigator)) {
            Toast.show('Geolocation is not supported on this device', 'warning');
            return null;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    this.updateLocationDisplay();
                    resolve(this.location);
                },
                (error) => {
                    console.error('Location error:', error);
                    Toast.show('Unable to get location. Emergency alert can still be sent.', 'warning');
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                }
            );
        });
    }

    async triggerSOS() {
        if (this.emergencyActive || this.sosTriggered) return;

        this.sosTriggered = true;
        this.emergencyActive = true;
        this.showEmergencyModal();
        this.startCountdown();

        try {
            // Check patient profile first
            let patientProfile = null;
            try {
                const profileRes = await API.get('/patient/me');
                patientProfile =
                    profileRes?.patient ||
                    profileRes?.data?.patient ||
                    profileRes?.data ||
                    profileRes ||
                    null;
            } catch (profileError) {
                setTimeout(() => { window.location.href = 'patient-profile.html'; }, 2000);
                throw new Error('Patient profile not found. Please complete patient profile first. Redirecting...');
            }

            if (!patientProfile) {
                setTimeout(() => { window.location.href = 'patient-profile.html'; }, 2000);
                throw new Error('Patient profile not found. Please complete patient profile first. Redirecting...');
            }

            const vitals = await this.getLatestVitals();
            const contacts = this.getEmergencyContacts();

            const payload = {
                message:
                    `Emergency alert triggered by patient.` +
                    `${this.location ? ` Location: ${this.location.lat}, ${this.location.lng}.` : ''}` +
                    `${contacts?.bloodGroup ? ` Blood Group: ${contacts.bloodGroup}.` : ''}` +
                    `${contacts?.allergies ? ` Allergies: ${contacts.allergies}.` : ''}` +
                    `${contacts?.medications ? ` Medications: ${contacts.medications}.` : ''}` +
                    `${vitals?.bp ? ` BP: ${vitals.bp}.` : ''}` +
                    `${vitals?.heartRate ? ` HR: ${vitals.heartRate}.` : ''}` +
                    `${vitals?.spo2 ? ` SpO2: ${vitals.spo2}.` : ''}`
            };

            await API.post('/emergency/my/notify', payload);

            this.notifyEmergencyContacts();

            this.updateEmergencyHistoryLocal({
                timestamp: new Date().toISOString(),
                status: 'active',
                responseTime: 'Pending',
                location: this.location
            });

            Toast.show('Emergency alert sent successfully', 'success');
        } catch (error) {
            console.error('Emergency trigger failed:', error);

            this.updateEmergencyHistoryLocal({
                timestamp: new Date().toISOString(),
                status: 'local-only',
                responseTime: 'Pending',
                location: this.location
            });

            Toast.show(error.message || 'Emergency alert failed', 'error');
        } finally {
            this.sosTriggered = false;
            this.emergencyActive = false;

            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
        }
    }

    async getLatestVitals() {
        try {
            const response = await API.get('/vitals/my/latest');
            return (
                response?.vital ||
                response?.data?.vital ||
                response?.data ||
                response ||
                { status: 'unknown' }
            );
        } catch (error) {
            console.error('Vitals fetch failed:', error);
            return { status: 'unknown' };
        }
    }

    getEmergencyContacts() {
        return {
            primary: document.getElementById('emergencyContact')?.value?.trim() || '',
            bloodGroup: document.getElementById('bloodGroup')?.value?.trim() || '',
            allergies: document.getElementById('allergies')?.value?.trim() || '',
            medications: document.getElementById('medications')?.value?.trim() || ''
        };
    }

    loadEmergencyContacts() {
        const saved = JSON.parse(localStorage.getItem('patient_emergency_contacts') || '{}');

        if (saved.primary) document.getElementById('emergencyContact').value = saved.primary;
        if (saved.bloodGroup) document.getElementById('bloodGroup').value = saved.bloodGroup;
        if (saved.allergies) document.getElementById('allergies').value = saved.allergies;
        if (saved.medications) document.getElementById('medications').value = saved.medications;

        ['emergencyContact', 'bloodGroup', 'allergies', 'medications'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => this.saveEmergencyContacts());
        });
    }

    saveEmergencyContacts() {
        localStorage.setItem(
            'patient_emergency_contacts',
            JSON.stringify(this.getEmergencyContacts())
        );
    }

    async loadNearbyHospitals() {
        const container = document.getElementById('hospitalsList');
        if (!container) return;

        container.innerHTML = '<p class="empty-state">Searching for nearby hospitals...</p>';

        try {
            const hospitals = await this.fetchRealHospitals();
            this.cachedHospitals = hospitals;
            this.renderHospitals(hospitals);
        } catch (err) {
            console.error("Failed to fetch real hospitals:", err);
            const hospitals = this.getSortedHospitals();
            this.cachedHospitals = hospitals;
            this.renderHospitals(hospitals);
        }
    }

    async fetchRealHospitals() {
        if (!this.location) {
            return this.getSortedHospitals();
        }

        const lat = this.location.lat;
        const lng = this.location.lng;
        // Search for hospitals within 10km radius
        const query = `[out:json];node(around:10000,${lat},${lng})[amenity=hospital];out 5;`;
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });

        if (!response.ok) throw new Error("Overpass API request failed");

        const data = await response.json();
        
        if (!data.elements || data.elements.length === 0) {
            return this.getSortedHospitals();
        }

        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        const hospitalsWithDist = data.elements.map(el => {
            const dist = calculateDistance(lat, lng, el.lat, el.lon);
            const etaMins = Math.max(1, Math.round(dist * 3));
            let phone = el.tags.phone || el.tags['contact:phone'] || '102';
            
            return {
                name: el.tags.name || 'Emergency Hospital',
                lat: el.lat,
                lng: el.lon,
                phone: phone,
                distance: dist.toFixed(1) + ' km',
                distanceVal: dist,
                eta: etaMins + ' min'
            };
        });

        return hospitalsWithDist.sort((a, b) => a.distanceVal - b.distanceVal);
    }

    getSortedHospitals() {
        const MOCK_HOSPITALS = [
            { name: 'City General Hospital', lat: 28.6139, lng: 77.2090, phone: '108' },
            { name: 'Apollo Medical Center', lat: 28.5672, lng: 77.2800, phone: '1066' },
            { name: 'Fortis Healthcare', lat: 28.4595, lng: 77.0266, phone: '102' }
        ];

        if (!this.location) {
            return MOCK_HOSPITALS.map(h => ({ ...h, distance: 'Unknown', distanceVal: 999, eta: 'Unknown' }));
        }

        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        const hospitalsWithDist = MOCK_HOSPITALS.map(h => {
            const dist = calculateDistance(this.location.lat, this.location.lng, h.lat, h.lng);
            const etaMins = Math.max(1, Math.round(dist * 3));
            return {
                ...h,
                distance: dist.toFixed(1) + ' km',
                distanceVal: dist,
                eta: etaMins + ' min'
            };
        });

        return hospitalsWithDist.sort((a, b) => a.distanceVal - b.distanceVal);
    }

    renderHospitals(hospitals) {
        const container = document.getElementById('hospitalsList');
        if (!container) return;

        container.innerHTML = hospitals.map((h) => `
            <div class="hospital-item">
                <div class="hospital-info">
                    <h4>${h.name}</h4>
                    <p>🚑 ${h.distance} • ⏱️ ${h.eta}</p>
                </div>
                <button class="btn btn-sm btn-danger" onclick="callHospital('${h.phone}')">
                    📞 Call
                </button>
            </div>
        `).join('');
    }

    async loadEmergencyHistory() {
        const container = document.getElementById('emergencyHistory');
        if (!container) return;

        try {
            const response = await API.get('/emergency/my');
            const history =
                response?.alerts ||
                response?.data?.alerts ||
                response?.data ||
                response ||
                [];

            const normalized = Array.isArray(history) ? history : [];
            const mergedHistory = [
                ...normalized.map((item) => ({
                    timestamp: item.createdAt || item.timestamp || new Date().toISOString(),
                    status: item.status || 'active',
                    responseTime: item.responseTime || 'N/A'
                })),
                ...JSON.parse(localStorage.getItem('emergency_history') || '[]')
            ];

            this.renderEmergencyHistory(mergedHistory.slice(0, 5));
        } catch (error) {
            console.error('Emergency history fetch failed:', error);
            const history = JSON.parse(localStorage.getItem('emergency_history') || '[]');
            this.renderEmergencyHistory(history.slice(0, 5));
        }
    }

    renderEmergencyHistory(history) {
        const container = document.getElementById('emergencyHistory');
        if (!container) return;

        if (!history.length) {
            container.innerHTML = '<p class="empty-state">No recent emergencies</p>';
            return;
        }

        container.innerHTML = history.map((alert) => `
            <div class="history-item ${alert.status}">
                <div class="history-time">${this.formatTime(alert.timestamp)}</div>
                <div class="history-details">
                    <span class="status-badge">${alert.status}</span>
                    <p>Response time: ${alert.responseTime || 'N/A'}</p>
                </div>
            </div>
        `).join('');
    }

    setupSOSButton() {
        const btn = document.getElementById('sosButton');
        if (!btn) return;

        let pressTimer = null;
        let longPressTriggered = false;

        const startPress = () => {
            longPressTriggered = false;
            pressTimer = setTimeout(() => {
                longPressTriggered = true;
                this.triggerSOS();
            }, 3000);
        };

        const endPress = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        btn.addEventListener('mousedown', startPress);
        btn.addEventListener('mouseup', endPress);
        btn.addEventListener('mouseleave', endPress);
        btn.addEventListener('touchstart', startPress, { passive: true });
        btn.addEventListener('touchend', endPress);

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!longPressTriggered) {
                this.triggerSOS();
            }
        });
    }

    showEmergencyModal() {
        const modal = document.getElementById('emergencyModal');
        if (modal) modal.style.display = 'flex';
    }

    startCountdown() {
        this.countdownSeconds = 0;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.countdownInterval = setInterval(() => {
            this.countdownSeconds++;
            const minutes = Math.floor(this.countdownSeconds / 60);
            const seconds = this.countdownSeconds % 60;
            const timer = document.getElementById('countdownTimer');
            if (timer) {
                timer.textContent =
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    notifyEmergencyContacts() {
        const contacts = this.getEmergencyContacts();

        if (contacts.primary) {
            Toast.show(`Emergency contact prepared: ${contacts.primary}`, 'warning');
        } else {
            Toast.show('Emergency contacts notified', 'warning');
        }

        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    updateEmergencyHistoryLocal(entry) {
        const history = JSON.parse(localStorage.getItem('emergency_history') || '[]');
        history.unshift(entry);
        localStorage.setItem('emergency_history', JSON.stringify(history));
        this.loadEmergencyHistory();
    }

    cancelEmergency() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        this.emergencyActive = false;
        const modal = document.getElementById('emergencyModal');
        if (modal) modal.style.display = 'none';

        Toast.show('Emergency cancelled', 'info');
    }

    confirmEmergency() {
        const modal = document.getElementById('emergencyModal');
        if (modal) modal.style.display = 'none';

        Toast.show('Emergency confirmed. Help is on the way.', 'success');
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    updateLocationDisplay() {
        if (this.location) {
            Toast.show(
                `Location updated: ${this.location.lat.toFixed(4)}, ${this.location.lng.toFixed(4)}`,
                'info'
            );
        }
    }
}

const emergencySystem = new EmergencySystem();

function triggerSOS() {
    emergencySystem.triggerSOS();
}

function callAmbulance() {
    const hospitals = emergencySystem.cachedHospitals && emergencySystem.cachedHospitals.length > 0 
        ? emergencySystem.cachedHospitals 
        : emergencySystem.getSortedHospitals();
        
    const nearest = hospitals[0];
    
    if (nearest && nearest.phone) {
        Toast.show(`Calling nearest hospital: ${nearest.name}`, 'info');
        setTimeout(() => {
            window.location.href = `tel:${nearest.phone}`;
        }, 1000);
    } else {
        Toast.show('No hospital available to call', 'error');
    }
}

function shareLocation() {
    if (emergencySystem.location) {
        const mapsUrl = `https://maps.google.com/?q=${emergencySystem.location.lat},${emergencySystem.location.lng}`;
        window.open(mapsUrl, '_blank');
    } else {
        Toast.show('Location not available yet', 'warning');
    }
}

function notifyDoctor() {
    emergencySystem.triggerSOS();
}

function videoCallEmergency() {
    window.location.href = 'appointment-video-call.html?emergency=true';
}

function callHospital(phone) {
    window.location.href = `tel:${phone}`;
}

function cancelEmergency() {
    emergencySystem.cancelEmergency();
}

function confirmEmergency() {
    emergencySystem.confirmEmergency();
}

document.addEventListener('DOMContentLoaded', () => {
    if (requireRole(['patient'])) {
        emergencySystem.initialize();
    }
});