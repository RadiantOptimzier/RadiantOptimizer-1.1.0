/* Black Rainbow Animated Cursor - Custom Element */
console.log('[CURSOR] Rainbow cursor initialization...');

(function() {
    // Check if we're on PC (not mobile/tablet)
    const isPC = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isPC || hasTouch) {
        console.log('[CURSOR] Touch/mobile device - using default cursor');
        return;
    }
    
    console.log('[CURSOR] Desktop detected - Creating custom cursor...');
    
    // Hide default cursor
    const style = document.createElement('style');
    style.textContent = `
        * {
            cursor: none !important;
        }
        input[type="text"],
        input[type="email"],
        input[type="password"],
        input[type="search"],
        textarea,
        select {
            cursor: text !important;
        }
        #custom-cursor {
            position: fixed;
            width: 32px;
            height: 32px;
            pointer-events: none;
            z-index: 999999;
            top: 0;
            left: 0;
            transform-origin: top left;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            will-change: transform;
        }
    `;
    document.head.appendChild(style);
    
    // Create cursor element
    const cursor = document.createElement('img');
    cursor.id = 'custom-cursor';
    cursor.style.display = 'none';
    document.body.appendChild(cursor);
    
    // Cursor frames
    const frames = [
        'cursor_frames/frame_000.png',
        'cursor_frames/frame_001.png',
        'cursor_frames/frame_002.png',
        'cursor_frames/frame_003.png',
        'cursor_frames/frame_004.png',
        'cursor_frames/frame_005.png',
        'cursor_frames/frame_006.png',
        'cursor_frames/frame_007.png'
    ];
    
    let currentFrame = 0;
    
    // Preload all frames
    const preloadedFrames = [];
    let loadedCount = 0;
    
    frames.forEach((src, index) => {
        const img = new Image();
        img.onload = () => {
            loadedCount++;
            console.log(`[CURSOR] Frame ${index} loaded`);
            
            if (loadedCount === frames.length) {
                console.log('[CURSOR] 🌈 All frames loaded! Starting animation...');
                cursor.src = frames[0];
                cursor.style.display = 'block';
                startAnimation();
            }
        };
        img.onerror = () => {
            console.error(`[CURSOR] Failed to load: ${src}`);
        };
        img.src = src;
        preloadedFrames[index] = img;
    });
    
    // Track mouse position - INSTANT, NO LAG
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }, { passive: true });
    
    // Start animation
    function startAnimation() {
        setInterval(() => {
            currentFrame = (currentFrame + 1) % frames.length;
            cursor.src = frames[currentFrame];
        }, 100); // 100ms per frame = 800ms cycle
    }
})();
