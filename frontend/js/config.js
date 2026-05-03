// API Configuration
const CONFIG = {
    NODE_API: "https://hospital-copilot1.onrender.com/api",
    AI_API: "https://piyush9940-hospital-copilot-ai-service.hf.space",
    RAZORPAY_KEY: "rzp_test_your_key_here"
};

const API_BASE_URL = "https://hospital-copilot1.onrender.com/api";


document.addEventListener('DOMContentLoaded', () => {
    // Add animated background to all pages
    const bg = document.createElement('div');
    bg.className = 'animated-bg';
    for (let i = 0; i < 20; i++) {
        const span = document.createElement('span');
        span.style.left = `${Math.random() * 100}%`;
        span.style.animationDelay = `${Math.random() * 10}s`;
        span.style.width = `${Math.random() * 30 + 10}px`;
        span.style.height = span.style.width;
        bg.appendChild(span);
    }
    document.body.prepend(bg);
    
    // Add CSS for slideOutRight animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }
    `;
    document.head.appendChild(style);

    // Add Google Translate Widget
    const translateDiv = document.createElement('div');
    translateDiv.id = 'google_translate_element';
    translateDiv.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
    document.body.appendChild(translateDiv);

    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element');
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(script);
});