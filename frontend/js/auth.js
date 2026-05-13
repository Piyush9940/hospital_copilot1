// ===============================
// Backend API Configuration
// ===============================
// API_BASE_URL is defined in config.js

const STORAGE_KEYS = {
    TOKEN: "hospital_copilot_token",
    USER: "hospital_copilot_user",
    ROLE: "hospital_copilot_role",
};

let authRedirectInProgress = false;
let lastToast = { message: "", time: 0 };

// ===============================
// Safe UI Helpers Fallback
// ===============================
const Toast = window.Toast || {
    show(message, type = "info") {
        console.log(`[${type.toUpperCase()}] ${message}`);

        const now = Date.now();
        if (lastToast.message === message && now - lastToast.time < 2500) {
            return;
        }
        lastToast = { message, time: now };

        const existing = document.querySelector(".auth-toast-fallback");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = `auth-toast-fallback ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            max-width: min(420px, calc(100vw - 40px));
            z-index: 9999;
            padding: 12px 16px;
            border-radius: 10px;
            color: #fff;
            font: 500 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22);
            background: ${type === "error" ? "#dc2626" : type === "warning" ? "#d97706" : type === "success" ? "#059669" : "#2563eb"};
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    },
};

const LoadingOverlay = window.LoadingOverlay || {
    show() {},
    hide() {},
};

// ===============================
// Utility Helpers
// ===============================
function safeTrim(value) {
    return String(value ?? "").trim();
}

function buildUrl(endpoint) {
    const base = API_BASE_URL.replace(/\/+$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
}

function calculateAgeFromDOB(dob) {
    if (!dob) return null;

    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
        age--;
    }

    return age > 0 ? age : null;
}

function normalizePhone(phone) {
    let cleaned = safeTrim(phone).replace(/\s+/g, "");

    // Convert 10-digit Indian number to E.164
    if (/^\d{10}$/.test(cleaned)) {
        cleaned = `+91${cleaned}`;
    }

    return cleaned;
}

function redirectToDashboard(role) {
    const redirectMap = {
        patient: "patient-dashboard.html",
        doctor: "doctor-dashboard2.html",
        nurse: "nurse-dashboard.html",
    };

    window.location.href = redirectMap[role] || "dashboard-home.html";
}

function clearStoredSession() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
}

function decodeJwtPayload(token) {
    try {
        const payload = String(token || "").split(".")[1];
        if (!payload) return null;

        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
        return JSON.parse(atob(padded));
    } catch (error) {
        return null;
    }
}

function isTokenUsable(token) {
    if (!token || typeof token !== "string") return false;

    const payload = decodeJwtPayload(token);
    if (!payload) return true;

    if (payload.exp && Date.now() >= Number(payload.exp) * 1000) {
        return false;
    }

    return true;
}

function redirectToLoginForSession() {
    if (authRedirectInProgress) return;

    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "login.html" || currentPage === "register.html") return;
    authRedirectInProgress = true;

    const loginPath = window.location.pathname.includes("/pages/")
        ? "login.html"
        : "pages/login.html";

    window.location.href = loginPath;
}

// ===============================
// API Helper
// ===============================
const API = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const isFormData = options.body instanceof FormData;

        const config = {
            method: options.method || "GET",
            headers: {
                ...(isFormData ? {} : { "Content-Type": "application/json" }),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {}),
            },
        };

        if (options.body !== undefined) {
            config.body = isFormData
                ? options.body
                : typeof options.body === "string"
                ? options.body
                : JSON.stringify(options.body);
        }

        console.log("API Request:", buildUrl(endpoint), config);

        const response = await fetch(buildUrl(endpoint), config);

        let result = {};
        try {
            result = await response.json();
        } catch (error) {
            result = {};
        }

        if (!response.ok) {
            console.error("API ERROR:", {
                endpoint,
                status: response.status,
                result,
            });

            if (response.status === 401) {
                clearStoredSession();
                if (!authRedirectInProgress) {
                    Toast.show("Your session expired. Please log in again.", "warning");
                    setTimeout(redirectToLoginForSession, 500);
                }
            }

            throw new Error(
                result?.message ||
                    result?.error ||
                    result?.detail ||
                    result?.errors?.[0]?.msg ||
                    `Request failed with status ${response.status}`
            );
        }

        return result;
    },

    async get(endpoint, options = {}) {
        return this.request(endpoint, { method: "GET", ...options });
    },

    async post(endpoint, body = {}, options = {}) {
        return this.request(endpoint, {
            method: "POST",
            body,
            ...options,
        });
    },

    async put(endpoint, body = {}, options = {}) {
        return this.request(endpoint, {
            method: "PUT",
            body,
            ...options,
        });
    },

    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: "DELETE",
            ...options,
        });
    },
};

// ===============================
// Auth Helper
// ===============================
const Auth = {
    isAuthenticated() {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!isTokenUsable(token)) {
            clearStoredSession();
            return false;
        }

        return !!token;
    },

    getToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "null");
        } catch (error) {
            return null;
        }
    },

    getRole() {
        return localStorage.getItem(STORAGE_KEYS.ROLE);
    },

    setSession(token, user, fallbackRole = "") {
        if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

        const role = user?.role || fallbackRole || "";
        if (role) localStorage.setItem(STORAGE_KEYS.ROLE, role);
    },

    clearSession() {
        clearStoredSession();
    },

    logout() {
        this.clearSession();
        window.location.href = "login.html";
    },
};

// ===============================
// Auth Manager
// ===============================
class AuthManager {
    static getUser() {
        return Auth.getUser();
    }

    static extractAuth(response, fallbackRole = "") {
        const token =
            response?.token ||
            response?.accessToken ||
            response?.data?.token ||
            response?.data?.accessToken ||
            null;

        const user =
            response?.user ||
            response?.data?.user ||
            (response?.data && typeof response.data === "object" ? response.data : null) ||
            null;

        return {
            token,
            user: user
                ? {
                      ...user,
                      role: user.role || fallbackRole || "",
                  }
                : null,
        };
    }

    static async login(email, password, role) {
        try {
            LoadingOverlay.show();

            const response = await API.post("/auth/login", {
                email: safeTrim(email),
                password: String(password || ""),
                role: safeTrim(role),
            });

            const { token, user } = this.extractAuth(response, role);

            if (!token || !user) {
                throw new Error("Invalid login response from server");
            }

            Auth.setSession(token, user, role);

            Toast.show("Login successful! Redirecting...", "success");

            setTimeout(() => {
                redirectToDashboard(user.role || role);
            }, 700);
        } catch (error) {
            console.error("Login error:", error);
            Toast.show(`Login failed: ${error.message}`, "error");
        } finally {
            LoadingOverlay.hide();
        }
    }

    static async register(userData) {
        try {
            LoadingOverlay.show();

            const role = safeTrim(userData?.role);
            const fullName = `${safeTrim(userData?.firstName)} ${safeTrim(userData?.lastName)}`.trim();
            const email = safeTrim(userData?.email);
            const password = String(userData?.password || "");
            const phone = normalizePhone(userData?.phone || "");

            if (!fullName) throw new Error("Name is required");
            if (!email) throw new Error("Email is required");
            if (!password) throw new Error("Password is required");
            if (!role) throw new Error("Role is required");

            const registerPayload = {
                name: fullName,
                email,
                password,
                role,
                phone,
                faceDescriptor: userData?.faceDescriptor || null,
            };

            console.log("Register payload:", registerPayload);

            const registerResponse = await API.post("/auth/register", registerPayload);
            let { token, user } = this.extractAuth(registerResponse, role);

            if (!token || !user) {
                const loginResponse = await API.post("/auth/login", {
                    email,
                    password,
                    role,
                });
                const extracted = this.extractAuth(loginResponse, role);
                token = extracted.token;
                user = extracted.user;
            }

            if (!token || !user) {
                throw new Error("Registration succeeded but login session could not be created");
            }

            Auth.setSession(token, user, role);

            const userId = user.id || user.userId || user._id;

            if (userId) {
                try {
                    await this.createRoleProfile(role, userId, userData);
                } catch (profileError) {
                    console.warn("Profile creation failed:", profileError);
                    Toast.show(
                        `Account created, but profile setup is incomplete: ${profileError.message}`,
                        "warning"
                    );
                }
            }

            Toast.show("Registration successful! Redirecting...", "success");

            setTimeout(() => {
                redirectToDashboard(role);
            }, 900);
        } catch (error) {
            console.error("Registration error:", error);
            Toast.show(`Registration failed: ${error.message}`, "error");
        } finally {
            LoadingOverlay.hide();
        }
    }

    static async createRoleProfile(role, userId, userData) {
        if (role === "patient") {
            const age = calculateAgeFromDOB(userData?.dob);
            if (!age) {
                throw new Error("Please enter a valid date of birth");
            }

            return API.post("/patient/profile", {
                userId,
                age,
                gender: safeTrim(userData?.gender || "Male"),
                history: safeTrim(userData?.medicalHistory || ""),
                allergies: "",
                medications: "",
            });
        }

        if (role === "doctor") {
            return API.post("/doctor/profile", {
                userId,
                specialization: safeTrim(userData?.specialization || "General"),
                experience: Number(userData?.experience || 0),
                qualification: safeTrim(userData?.licenseNumber || "Medical Practitioner"),
                appointmentFee: Number(userData?.consultationFee || 0),
                hospitalName: "HealthCare Plus",
            });
        }

        if (role === "nurse") {
            return API.post("/nurse/profile", {
                userId,
                department: safeTrim(userData?.department || "general"),
                shift: "Morning",
                qualification: safeTrim(userData?.licenseNumber || "Registered Nurse"),
            });
        }

        return null;
    }

    static async logout() {
        Auth.logout();
    }

    static redirectBasedOnRole() {
        redirectToDashboard(Auth.getRole());
    }
}

// ===============================
// Route Protection
// ===============================
function requireAuth() {
    if (!Auth.isAuthenticated()) {
        if (!authRedirectInProgress) {
            authRedirectInProgress = true;
            Toast.show("Please login to continue", "warning");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 300);
        }
        return false;
    }
    return true;
}

function requireRole(allowedRoles) {
    if (!requireAuth()) return false;

    const userRole = Auth.getRole();

    if (!allowedRoles.includes(userRole)) {
        Toast.show("Access denied", "error");
        window.location.href = "dashboard-home.html";
        return false;
    }

    return true;
}

// ===============================
// Init
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname.split("/").pop();

    const roleRequirements = {
        "patient-dashboard.html": ["patient"],
        "patient-profile.html": ["patient"],
        "patient-reports.html": ["patient"],
        "patient-vitals.html": ["patient"],
        "patient-emergency.html": ["patient"],
        "patient-chat-history.html": ["patient"],

        "doctor-dashboard.html": ["doctor"],
        "doctor-dashboard2.html": ["doctor"],
        "doctor-profile.html": ["doctor"],
        "doctor-appointments.html": ["doctor"],
        "doctor-patient-view.html": ["doctor"],
        "doctor-chat-approval.html": ["doctor"],
        "doctor-reports.html": ["doctor"],
        "doctor-video-call.html": ["doctor"],
        "doctor-emergency.html": ["doctor"],

        "nurse-dashboard.html": ["nurse"],
        "nurse-patient-queue.html": ["nurse"],
        "nurse-case-review.html": ["nurse"],
        "nurse-notes.html": ["nurse"],
    };

    if (roleRequirements[currentPage]) {
        requireRole(roleRequirements[currentPage]);
    }

    if (
        (currentPage === "login.html" || currentPage === "register.html") &&
        Auth.isAuthenticated()
    ) {
        AuthManager.redirectBasedOnRole();
    }
});

window.API = API;
window.Auth = Auth;
window.AuthManager = AuthManager;
window.requireAuth = requireAuth;
window.requireRole = requireRole;
window.Toast = Toast;
window.LoadingOverlay = LoadingOverlay;

console.log("auth.js loaded. AuthManager available:", !!window.AuthManager);
