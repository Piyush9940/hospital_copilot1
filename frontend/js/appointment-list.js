class AppointmentList {
    constructor() {
        this.doctors = [];
        this.filteredDoctors = [];
        this.filters = {
            search: '',
            specialization: '',
            availability: '',
            feeRange: ''
        };
    }

    async initialize() {
        setupNavigation();
        await this.loadDoctors();
        this.setupEventListeners();
        this.applyFilters();
    }

    async loadDoctors() {
        try {
            if (window.LoadingOverlay?.show) LoadingOverlay.show();

            const response = await API.get('/doctor/list');

            const rawDoctors =
                response?.doctors ||
                response?.data?.doctors ||
                response?.data ||
                response ||
                [];

            if (!Array.isArray(rawDoctors)) {
                this.doctors = [];
            } else {
                this.doctors = rawDoctors.map((doctor, index) => this.normalizeDoctor(doctor, index));
            }
            this.filteredDoctors = [...this.doctors];
        } catch (error) {
            console.error('Error loading doctors:', error);
            this.doctors = [];
            this.filteredDoctors = [];
        } finally {
            if (window.LoadingOverlay?.hide) LoadingOverlay.hide();
        }
    }

    normalizeDoctor(doctor, index = 0) {
        const id = doctor.id || doctor._id || doctor.doctorId || index + 1;

        const name =
            doctor.name ||
            doctor.fullName ||
            [
                doctor.firstName,
                doctor.lastName
            ].filter(Boolean).join(' ').trim() ||
            'Dr. Doctor';

        const specialization =
            doctor.specialization ||
            doctor.department ||
            'General';

        const experience = Number(
            doctor.experience ||
            doctor.yearsOfExperience ||
            5
        );

        const fee = Number(
            doctor.fee ||
            doctor.consultationFee ||
            doctor.appointmentFee ||
            500
        );

        const rating = Number(doctor.rating || 4.7);

        const availability = Array.isArray(doctor.availability)
            ? doctor.availability
            : ['Today', 'Tomorrow'];

        const education =
            doctor.education ||
            doctor.qualification ||
            'Medical Specialist';

        const languages = Array.isArray(doctor.languages) && doctor.languages.length
            ? doctor.languages
            : ['English'];

        return {
            id,
            name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
            specialization,
            experience,
            fee,
            rating,
            availability,
            image: doctor.image || doctor.avatar || '👨‍⚕️',
            education,
            languages
        };
    }



    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const specializationFilter = document.getElementById('specializationFilter');
        const availabilityFilter = document.getElementById('availabilityFilter');
        const feeFilter = document.getElementById('feeFilter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.trim().toLowerCase();
                this.applyFilters();
            });
        }

        if (specializationFilter) {
            specializationFilter.addEventListener('change', (e) => {
                this.filters.specialization = e.target.value.trim().toLowerCase();
                this.applyFilters();
            });
        }

        if (availabilityFilter) {
            availabilityFilter.addEventListener('change', (e) => {
                this.filters.availability = e.target.value.trim().toLowerCase();
                this.applyFilters();
            });
        }

        if (feeFilter) {
            feeFilter.addEventListener('change', (e) => {
                this.filters.feeRange = e.target.value.trim();
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        this.filteredDoctors = this.doctors.filter((doctor) => {
            const doctorName = doctor.name.toLowerCase();
            const doctorSpecialization = doctor.specialization.toLowerCase();

            if (
                this.filters.search &&
                !doctorName.includes(this.filters.search) &&
                !doctorSpecialization.includes(this.filters.search)
            ) {
                return false;
            }

            if (
                this.filters.specialization &&
                doctorSpecialization !== this.filters.specialization
            ) {
                return false;
            }

            if (this.filters.availability) {
                const matchesAvailability = doctor.availability.some((day) =>
                    day.toLowerCase() === this.filters.availability
                );
                if (!matchesAvailability) {
                    return false;
                }
            }

            if (this.filters.feeRange) {
                const fee = Number(doctor.fee);

                if (this.filters.feeRange === '2001+') {
                    if (fee < 2001) return false;
                } else {
                    const [minStr, maxStr] = this.filters.feeRange.split('-');
                    const min = parseInt(minStr, 10);
                    const max = parseInt(maxStr, 10);

                    if (fee < min || fee > max) {
                        return false;
                    }
                }
            }

            return true;
        });

        this.renderDoctors();
    }

    renderDoctors() {
        const grid = document.getElementById('doctorsGrid');
        if (!grid) return;

        if (this.filteredDoctors.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="#9ca3af">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <h3>No doctors found</h3>
                    <p>Try adjusting your filters or search criteria</p>
                    <button class="btn btn-primary" onclick="resetDoctorFilters()">Reset Filters</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredDoctors.map((doctor) => this.createDoctorCard(doctor)).join('');

        document.querySelectorAll('.doctor-card').forEach((card) => {
            card.addEventListener('click', () => {
                const doctorId = card.dataset.doctorId;
                window.location.href = `appointment-booking.html?doctor=${doctorId}`;
            });
        });

        document.querySelectorAll('.book-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const doctorId = btn.dataset.doctorId;
                window.location.href = `appointment-booking.html?doctor=${doctorId}`;
            });
        });
    }

    createDoctorCard(doctor) {
        const filledStars = Math.floor(doctor.rating);
        const emptyStars = 5 - filledStars;

        return `
            <div class="doctor-card glass-container" data-doctor-id="${doctor.id}">
                <div class="doctor-header">
                    <div class="doctor-avatar">${doctor.image}</div>
                    <div class="doctor-rating">
                        <span class="stars">${'★'.repeat(filledStars)}${'☆'.repeat(emptyStars)}</span>
                        <span class="rating-value">${doctor.rating.toFixed(1)}</span>
                    </div>
                </div>

                <div class="doctor-info">
                    <h3>${doctor.name}</h3>
                    <p class="specialization">${doctor.specialization}</p>
                    <p class="education">${doctor.education}</p>

                    <div class="doctor-details">
                        <div class="detail-item">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                            </svg>
                            <span>${doctor.experience}+ years</span>
                        </div>
                        <div class="detail-item">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                            </svg>
                            <span>${doctor.languages.join(', ')}</span>
                        </div>
                    </div>

                    <div class="doctor-footer">
                        <div class="fee">
                            <span class="fee-amount">₹${doctor.fee}</span>
                            <span class="fee-label">Consultation</span>
                        </div>
                        <button class="btn btn-primary book-btn" data-doctor-id="${doctor.id}">
                            Book Now
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>

                    <div class="availability">
                        <span class="availability-label">Available:</span>
                        ${doctor.availability.map((day) => `<span class="availability-badge">${day}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

let appointmentListInstance = null;

function setupNavigation() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu || !window.Auth) return;

    const role = Auth.getRole();

    const navItems = {
        patient: [
            { url: 'patient-dashboard.html', label: 'Dashboard' },
            { url: 'appointment-list.html', label: 'Book Appointment' },
            { url: 'patient-reports.html', label: 'Reports' },
            { url: 'ai-nurse.html', label: 'AI Nurse' }
        ],
        doctor: [
            { url: 'doctor-dashboard.html', label: 'Dashboard' },
            { url: 'doctor-appointments.html', label: 'Appointments' },
            { url: 'doctor-patient-view.html', label: 'Patients' }
        ],
        nurse: [
            { url: 'nurse-dashboard.html', label: 'Dashboard' },
            { url: 'nurse-patient-queue.html', label: 'Patient Queue' }
        ]
    };

    const items = navItems[role] || [];
    navMenu.innerHTML = items.map((item) => `
        <a href="${item.url}" class="nav-link">${item.label}</a>
    `).join('');
}

function toggleMobileMenu() {
    document.getElementById('navMenu')?.classList.toggle('active');
}

function resetDoctorFilters() {
    const searchInput = document.getElementById('searchInput');
    const specializationFilter = document.getElementById('specializationFilter');
    const availabilityFilter = document.getElementById('availabilityFilter');
    const feeFilter = document.getElementById('feeFilter');

    if (searchInput) searchInput.value = '';
    if (specializationFilter) specializationFilter.value = '';
    if (availabilityFilter) availabilityFilter.value = '';
    if (feeFilter) feeFilter.value = '';

    if (appointmentListInstance) {
        appointmentListInstance.filters = {
            search: '',
            specialization: '',
            availability: '',
            feeRange: ''
        };
        appointmentListInstance.applyFilters();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();

    if (requireRole(['patient'])) {
        appointmentListInstance = new AppointmentList();
        appointmentListInstance.initialize();
    }
});