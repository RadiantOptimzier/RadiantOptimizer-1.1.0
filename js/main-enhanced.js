// ============================================
// PREMIUM ANIMATIONS & INTERACTIONS
// ============================================

// Optimized Black Particles with Smooth Performance
const canvas = document.getElementById('topoCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null };
    let textElements = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
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
        mouse.x = e.x;
        mouse.y = e.y;
    }, { passive: true });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.size = Math.random() * 3 + 2;
            this.opacity = Math.random() * 0.5 + 0.5;
            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
            this.twinkleDirection = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            if (mouse.x && mouse.y) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 14400) {
                    const dist = Math.sqrt(distSq);
                    this.x += (dx / dist) * 1.2;
                    this.y += (dy / dist) * 1.2;
                }
            }

            for (let i = 0; i < textElements.length; i++) {
                const textBox = textElements[i];
                const dx = this.x - textBox.x;
                const dy = this.y - (textBox.y - window.scrollY);
                const distSq = dx * dx + dy * dy;
                const repelRadius = Math.max(textBox.width, textBox.height) / 2 + 150;
                const repelRadiusSq = repelRadius * repelRadius;
                
                if (distSq < repelRadiusSq) {
                    const dist = Math.sqrt(distSq);
                    const force = (1 - dist / repelRadius) * 5;
                    this.x += (dx / dist) * force;
                    this.y += (dy / dist) * force;
                }
            }
        }

        draw() {
            this.opacity += this.twinkleSpeed * this.twinkleDirection;
            if (this.opacity >= 1 || this.opacity <= 0.3) {
                this.twinkleDirection *= -1;
            }
            
            ctx.save();
            ctx.globalAlpha = this.opacity;
            
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
            gradient.addColorStop(0, '#0066ff');
            gradient.addColorStop(0.3, 'rgba(0, 102, 255, 0.6)');
            gradient.addColorStop(0.6, 'rgba(0, 102, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 102, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = '#003d99';
            ctx.fill();
            
            ctx.restore();
        }
    }

    function initParticles() {
        particles = [];
        const particleCount = Math.floor((width * height) / 5000);
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }

        requestAnimationFrame(animate);
    }

    resize();
    requestAnimationFrame(animate);
    
    window.addEventListener('scroll', updateTextElements, { passive: true });
    setInterval(updateTextElements, 1000);
}

// ============================================
// SCROLL PROGRESS INDICATOR
// ============================================
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress-bar';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    }, { passive: true });
}

// ============================================
// INTERSECTION OBSERVER - SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Optional: unobserve after animation
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements
    const animateElements = document.querySelectorAll(
        '.feature-showcase-item, .testimonial-item, .faq-item, .premium-feature-item, .section-header-center'
    );
    
    animateElements.forEach(el => {
        el.classList.add('scroll-animate');
        observer.observe(el);
    });
}

// ============================================
// TYPING EFFECT FOR HERO HEADLINE
// ============================================
function initTypingEffect() {
    const titleElement = document.querySelector('.hero-main-title');
    if (!titleElement) return;

    const originalText = titleElement.textContent;
    titleElement.textContent = '';
    titleElement.style.opacity = '1';
    
    let charIndex = 0;
    const typingSpeed = 50;
    
    function type() {
        if (charIndex < originalText.length) {
            titleElement.textContent += originalText.charAt(charIndex);
            charIndex++;
            setTimeout(type, typingSpeed);
        } else {
            titleElement.classList.add('typing-complete');
        }
    }
    
    setTimeout(type, 500);
}

