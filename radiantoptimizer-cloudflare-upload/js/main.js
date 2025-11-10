// Optimized Black Particles with Smooth Performance
const canvas = document.getElementById('topoCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null };
    let textElements = [];

    function resize() {
        const heroSection = document.querySelector('.hero-main');
        width = canvas.width = window.innerWidth;
        // Limit canvas height to hero section only
        height = canvas.height = heroSection ? heroSection.offsetHeight : window.innerHeight * 0.6;
        initParticles();
        updateTextElements();
    }

    function updateTextElements() {
        textElements = [];
        const heroContent = document.querySelector('.hero-content-main');
        if (heroContent) {
            const textEls = heroContent.querySelectorAll('.hero-number-one, .hero-main-title, .hero-description');
            textEls.forEach(el => {
                const rect = el.getBoundingClientRect();
                textElements.push({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2 + window.scrollY,
                    width: rect.width,
                    height: rect.height
                });
            });
        }
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        const heroSection = document.querySelector('.hero-main');
        if (heroSection) {
            const rect = heroSection.getBoundingClientRect();
            // Only track mouse if it's within hero section bounds
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                mouse.x = e.x;
                mouse.y = e.y - rect.top;
            } else {
                // Reset mouse position when outside hero section
                mouse.x = null;
                mouse.y = null;
            }
        } else {
            mouse.x = e.x;
            mouse.y = e.y;
        }
    }, { passive: true });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2;
            this.size = Math.random() * 2 + 1.5;
            this.opacity = Math.random() * 0.5 + 0.4;
            this.twinkleSpeed = Math.random() * 0.015 + 0.008;
            this.twinkleDirection = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            // Twinkle effect
            this.opacity += this.twinkleSpeed * this.twinkleDirection;
            if (this.opacity >= 0.9 || this.opacity <= 0.3) {
                this.twinkleDirection *= -1;
            }
        }

        draw() {
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = '#003d99';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const particleCount = Math.floor((width * height) / 400);
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    let lastTime = 0;
    const fpsInterval = 1000 / 60;

    function animate(currentTime) {
        requestAnimationFrame(animate);
        
        const deltaTime = currentTime - lastTime;
        if (deltaTime < fpsInterval) return;
        
        lastTime = currentTime - (deltaTime % fpsInterval);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const len = particles.length;
        for (let i = 0; i < len; i++) {
            particles[i].update();
            particles[i].draw();
        }
    }

    resize();
    requestAnimationFrame(animate);
    
    // Update text elements on scroll
    window.addEventListener('scroll', updateTextElements, { passive: true });
    // Update text elements periodically
    setInterval(updateTextElements, 1000);
}

// Floating Card Fade on Scroll
window.addEventListener('scroll', function() {
    const floatingCard = document.getElementById('floatingCard');
    if (floatingCard) {
        const scrollPosition = window.scrollY;
        const fadeStart = 300;
        const fadeEnd = 800;
        
        if (scrollPosition <= fadeStart) {
            floatingCard.style.opacity = '1';
        } else if (scrollPosition >= fadeEnd) {
            floatingCard.style.opacity = '0';
        } else {
            const opacity = 1 - ((scrollPosition - fadeStart) / (fadeEnd - fadeStart));
            floatingCard.style.opacity = opacity.toString();
        }
    }
}, { passive: true });

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
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

// Custom Modal Functions
function showCustomModal(message, title = 'Notification') {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    if (modal && modalTitle && modalMessage) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.classList.add('active');
    }
}

function closeCustomModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCustomModal();
            }
        });
    }
});

// Newsletter Form
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('.newsletter-input').value;
        showCustomModal('Thank you for subscribing! We\'ll keep you updated at: ' + email, 'Success');
        this.reset();
    });
}

