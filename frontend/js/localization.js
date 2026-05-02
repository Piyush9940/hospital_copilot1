const translations = {
    en: {
        "nav.home": "Home",
        "nav.services": "Services",
        "nav.login": "Login",
        "nav.register": "Register",
        "auth.welcome": "Welcome Back",
        "auth.subtitle": "Sign in to continue to your dashboard",
        "auth.patient": "Patient",
        "auth.doctor": "Doctor",
        "auth.nurse": "Nurse",
        "auth.email": "Email Address",
        "auth.password": "Password",
        "auth.remember": "Remember me",
        "auth.forgot": "Forgot Password?",
        "auth.signin": "Sign In",
        "auth.noaccount": "Don't have an account?",
        "auth.signup": "Sign Up",
        "auth.facelogin": "Face Login"
    },
    es: {
        "nav.home": "Inicio",
        "nav.services": "Servicios",
        "nav.login": "Iniciar sesión",
        "nav.register": "Registrarse",
        "auth.welcome": "Bienvenido de nuevo",
        "auth.subtitle": "Inicie sesión para continuar a su panel",
        "auth.patient": "Paciente",
        "auth.doctor": "Médico",
        "auth.nurse": "Enfermera",
        "auth.email": "Correo electrónico",
        "auth.password": "Contraseña",
        "auth.remember": "Recuérdame",
        "auth.forgot": "¿Olvidaste tu contraseña?",
        "auth.signin": "Iniciar sesión",
        "auth.noaccount": "¿No tienes una cuenta?",
        "auth.signup": "Regístrate",
        "auth.facelogin": "Inicio de sesión facial"
    }
};

class LocalizationManager {
    constructor() {
        this.currentLang = localStorage.getItem('appLang') || 'en';
    }

    setLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('appLang', lang);
            this.applyTranslations();
        }
    }

    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[this.currentLang][key]) {
                if (el.tagName === 'INPUT' && el.type === 'placeholder') {
                    el.placeholder = translations[this.currentLang][key];
                } else {
                    // Check if it has an icon inside, preserve the icon
                    const icon = el.querySelector('svg') || el.querySelector('i');
                    if (icon) {
                        const iconOuterHTML = icon.outerHTML;
                        el.innerHTML = `${iconOuterHTML} ${translations[this.currentLang][key]}`;
                    } else {
                        el.textContent = translations[this.currentLang][key];
                    }
                }
            }
        });
        
        // Broadcast event for custom handling
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: this.currentLang }));
    }

    initLanguageSelector() {
        // Look for a select element with id "langSelector"
        const selector = document.getElementById('langSelector');
        if (selector) {
            selector.value = this.currentLang;
            selector.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }
}

window.I18n = new LocalizationManager();

// Apply translations on load
document.addEventListener('DOMContentLoaded', () => {
    window.I18n.applyTranslations();
    window.I18n.initLanguageSelector();
});