// ============================================
// BUTTON RIPPLE EFFECT
// ============================================
function initRippleEffect() {
    const buttons = document.querySelectorAll(
        '.hero-cta-btn, .premium-purchase-btn, .cta-potential-btn, .newsletter-btn, .signin-button, .cta-button'
    );
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// ============================================
// 3D TILT EFFECT FOR CARDS
// ============================================
function init3DTilt() {
    const cards = document.querySelectorAll(
        '.testimonial-item, .feature-showcase-item, .premium-product-card'
    );
    
    cards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
}

// ============================================
// PARALLAX SCROLLING EFFECT
// ============================================
function initParallax() {
    const parallaxElements = document.querySelectorAll('.hero-main, .premium-product-section');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach((el, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    }, { passive: true });
}

// ============================================
// FLOATING ANIMATION FOR CTA BUTTONS
// ============================================
function initFloatingButtons() {
    const buttons = document.querySelectorAll('.hero-cta-btn, .premium-purchase-btn');
    
    buttons.forEach((btn, index) => {
        btn.style.animation = `float 3s ease-in-out ${index * 0.5}s infinite`;
    });
}

// ============================================
// ENHANCED PERFORMANCE BARS WITH PARTICLES
// ============================================
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
    
    const fps = {
        before: { current: 131, min: 127, max: 135 },
        after: { current: 138, min: 132, max: 140 }
    };
    
    const ping = {
        before: { current: 13, min: 12, max: 14 },
        after: { current: 10, min: 9, max: 10 }
    };
    
    const latency = {
        before: { current: 161, min: 150, max: 172 },
        after: { current: 90, min: 84, max: 97 }
    };
    
    fpsBeforeBar.style.transition = 'width 0.8s ease-in-out';
    fpsAfterBar.style.transition = 'width 0.8s ease-in-out';
    pingBeforeBar.style.transition = 'width 0.8s ease-in-out';
    pingAfterBar.style.transition = 'width 0.8s ease-in-out';
    if (latencyBeforeBar) {
        latencyBeforeBar.style.transition = 'width 0.8s ease-in-out';
        latencyAfterBar.style.transition = 'width 0.8s ease-in-out';
    }
    
    function animateFPS() {
        const fpsBeforeTarget = Math.round(fps.before.min + Math.random() * (fps.before.max - fps.before.min));
        const fpsAfterTarget = Math.round(fps.after.min + 3 + Math.random() * (fps.after.max - fps.after.min - 3));
        
        fpsBeforeBar.style.width = (fpsBeforeTarget / 150 * 100) + '%';
        fpsAfterBar.style.width = (fpsAfterTarget / 150 * 100) + '%';
        
        animateNumber(fpsBeforeNum, fps.before.current, fpsBeforeTarget, 800);
        animateNumber(fpsAfterNum, fps.after.current, fpsAfterTarget, 800);
        
        fps.before.current = fpsBeforeTarget;
        fps.after.current = fpsAfterTarget;
    }
    
    function animatePing() {
        const pingBeforeTarget = Math.round(ping.before.min + Math.random() * (ping.before.max - ping.before.min));
        const pingAfterTarget = Math.random() < 0.3 ? 9 : 10;
        
        pingBeforeBar.style.width = (pingBeforeTarget / 20 * 100) + '%';
        pingAfterBar.style.width = (pingAfterTarget / 20 * 100) + '%';
        
        animateNumber(pingBeforeNum, ping.before.current, pingBeforeTarget, 800, true);
        animateNumber(pingAfterNum, ping.after.current, pingAfterTarget, 800, true);
        
        ping.before.current = pingBeforeTarget;
        ping.after.current = pingAfterTarget;
    }
    
    function animateLatency() {
        const latencyBeforeTarget = Math.round(latency.before.min + Math.random() * (latency.before.max - latency.before.min));
        const latencyAfterTarget = Math.round(latency.after.min + Math.random() * (latency.after.max - latency.after.min));
        
        latencyBeforeBar.style.width = (latencyBeforeTarget / 200 * 100) + '%';
        latencyAfterBar.style.width = (latencyAfterTarget / 200 * 100) + '%';
        
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
    
    animateFPS();
    setInterval(animateFPS, 1500);
    
    animatePing();
    setInterval(animatePing, 5000);
    
    if (latencyBeforeBar) {
        animateLatency();
        setInterval(animateLatency, 3000);
    }
}

// ============================================
// SMOOTH SCROLL WITH EASING
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
                const startPosition = window.pageYOffset;
                const distance = targetPosition - startPosition;
                const duration = 1000;
                let start = null;
                
                function animation(currentTime) {
                    if (start === null) start = currentTime;
                    const timeElapsed = currentTime - start;
                    const run = ease(timeElapsed, startPosition, distance, duration);
                    window.scrollTo(0, run);
                    if (timeElapsed < duration) requestAnimationFrame(animation);
                }
                
                function ease(t, b, c, d) {
                    t /= d / 2;
                    if (t < 1) return c / 2 * t * t + b;
                    t--;
                    return -c / 2 * (t * (t - 2) - 1) + b;
                }
                
                requestAnimationFrame(animation);
            }
        });
    });
}

// ============================================
// FLOATING CARD FADE ON SCROLL
// ============================================
function initFloatingCardFade() {
    const floatingCard = document.getElementById('floatingCard');
    if (!floatingCard) return;
    
    window.addEventListener('scroll', function() {
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
    }, { passive: true });
}

// ============================================
// NAVBAR SCROLL EFFECT
// ============================================
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });
}

// ============================================
// MOBILE MENU TOGGLE
// ============================================
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    const body = document.body;

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
            body.classList.toggle('no-scroll');
        });

        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                body.classList.remove('no-scroll');
            });
        });

        document.addEventListener('click', function(e) {
            if (navMenu.classList.contains('active') && 
                !navMenu.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                body.classList.remove('no-scroll');
            }
        });

        navMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// ============================================
// NEWSLETTER FORM
// ============================================
function initNewsletterForm() {
    const newsletterForm = document.querySelector('.newsletter-form');
    if (!newsletterForm) return;
    
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('.newsletter-input').value;
        alert('Thank you for subscribing! We\'ll keep you updated at: ' + email);
        this.reset();
    });
}

// ============================================
// PARTICLES.JS FOR MOBILE
// ============================================
function initMobileParticles() {
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
}

// ============================================
// INITIALIZE ALL EFFECTS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing premium animations...');
    
    // Core animations
    initScrollProgress();
    initScrollAnimations();
    initRippleEffect();
    init3DTilt();
    initFloatingButtons();
    initSmoothScroll();
    
    // Navigation & UI
    initNavbarScroll();
    initMobileMenu();
    initNewsletterForm();
    
    // Visual effects
    initFloatingCardFade();
    initMobileParticles();
    
    // Delayed effects for better UX
    setTimeout(() => {
        initTypingEffect();
        initParallax();
    }, 300);
    
    // Performance bars
    animatePerformanceBars();
    
    console.log('Premium animations initialized!');
});
