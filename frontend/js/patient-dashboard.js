(function () {
    if (window.__PATIENT_DASHBOARD_SCRIPT__) return;
    window.__PATIENT_DASHBOARD_SCRIPT__ = true;

    class PatientDashboard {
        constructor() {
            this.data = {
                patient: null,
                appointments: [],
                reports: [],
                vitals: {
                    latest: {
                        heartRate: 72,
                        bloodPressureSystolic: 120,
                        bloodPressureDiastolic: 80,
                        temperature: 98.6,
                        oxygenLevel: 98
                    }
                },
                healthScore: 85
            };

            this.chart = null;
            this.bound = false;
            this.callAlertShownFor = new Set();
            this.incomingCallPoller = null;
        }

        async initialize() {
            if (window.__PATIENT_DASHBOARD_INIT__) return;
            window.__PATIENT_DASHBOARD_INIT__ = true;

            try {
                if (!requireRole(['patient'])) return;
                if (window.LoadingOverlay?.show) LoadingOverlay.show();

                await this.loadDashboardData();
            } catch (error) {
                console.error('Dashboard load failed:', error);
            } finally {
                this.populateUserInfo();
                this.updateUI();
                this.bindEventsOnce();
                this.startIncomingCallPolling();
                if (window.LoadingOverlay?.hide) LoadingOverlay.hide();
            }
        }

        async loadDashboardData() {
            try {
                const patientProfile = await API.get('/patient/me');

                const patient =
                    patientProfile?.patient ||
                    patientProfile?.data?.patient ||
                    patientProfile?.data ||
                    patientProfile ||
                    null;

                this.data.patient = patient;

                const patientId =
                    patient?.id ||
                    patient?.patientId ||
                    patient?._id ||
                    null;

                const [appointmentsRes, reportsRes, latestVitalsRes] = await Promise.all([
                    patientId
                        ? API.get(`/appointments/patient/${patientId}`).catch(() => [])
                        : Promise.resolve([]),
                    API.get('/reports/my').catch(() => []),
                    API.get('/vitals/my/latest').catch(() => null),
                ]);

                const appointments =
                    appointmentsRes?.appointments ||
                    appointmentsRes?.data?.appointments ||
                    appointmentsRes?.data ||
                    appointmentsRes ||
                    [];

                const reports =
                    reportsRes?.reports ||
                    reportsRes?.data?.reports ||
                    reportsRes?.data ||
                    reportsRes ||
                    [];

                const latestVitals =
                    latestVitalsRes?.vital ||
                    latestVitalsRes?.data?.vital ||
                    latestVitalsRes?.data ||
                    latestVitalsRes ||
                    null;

                this.data.appointments = Array.isArray(appointments) ? appointments : [];
                this.data.reports = Array.isArray(reports) ? reports : [];
                this.data.vitals.latest = this.normalizeLatestVitals(latestVitals);
                this.data.healthScore = this.calculateHealthScore(this.data.vitals.latest);
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }

        normalizeLatestVitals(vital) {
            if (!vital) {
                return {
                    heartRate: 72,
                    bloodPressureSystolic: 120,
                    bloodPressureDiastolic: 80,
                    temperature: 98.6,
                    oxygenLevel: 98
                };
            }

            const bpRaw = String(vital.bp || vital.bloodPressure || '').trim();
            let systolic = Number(vital.bloodPressureSystolic || 120);
            let diastolic = Number(vital.bloodPressureDiastolic || 80);

            if (bpRaw.includes('/')) {
                const [sys, dia] = bpRaw.split('/');
                systolic = Number(sys) || systolic;
                diastolic = Number(dia) || diastolic;
            }

            return {
                heartRate: Number(vital.heartRate || vital.hr || 72),
                bloodPressureSystolic: systolic,
                bloodPressureDiastolic: diastolic,
                temperature: Number(vital.temperature || 98.6),
                oxygenLevel: Number(vital.spo2 || vital.oxygenLevel || 98)
            };
        }

        calculateHealthScore(vitals) {
            let score = 100;
            if (vitals.heartRate < 60 || vitals.heartRate > 100) score -= 15;
            if (vitals.bloodPressureSystolic > 140 || vitals.bloodPressureDiastolic > 90) score -= 15;
            if (vitals.oxygenLevel < 95) score -= 20;
            if (vitals.temperature > 100.4 || vitals.temperature < 97) score -= 10;
            return Math.max(55, score);
        }



        populateUserInfo() {
            const user = Auth.getUser?.() || {};
            const patient = this.data.patient || {};

            const fullName =
                user.name ||
                [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
                [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
                'Patient';

            const firstName =
                user.firstName ||
                patient.firstName ||
                fullName.split(' ')[0] ||
                'Patient';

            const avatar = firstName?.[0]?.toUpperCase() || 'P';

            const patientFirstNameEl = document.getElementById('patientFirstName');
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');

            if (patientFirstNameEl) patientFirstNameEl.textContent = firstName;
            if (userNameEl) userNameEl.textContent = fullName;
            if (userAvatarEl) userAvatarEl.textContent = avatar;
        }

        updateUI() {
            this.updateStats();
            this.updateAppointments();
            this.updateReports();
            this.updateHealthScore();
            this.updateVitalsStatus();
        }

        updateStats() {
            const upcomingCount = this.data.appointments.filter(a =>
                ['confirmed', 'pending', 'requested', 'scheduled'].includes(this.getAppointmentStatus(a))
            ).length;

            const upcomingEl = document.getElementById('upcomingAppointments');
            const reportsEl = document.getElementById('recentReports');

            if (upcomingEl) upcomingEl.textContent = upcomingCount;
            if (reportsEl) reportsEl.textContent = this.data.reports.length;
        }

        updateAppointments() {
            const container = document.getElementById('appointmentList');
            if (!container) return;

            const appointments = this.data.appointments.slice(0, 3);

            if (!appointments.length) {
                container.innerHTML = this.getEmptyState('appointments');
                return;
            }

            container.innerHTML = appointments.map(apt => this.createAppointmentCard(apt)).join('');
        }

        updateReports() {
            const container = document.getElementById('reportsList');
            if (!container) return;

            const reports = this.data.reports.slice(0, 3);

            if (!reports.length) {
                container.innerHTML = this.getEmptyState('reports');
                return;
            }

            container.innerHTML = reports.map(report => this.createReportCard(report)).join('');
        }

        updateHealthScore() {
            const score = this.data.healthScore;
            const scoreElement = document.querySelector('.health-score-value');
            const badgeElement = document.querySelector('.score-badge');

            if (scoreElement) scoreElement.textContent = score;

            let status = 'Excellent';
            let className = 'excellent';

            if (score >= 90) {
                status = 'Excellent';
                className = 'excellent';
            } else if (score >= 75) {
                status = 'Good';
                className = 'good';
            } else if (score >= 60) {
                status = 'Fair';
                className = 'fair';
            } else {
                status = 'Needs Attention';
                className = 'needs-attention';
            }

            if (badgeElement) {
                badgeElement.textContent = status;
                badgeElement.className = `score-badge ${className}`;
            }
        }

        updateVitalsStatus() {
            const vitals = this.data.vitals.latest;
            let status = 'Normal';
            let color = '#10b981';

            if (vitals.heartRate > 100 || vitals.heartRate < 60) {
                status = 'Abnormal';
                color = '#ef4444';
            } else if (vitals.bloodPressureSystolic > 140 || vitals.bloodPressureDiastolic > 90) {
                status = 'High BP';
                color = '#f59e0b';
            }

            const statusElement = document.getElementById('vitalStatus');
            if (statusElement) {
                statusElement.textContent = status;
                statusElement.style.color = color;
            }

            const detailElement = document.querySelector('.stat-card:nth-child(3) .stat-detail');
            if (detailElement) {
                detailElement.textContent = `BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} • HR: ${vitals.heartRate}`;
            }
        }

        createAppointmentCard(appointment) {
            const id = appointment.id || appointment.appointmentId || appointment._id || '';
            const doctorName = appointment.doctorName || appointment.doctor?.name || 'Doctor';
            const specialization = appointment.specialization || appointment.doctor?.specialization || 'Specialist';
            const date = appointment.date || appointment.appointmentDate || 'N/A';
            const time = appointment.time || appointment.appointmentTime || 'N/A';
            const status = String(appointment.status || appointment.appointmentStatus || 'pending').toLowerCase();
            const type = this.getAppointmentType(appointment);
            const isVideo = type === 'video';

            return `
                <div class="appointment-item" onclick="window.location.href='appointment-confirmation.html?appointmentId=${id}'">
                    <div class="appointment-info">
                        <h4>${doctorName}</h4>
                        <p>${specialization}</p>
                        <div class="appointment-meta">
                            <span>📅 ${date}</span>
                            <span>🕐 ${time}</span>
                            <span class="badge ${type}">${type}</span>
                        </div>
                        ${isVideo ? `<button class="btn btn-primary" style="margin-top:.75rem;" onclick="event.stopPropagation(); window.location.href='appointment-video-call.html?id=${id}'">Video Call</button>` : ''}
                    </div>
                    <div class="appointment-status ${status}">${status}</div>
                </div>
            `;
        }

        createReportCard(report) {
            const id = report.id || report.reportId || report._id || '';
            const name = report.name || report.title || report.diagnosis || 'Medical Report';
            const date = report.date || report.createdAt || report.updatedAt || 'N/A';
            const doctor = report.doctor || report.doctorName || 'Doctor';
            const status = String(report.status || 'completed').toLowerCase();

            return `
                <div class="report-item" onclick="window.location.href='report-view.html?id=${id}'">
                    <div class="report-icon">📄</div>
                    <div class="report-info">
                        <h4>${name}</h4>
                        <p>${doctor} • ${date}</p>
                    </div>
                    <div class="report-status ${status}">${status}</div>
                </div>
            `;
        }

        getEmptyState(type) {
            const messages = {
                appointments: {
                    title: 'No upcoming appointments',
                    action: 'Book Now',
                    link: 'appointment-list.html'
                },
                reports: {
                    title: 'No recent reports',
                    action: null,
                    link: null
                }
            };

            const msg = messages[type];
            return `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#9ca3af">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    <p>${msg.title}</p>
                    ${msg.action ? `<button class="btn btn-primary" onclick="window.location.href='${msg.link}'">${msg.action}</button>` : ''}
                </div>
            `;
        }



        bindEventsOnce() {
            if (this.bound) return;
            this.bound = true;

            document.querySelectorAll('.quick-access-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    this.createRipple(e);
                });
            });
        }

        startIncomingCallPolling() {
            if (this.incomingCallPoller) clearInterval(this.incomingCallPoller);
            this.checkIncomingVideoCalls();
            this.incomingCallPoller = setInterval(() => this.checkIncomingVideoCalls(), 5000);
        }

        async checkIncomingVideoCalls() {
            const videoAppointments = (this.data.appointments || []).filter((appointment) => {
                const id = appointment.id || appointment.appointmentId || appointment._id;
                const status = this.getAppointmentStatus(appointment);
                const type = this.getAppointmentType(appointment);
                return id && type === "video" && status === "confirmed";
            });

            for (const appointment of videoAppointments) {
                const id = appointment.id || appointment.appointmentId || appointment._id;
                try {
                    const response = await API.get(`/video-call/status/${id}`);
                    const result = response?.data || response;
                    const callState = result?.data?.callState || result?.callState || null;

                    if (callState?.call_status === "active" && !this.callAlertShownFor.has(String(id))) {
                        this.callAlertShownFor.add(String(id));
                        this.showIncomingCallAlert(appointment);
                    }
                } catch (error) {
                    console.warn("Incoming call check failed:", error);
                }
            }
        }

        getAppointmentStatus(appointment = {}) {
            return String(
                appointment.appointmentStatus ||
                appointment.appointment_status ||
                appointment.status ||
                ""
            ).toLowerCase();
        }

        getAppointmentType(appointment = {}) {
            return String(
                appointment.consultationType ||
                appointment.consultation_type ||
                appointment.type ||
                "video"
            ).toLowerCase().replace("_", "-");
        }

        showIncomingCallAlert(appointment) {
            const id = appointment.id || appointment.appointmentId || appointment._id;
            const doctorName = appointment.doctorName || appointment.doctor?.name || "Doctor";
            const existing = document.getElementById("incomingVideoCallAlert");
            if (existing) existing.remove();

            const alert = document.createElement("div");
            alert.id = "incomingVideoCallAlert";
            alert.style.cssText = `
                position: fixed; right: 24px; bottom: 24px; z-index: 10000;
                background: #0f766e; color: white; padding: 1rem 1.2rem;
                border-radius: 18px; box-shadow: 0 18px 35px rgba(15, 118, 110, 0.25);
                max-width: 340px; font-family: inherit;
            `;
            alert.innerHTML = `
                <div style="font-weight:700; margin-bottom:0.25rem;">Incoming video call</div>
                <div style="font-size:0.9rem; opacity:0.92; margin-bottom:0.85rem;">${doctorName} has started your consultation.</div>
                <button id="joinIncomingCallBtn" style="border:none; background:white; color:#0f766e; font-weight:700; padding:0.55rem 0.9rem; border-radius:999px; cursor:pointer;">Join Call</button>
                <button id="dismissIncomingCallBtn" style="border:none; background:transparent; color:white; font-weight:600; padding:0.55rem 0.7rem; cursor:pointer;">Dismiss</button>
            `;
            document.body.appendChild(alert);
            document.getElementById("joinIncomingCallBtn")?.addEventListener("click", () => {
                window.location.href = `appointment-video-call.html?id=${encodeURIComponent(id)}`;
            });
            document.getElementById("dismissIncomingCallBtn")?.addEventListener("click", () => alert.remove());
        }

        createRipple(event) {
            const button = event.currentTarget;
            const ripple = document.createElement('span');
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;

            ripple.style.width = ripple.style.height = `${diameter}px`;
            ripple.style.left = `${event.clientX - button.offsetLeft - radius}px`;
            ripple.style.top = `${event.clientY - button.offsetTop - radius}px`;
            ripple.classList.add('ripple');

            const existingRipple = button.querySelector('.ripple');
            if (existingRipple) existingRipple.remove();

            button.appendChild(ripple);
        }

        formatDate(date) {
            return date.toISOString().split('T')[0];
        }
    }

    function toggleMobileMenu() {
        document.querySelector('.nav-menu')?.classList.toggle('active');
    }

    function toggleUserMenu() {
        document.getElementById('userDropdown')?.classList.toggle('active');
    }

    window.toggleMobileMenu = toggleMobileMenu;
    window.toggleUserMenu = toggleUserMenu;

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            document.getElementById('userDropdown')?.classList.remove('active');
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (window.__PATIENT_DASHBOARD_BOOTED__) return;
        window.__PATIENT_DASHBOARD_BOOTED__ = true;

        const dashboard = new PatientDashboard();
        window.patientDashboardInstance = dashboard;
        dashboard.initialize();
    });
})();
