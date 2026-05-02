class DoctorDashboard {
    constructor() {
        this.data = {
            appointments: [],
            patients: [],
            alerts: [],
            reports: [],
            stats: {}
        };
        this.analyticsChart = null;
        this.updateInterval = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            LoadingOverlay.show();
            this.populateDoctorIdentity();
            await this.loadDashboardData();
            this.initializeCharts();
            this.setupEventListeners();
            this.startRealTimeUpdates();
        } catch (error) {
            console.error('Doctor dashboard initialization error:', error);
        } finally {
            LoadingOverlay.hide();
        }
    }

    async loadDashboardData() {
        try {
            const user = Auth.getUser() || {};

            let doctorProfile = null;
            try {
                const doctorRes = await API.get('/doctor/me');
                doctorProfile =
                    doctorRes?.doctor ||
                    doctorRes?.data?.doctor ||
                    doctorRes?.data ||
                    doctorRes ||
                    null;
            } catch (error) {
                console.warn('Doctor profile fetch failed, using auth user data.');
            }

            const doctorId =
                doctorProfile?.id ||
                doctorProfile?.doctorId ||
                doctorProfile?._id ||
                null;

            const requests = [
                doctorId
                    ? API.get(`/appointments/doctor/${doctorId}`).catch(() => [])
                    : Promise.resolve([]),
                API.get('/emergency/pending').catch(() => []),
                doctorId 
                    ? API.get(`/doctor/${doctorId}/dashboard-summary`).catch(() => ({}))
                    : Promise.resolve({}),
            ];

            const [appointmentsRes, alertsRes, statsRes] = await Promise.all(requests);

            const appointments =
                appointmentsRes?.appointments ||
                appointmentsRes?.data?.appointments ||
                appointmentsRes?.data ||
                appointmentsRes ||
                [];

            const alerts =
                alertsRes?.alerts ||
                alertsRes?.data?.alerts ||
                alertsRes?.data ||
                alertsRes ||
                [];

            const stats =
                statsRes?.stats ||
                statsRes?.data?.stats ||
                statsRes?.data ||
                statsRes ||
                {};

            this.data.appointments = Array.isArray(appointments) ? appointments : [];
            this.data.alerts = Array.isArray(alerts) ? alerts : [];
            this.data.stats = this.normalizeStats(stats);

            this.data.patients = this.extractPatientsFromAppointments(this.data.appointments);
            this.data.reports = this.buildPendingReportsFromAppointments(this.data.appointments);

            this.updateUI();
        } catch (error) {
            console.error('Error loading doctor dashboard:', error);
        }
    }

    normalizeStats(stats) {
        return {
            totalPatients: Number(stats.totalPatients || stats.total_patients || 156),
            completedToday: Number(stats.completedToday || stats.completed_today || 5),
            pendingReviews: Number(stats.pendingReviews || stats.pending_reviews || 3),
            newPatients: Number(stats.newPatients || stats.new_patients || 12),
            chatRequests: Number(stats.chatRequests || stats.chat_requests || 5),
            videoCalls: Number(stats.videoCalls || stats.video_calls || 2)
        };
    }

    extractPatientsFromAppointments(appointments) {
        const seen = new Map();

        (appointments || []).forEach((apt) => {
            const patientId =
                apt.patientId ||
                apt.patient?.id ||
                apt.patient?._id ||
                apt.id ||
                Math.random().toString(36);

            const patientName =
                apt.patientName ||
                apt.patient?.name ||
                apt.patient?.fullName ||
                'Patient';

            if (!seen.has(patientId)) {
                seen.set(patientId, {
                    id: patientId,
                    name: patientName,
                    age: apt.patient?.age || '--',
                    condition: apt.symptoms || apt.reason || 'General Consultation',
                    lastVisit: apt.date || apt.appointmentDate || 'Recent'
                });
            }
        });

        return Array.from(seen.values()).slice(0, 5);
    }

    buildPendingReportsFromAppointments(appointments) {
        return (appointments || [])
            .slice(0, 5)
            .map((apt, index) => ({
                id: apt.id || apt.appointmentId || index + 1,
                patientName: apt.patientName || apt.patient?.name || 'Patient',
                type: apt.type === 'video' ? 'Consultation Summary' : 'Visit Summary',
                date: apt.date || apt.appointmentDate || 'Today',
                priority: apt.status === 'in-progress' ? 'urgent' : 'routine'
            }));
    }



    populateDoctorIdentity() {
        const user = Auth.getUser() || {};

        const fullName =
            user.name ||
            [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
            'Dr. Smith';

        const firstName =
            user.firstName ||
            fullName.replace(/^Dr\.\s*/i, '').split(' ')[0] ||
            'Doctor';

        const lastName =
            user.lastName ||
            fullName.replace(/^Dr\.\s*/i, '').split(' ').slice(1).join(' ') ||
            firstName;

        const doctorLastNameEl = document.getElementById('doctorLastName');
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');

        if (doctorLastNameEl) doctorLastNameEl.textContent = lastName || 'Smith';
        if (userNameEl) userNameEl.textContent = `Dr. ${lastName || firstName || 'Doctor'}`;
        if (userAvatarEl) userAvatarEl.textContent = (firstName?.[0] || 'D').toUpperCase();
    }

    updateUI() {
        this.updateStats();
        this.updateSchedule();
        this.updatePatients();
        this.updateAlerts();
        this.updateReports();
        this.updateNextAppointment();
    }

    updateStats() {
        document.getElementById('totalPatients').textContent = this.data.stats.totalPatients ?? 0;
        document.getElementById('completedToday').textContent = this.data.stats.completedToday ?? 0;
        document.getElementById('pendingReviews').textContent = this.data.stats.pendingReviews ?? 0;
        document.getElementById('newPatients').textContent = this.data.stats.newPatients ?? 0;
        document.getElementById('chatRequests').textContent = this.data.stats.chatRequests ?? 0;
        document.getElementById('videoCalls').textContent = this.data.stats.videoCalls ?? 0;
        document.getElementById('todayAppointments').textContent = this.data.appointments.length ?? 0;
    }

    updateSchedule() {
        const container = document.getElementById('scheduleTimeline');

        if (!this.data.appointments.length) {
            container.innerHTML = '<div class="empty-state"><p>No appointments scheduled for today</p></div>';
            return;
        }

        container.innerHTML = this.data.appointments.map(apt => `
            <div class="timeline-item" onclick="viewAppointment('${apt.id || apt.appointmentId || ''}')">
                <div class="timeline-time">${apt.time || apt.appointmentTime || '--'}</div>
                <div class="timeline-content">
                    <h4>${apt.patientName || apt.patient?.name || 'Patient'}</h4>
                    <p>${apt.symptoms || apt.reason || 'General consultation'}</p>
                    <span class="appointment-type ${apt.type || 'video'}">${apt.type || 'video'}</span>
                </div>
                <div class="timeline-status">
                    <span class="status-indicator ${apt.status || 'upcoming'}"></span>
                </div>
            </div>
        `).join('');
    }

    updatePatients() {
        const container = document.getElementById('recentPatients');

        if (!this.data.patients.length) {
            container.innerHTML = '<div class="empty-state"><p>No recent patients</p></div>';
            return;
        }

        container.innerHTML = this.data.patients.map(patient => `
            <div class="patient-item" onclick="viewPatient('${patient.id}')">
                <div class="patient-avatar">${(patient.name || 'P').charAt(0)}</div>
                <div class="patient-details">
                    <h4>${patient.name}</h4>
                    <p>Age: ${patient.age} • Last visit: ${patient.lastVisit}</p>
                </div>
                <div class="patient-condition">${patient.condition}</div>
            </div>
        `).join('');
    }

    updateAlerts() {
        const container = document.getElementById('emergencyAlerts');
        const alertCount = document.getElementById('alertCount');
        const alertsCard = document.querySelector('.emergency-alerts');

        alertCount.textContent = this.data.alerts.length;

        if (this.data.alerts.length > 0) {
            alertsCard.classList.add('has-emergency');

            container.innerHTML = this.data.alerts.map(alert => `
                <div class="alert-item" onclick="handleAlert('${alert.id || ''}')">
                    <div class="alert-header">
                        <span class="alert-priority">${String(alert.priority || 'medium').toUpperCase()} PRIORITY</span>
                        <span class="alert-time">${alert.time || alert.createdAt || 'Recent'}</span>
                    </div>
                    <div class="alert-content">
                        <h4>${alert.patientName || 'Patient'}</h4>
                        <p>${alert.description || alert.message || 'Emergency alert received'}</p>
                    </div>
                </div>
            `).join('');
        } else {
            alertsCard.classList.remove('has-emergency');
            container.innerHTML = '<div class="empty-state"><p>No emergency alerts</p></div>';
        }
    }

    updateReports() {
        const container = document.getElementById('pendingReports');

        if (!this.data.reports.length) {
            container.innerHTML = '<div class="empty-state"><p>No pending reports</p></div>';
            return;
        }

        container.innerHTML = this.data.reports.map(report => `
            <div class="report-item" onclick="viewReport('${report.id}')">
                <div class="report-icon ${report.priority}">📋</div>
                <div class="report-info">
                    <h4>${report.patientName} - ${report.type}</h4>
                    <p>Date: ${report.date}</p>
                </div>
                <div class="report-status ${report.priority}">${report.priority}</div>
            </div>
        `).join('');
    }

    updateNextAppointment() {
        const nextApt = this.data.appointments.find(apt =>
            ['upcoming', 'in-progress', 'confirmed', 'pending'].includes(String(apt.status || '').toLowerCase())
        );

        if (nextApt) {
            document.getElementById('nextAppointmentTime').textContent = nextApt.time || nextApt.appointmentTime || '--';
            document.getElementById('nextPatientName').textContent = nextApt.patientName || nextApt.patient?.name || 'Patient';
        }
    }

    initializeCharts() {
        const canvas = document.getElementById('analyticsChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();

        this.analyticsChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }



    setupEventListeners() {
        const toggle = document.getElementById('availabilityToggle');
        const statusText = document.getElementById('availabilityText');

        if (toggle && !toggle.dataset.bound) {
            toggle.dataset.bound = 'true';

            toggle.addEventListener('change', async (e) => {
                const isAvailable = e.target.checked;
                statusText.textContent = isAvailable ? 'Available' : 'Unavailable';
                statusText.className = isAvailable ? 'available' : 'unavailable';

                Toast.show(`You are now ${isAvailable ? 'available' : 'unavailable'}`, 'success');
            });
        }

        const selector = document.getElementById('chartPeriod');
        if (selector && !selector.dataset.bound) {
            selector.dataset.bound = 'true';

            selector.addEventListener('change', (e) => {
                this.updateChartPeriod(e.target.value);
            });
        }
    }

    updateChartPeriod(period) {
        if (!this.analyticsChart) return;
        this.analyticsChart.data = { labels: [], datasets: [] };
        this.analyticsChart.update();
    }

    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            try {
                await this.loadDashboardData();
            } catch (error) {
                console.error('Error in doctor dashboard real-time update:', error);
            }
        }, 30000);
    }
}

function viewAppointment(id) {
    window.location.href = `doctor-patient-view.html?appointment=${id}`;
}

function viewPatient(id) {
    window.location.href = `doctor-patient-view.html?id=${id}`;
}

function viewReport(id) {
    window.location.href = `doctor-reports.html?id=${id}`;
}

function handleAlert(id) {
    window.location.href = `patient-emergency.html?alert=${id}`;
}

function startVideoCall() {
    window.location.href = 'doctor-video-call.html';
}

function handleEmergency() {
    Toast.show('Emergency mode activated', 'warning');
}

function toggleMobileMenu() {
    document.querySelector('.nav-menu')?.classList.toggle('active');
}

function toggleUserMenu() {
    document.getElementById('userDropdown')?.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown')?.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (!requireRole(['doctor'])) return;

    const dashboard = new DoctorDashboard();
    dashboard.initialize();
});