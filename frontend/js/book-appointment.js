(function () {
    const state = {
        doctors: [],
        selectedDoctor: null,
    };

    function showToast(message, type = "success") {
        if (window.Toast?.show) {
            window.Toast.show(message, type);
            return;
        }
        alert(message);
    }

    function todayString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function normalizeDoctor(doctor, index = 0) {
        const id = doctor.id || doctor.doctorId || doctor._id || index + 1;
        const name =
            doctor.name ||
            doctor.fullName ||
            [doctor.firstName, doctor.lastName].filter(Boolean).join(" ").trim() ||
            "Doctor";
        const specialization = doctor.specialization || doctor.department || "General";
        const fee = Number(
            doctor.appointmentFee ||
                doctor.appointment_fee ||
                doctor.consultationFee ||
                doctor.fee ||
                500
        );

        return {
            id,
            name: name.startsWith("Dr.") ? name : `Dr. ${name}`,
            specialization,
            fee: Number.isFinite(fee) && fee >= 0 ? fee : 500,
        };
    }

    function getQueryDoctorId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("doctor") || params.get("doctorId") || "";
    }

    function setLoading(isLoading) {
        const button = document.querySelector("#bookForm button[type='submit']");
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = "Booking...";
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText || "Confirm Booking";
            button.disabled = false;
        }
    }

    function updateSelectedDoctor() {
        const select = document.getElementById("doctor");
        const selectedId = select?.value;
        state.selectedDoctor = state.doctors.find((doctor) => String(doctor.id) === String(selectedId)) || null;
    }

    async function loadDoctors() {
        const select = document.getElementById("doctor");
        if (!select || !window.API) return;

        select.innerHTML = '<option value="">Loading doctors...</option>';

        try {
            const response = await API.get("/doctor/list");
            const rawDoctors =
                response?.doctors ||
                response?.data?.doctors ||
                response?.data ||
                response ||
                [];

            state.doctors = Array.isArray(rawDoctors)
                ? rawDoctors.map((doctor, index) => normalizeDoctor(doctor, index))
                : [];

            if (!state.doctors.length) {
                select.innerHTML = '<option value="">No doctors available</option>';
                return;
            }

            select.innerHTML =
                '<option value="">-- Choose a Specialist --</option>' +
                state.doctors
                    .map(
                        (doctor) =>
                            `<option value="${doctor.id}" data-fee="${doctor.fee}" data-specialization="${doctor.specialization}">${doctor.name} - ${doctor.specialization} (₹${doctor.fee})</option>`
                    )
                    .join("");

            const queryDoctorId = getQueryDoctorId();
            if (queryDoctorId && state.doctors.some((doctor) => String(doctor.id) === String(queryDoctorId))) {
                select.value = queryDoctorId;
            }

            updateSelectedDoctor();
        } catch (error) {
            console.error("Failed to load doctors", error);
            select.innerHTML = '<option value="">Failed to load doctors</option>';
            showToast(error.message || "Failed to load doctors", "error");
        }
    }

    function validateFormPayload(payload) {
        if (!payload.doctorId) throw new Error("Please select a doctor.");
        if (!payload.appointmentDate) throw new Error("Please select an appointment date.");
        if (!payload.appointmentTime) throw new Error("Please select an appointment time.");
        if (!payload.symptoms || payload.symptoms.length < 3) {
            throw new Error("Please describe your symptoms or reason.");
        }

        if (payload.appointmentDate < todayString()) {
            throw new Error("Please choose today or a future date.");
        }
    }

    async function submitAppointment(event) {
        event.preventDefault();

        if (!window.API) {
            showToast("API helper is not loaded. Please refresh the page.", "error");
            return;
        }

        updateSelectedDoctor();
        const selectedDoctor = state.selectedDoctor;
        const payload = {
            doctorId: document.getElementById("doctor")?.value,
            appointmentDate: document.getElementById("date")?.value,
            appointmentTime: document.getElementById("time")?.value,
            consultationType: document.getElementById("type")?.value || "video",
            symptoms: document.getElementById("symptoms")?.value?.trim(),
            fee: selectedDoctor?.fee || 500,
        };

        try {
            validateFormPayload(payload);
            setLoading(true);

            const profileRes = await API.get("/patient/me").catch(() => null);
            const patientProfile = profileRes?.data || profileRes || {};
            if (patientProfile.patientId) payload.patientId = patientProfile.patientId;

            const response = await API.post("/appointments", payload);
            const appointment = response?.data || response?.appointment || response || {};
            const appointmentId = appointment.id || appointment.appointmentId;

            if (!appointmentId) {
                throw new Error("Appointment was created, but the server did not return an appointment id.");
            }

            const params = new URLSearchParams({
                appointmentId,
                appointmentCode: appointment.appointmentCode || appointment.appointment_code || "",
                fee: String(payload.fee),
                doctor: selectedDoctor?.name || appointment.doctorName || "Doctor",
                specialty: selectedDoctor?.specialization || "Specialist",
                date: payload.appointmentDate,
                time: payload.appointmentTime,
                type: payload.consultationType,
            });

            sessionStorage.setItem(
                "lastAppointmentBooking",
                JSON.stringify({
                    ...payload,
                    appointmentId,
                    doctor: selectedDoctor,
                    appointment,
                })
            );

            showToast("Appointment created. Redirecting to payment...", "success");
            setTimeout(() => {
                window.location.href = `appointment-payment.html?${params.toString()}`;
            }, 600);
        } catch (error) {
            console.error("Appointment booking failed:", error);
            showToast(error.message || "Failed to book appointment", "error");
            setLoading(false);
        }
    }

    function initializeBookingPage() {
        if (window.requireRole && !window.requireRole(["patient"])) return;

        const dateInput = document.getElementById("date");
        if (dateInput) dateInput.min = todayString();

        const doctorSelect = document.getElementById("doctor");
        if (doctorSelect) doctorSelect.addEventListener("change", updateSelectedDoctor);

        const form = document.getElementById("bookForm");
        if (form) {
            form.onsubmit = submitAppointment;
            loadDoctors();
        }
    }

    window.submitAppointment = submitAppointment;
    window.BookAppointment = {
        initialize: initializeBookingPage,
        loadDoctors,
    };

    document.addEventListener("DOMContentLoaded", initializeBookingPage);
})();
