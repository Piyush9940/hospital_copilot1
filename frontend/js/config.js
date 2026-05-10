// API Configuration
const CONFIG = {
    NODE_API: "https://hospital-copilot1.onrender.com/api",
    AI_API: "https://piyush9940-hospital-copilot-ai-service.hf.space",
    RAZORPAY_KEY: "rzp_test_your_key_here"
};

const API_BASE_URL = CONFIG.NODE_API;

window.CONFIG = CONFIG;
window.API_BASE_URL = API_BASE_URL;

document.addEventListener('DOMContentLoaded', () => {
    // Add animated background to all pages
    if (!document.querySelector('.animated-bg')) {
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
    }

    // Add CSS for slideOutRight animation
    if (!document.getElementById('globalConfigAnimations')) {
        const style = document.createElement('style');
        style.id = 'globalConfigAnimations';
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
    }
});
