// Homepage JavaScript - Spectacular Animations and Interactions

document.addEventListener('DOMContentLoaded', () => {
    initializePreloader();
    initializeNavbar();
    initializeMobileMenu();
    initializeCounters();
    initializeDoctorSlider();
    initializeScrollAnimations();
    initializeBackToTop();
    initializeSmoothScroll();
});

// Preloader
function initializePreloader() {
    const preloader = document.getElementById('preloader');
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.classList.add('hidden');
        }, 2000);
    });
}

// Navbar Scroll Effect
function initializeNavbar() {
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Mobile Menu
function initializeMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenu = document.getElementById('closeMenu');
    
    mobileToggle.addEventListener('click', () => {
        mobileMenu.classList.add('active');
        mobileToggle.classList.add('active');
    });
    
    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
    });
    
    // Close menu when clicking a link
    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
        });
    });
}

// Counter Animation
function initializeCounters() {
    const counters = document.querySelectorAll('.counter');
    
    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        
        updateCounter();
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
}

// Doctor Slider
let currentSlide = 0;

function initializeDoctorSlider() {
    const container = document.getElementById('doctorsContainer');
    const slides = document.querySelectorAll('.doctor-slide');
    const dotsContainer = document.getElementById('sliderDots');
    
    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    updateSlider();
}

function slideDoctors(direction) {
    const slides = document.querySelectorAll('.doctor-slide');
    currentSlide = Math.max(0, Math.min(currentSlide + direction, slides.length - 3));
    updateSlider();
}

function goToSlide(index) {
    currentSlide = index;
    updateSlider();
}

function updateSlider() {
    const container = document.getElementById('doctorsContainer');
    const slides = document.querySelectorAll('.doctor-slide');
    const dots = document.querySelectorAll('.dot');
    
    const slideWidth = slides[0].offsetWidth + 32; // Including padding
    container.scrollTo({
        left: currentSlide * slideWidth,
        behavior: 'smooth'
    });
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

// Scroll Animations
function initializeScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.service-card, .feature-item, .testimonial-card, .stat-box'
    );
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Back to Top Button
function initializeBackToTop() {
    const backToTop = document.getElementById('backToTop');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Smooth Scroll for Navigation Links
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Play Intro Video
function playIntroVideo() {
    // Video modal implementation
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
        <div class="video-modal-content">
            <button class="close-video" onclick="closeVideoModal()">&times;</button>
            <video controls autoplay>
                <source src="assets/videos/intro.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
    `;
    document.body.appendChild(modal);
    
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeVideoModal() {
    const modal = document.querySelector('.video-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
}

// Parallax Effect
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.gradient-orb');
    
    parallaxElements.forEach((el, index) => {
        const speed = 0.5 + (index * 0.1);
        el.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Add hover effects to cards
document.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.service-card, .doctor-card-detailed, .testimonial-card');
    if (card) {
        card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
});

// Dynamic greeting based on time
function updateGreeting() {
    const hour = new Date().getHours();
    const greeting = document.querySelector('.hero-title .title-line:first-child');
    
    if (greeting) {
        if (hour < 12) {
            greeting.textContent = 'Good Morning! Your Health Is';
        } else if (hour < 18) {
            greeting.textContent = 'Good Afternoon! Your Health Is';
        } else {
            greeting.textContent = 'Good Evening! Your Health Is';
        }
    }
}

updateGreeting();

// Floating particles animation
function createParticles() {
    const container = document.querySelector('.floating-particles');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 5 + 2}px;
            height: ${Math.random() * 5 + 2}px;
            background: rgba(37, 99, 235, ${Math.random() * 0.3});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: floatParticle ${Math.random() * 10 + 5}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(particle);
    }
}

createParticles();

// Add CSS for particles
const style = document.createElement('style');
style.textContent = `
    @keyframes floatParticle {
        0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) rotate(360deg);
            opacity: 0;
        }
    }
    
    .video-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .video-modal.active {
        opacity: 1;
    }
    
    .video-modal-content {
        position: relative;
        width: 90%;
        max-width: 900px;
    }
    
    .video-modal-content video {
        width: 100%;
        border-radius: 10px;
    }
    
    .close-video {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
    }
`;
document.head.appendChild(style);

// Export functions for global use
window.slideDoctors = slideDoctors;
window.playIntroVideo = playIntroVideo;
window.closeVideoModal = closeVideoModal;