// Animated Performance Bars - FPS, PING, and PC LATENCY
function animatePerformanceBars() {
    const fpsBeforeBar = document.querySelector('.fps-before');
    const fpsAfterBar = document.querySelector('.fps-after');
    const fpsBeforeNum = document.querySelector('.fps-before-num');
    const fpsAfterNum = document.querySelector('.fps-after-num');
    
    const pingBeforeBar = document.querySelector('.ping-before');
    const pingAfterBar = document.querySelector('.ping-after');
    const pingBeforeNum = document.querySelector('.ping-before-num');
    const pingAfterNum = document.querySelector('.ping-after-num');
    
    const latencyBeforeBar = document.querySelector('.latency-before');
    const latencyAfterBar = document.querySelector('.latency-after');
    const latencyBeforeNum = document.querySelector('.latency-before-num');
    const latencyAfterNum = document.querySelector('.latency-after-num');
    
    if (!fpsBeforeBar) return;
    
    // FPS ranges: before 127-135, after 132-140
    const fps = {
        before: { current: 131, min: 127, max: 135 },
        after: { current: 138, min: 132, max: 140 }
    };
    
    // PING ranges: before 12-14, after 9-10
    const ping = {
        before: { current: 13, min: 12, max: 14 },
        after: { current: 10, min: 9, max: 10 }
    };
    
    // PC LATENCY ranges: before 150-172, after 84-97
    const latency = {
        before: { current: 161, min: 150, max: 172 },
        after: { current: 90, min: 84, max: 97 }
    };
    
    // Smooth transition for bars
    fpsBeforeBar.style.transition = 'width 0.8s ease-in-out';
    fpsAfterBar.style.transition = 'width 0.8s ease-in-out';
    pingBeforeBar.style.transition = 'width 0.8s ease-in-out';
    pingAfterBar.style.transition = 'width 0.8s ease-in-out';
    if (latencyBeforeBar) {
        latencyBeforeBar.style.transition = 'width 0.8s ease-in-out';
        latencyAfterBar.style.transition = 'width 0.8s ease-in-out';
    }
    
    function animateFPS() {
        // Generate random FPS values within range
        // After bar tends toward higher values to show clear gain
        const fpsBeforeTarget = Math.round(fps.before.min + Math.random() * (fps.before.max - fps.before.min));
        const fpsAfterTarget = Math.round(fps.after.min + 3 + Math.random() * (fps.after.max - fps.after.min - 3)); // Bias toward higher end
        
        // Update bars with smooth animation
        fpsBeforeBar.style.width = (fpsBeforeTarget / 150 * 100) + '%';
        fpsAfterBar.style.width = (fpsAfterTarget / 150 * 100) + '%';
        
        // Update numbers with smooth counting
        animateNumber(fpsBeforeNum, fps.before.current, fpsBeforeTarget, 800);
        animateNumber(fpsAfterNum, fps.after.current, fpsAfterTarget, 800);
        
        fps.before.current = fpsBeforeTarget;
        fps.after.current = fpsAfterTarget;
    }
    
    function animatePing() {
        // Before: jumps around 12-14
        const pingBeforeTarget = Math.round(ping.before.min + Math.random() * (ping.before.max - ping.before.min));
        
        // After: mostly 10, sometimes drops to 9 (30% chance)
        const pingAfterTarget = Math.random() < 0.3 ? 9 : 10;
        
        // Update bars with smooth animation
        pingBeforeBar.style.width = (pingBeforeTarget / 20 * 100) + '%';
        pingAfterBar.style.width = (pingAfterTarget / 20 * 100) + '%';
        
        // Update numbers with smooth counting
        animateNumber(pingBeforeNum, ping.before.current, pingBeforeTarget, 800, true);
        animateNumber(pingAfterNum, ping.after.current, pingAfterTarget, 800, true);
        
        ping.before.current = pingBeforeTarget;
        ping.after.current = pingAfterTarget;
    }
    
    function animateLatency() {
        // Before: 150-172
        const latencyBeforeTarget = Math.round(latency.before.min + Math.random() * (latency.before.max - latency.before.min));
        
        // After: 84-97
        const latencyAfterTarget = Math.round(latency.after.min + Math.random() * (latency.after.max - latency.after.min));
        
        // Update bars with smooth animation
        latencyBeforeBar.style.width = (latencyBeforeTarget / 200 * 100) + '%';
        latencyAfterBar.style.width = (latencyAfterTarget / 200 * 100) + '%';
        
        // Update numbers with smooth counting
        animateNumber(latencyBeforeNum, latency.before.current, latencyBeforeTarget, 800, true);
        animateNumber(latencyAfterNum, latency.after.current, latencyAfterTarget, 800, true);
        
        latency.before.current = latencyBeforeTarget;
        latency.after.current = latencyAfterTarget;
    }
    
    function animateNumber(element, start, end, duration, isMs = false) {
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.round(start + (end - start) * progress);
            element.textContent = current + (isMs ? 'ms' : '');
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
    
    // Start FPS animation - updates every 1.5 seconds
    animateFPS();
    setInterval(animateFPS, 1500);
    
    // Start PING animation - updates every 5 seconds (slower)
    animatePing();
    setInterval(animatePing, 5000);
    
    // Start PC LATENCY animation - updates every 3 seconds
    if (latencyBeforeBar) {
        animateLatency();
        setInterval(animateLatency, 3000);
    }
}

// Start animation when page loads
document.addEventListener('DOMContentLoaded', animatePerformanceBars);

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
}, { passive: true });

// Mobile Menu Toggle - Consolidated Handler
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    const body = document.body;

    if (mobileMenuToggle && navMenu) {
        console.log('Mobile menu initialized'); // Debug log
        
        // Toggle menu
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu toggle clicked'); // Debug log
            
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
            body.classList.toggle('no-scroll');
            
            console.log('Menu active:', navMenu.classList.contains('active')); // Debug log
        });

        // Close menu when clicking on nav links
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                body.classList.remove('no-scroll');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (navMenu.classList.contains('active') && 
                !navMenu.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                body.classList.remove('no-scroll');
            }
        });

        // Prevent menu clicks from closing it
        navMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    } else {
        console.log('Mobile menu elements not found'); // Debug log
    }
    
    // Initialize particles.js on mobile only
    if (window.innerWidth <= 768 && document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 80,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#0066ff"
                },
                "shape": {
                    "type": "circle"
                },
                "opacity": {
                    "value": 0.5,
                    "random": false
                },
                "size": {
                    "value": 3,
                    "random": true
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#0066ff",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 2,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": false
                    },
                    "onclick": {
                        "enable": false
                    },
                    "resize": true
                }
            },
            "retina_detect": true
        });
    }
});
