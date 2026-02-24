export class BannerManager {
    constructor() {
        this.attackQueue = []; // { type: 'ATTACK', data, duration }
        this.defeatQueue = []; // { type: 'DEFEAT', data, duration }

        this.attackActive = false;
        this.defeatActive = false;

        this.leftEl = document.getElementById('banner-left');
        this.rightEl = document.getElementById('banner-right');
        this.defeatEl = document.getElementById('banner-defeat');

        // Listen for events
        window.addEventListener('GAME_EVENT', (e) => this.handleEvent(e));

        // Listen for Banner Settings (Console)
        window.addEventListener('BANNER_SETTINGS', (e) => this.updateSettings(e.detail));

        console.log("BannerManager Initialized (Phase 5.2 - Strip Layout)");

        // Default Banner Settings
        this.bannerSettings = { leftVisible: true, rightVisible: true, leftDist: 100, rightDist: 100 };

        // Inject Styles
        this.injectStyles();

        // Deduplication cache
        this.recentEvents = new Map();

        // Audio
        this.slashSound = new Audio('sounds/kılıc.mp3');
        this.slashSound.volume = 0.5; // Adjust as needed

        // Video Overlay Container
        this.videoContainer = document.createElement('div');
        this.videoContainer.id = 'video-overlay';
        document.body.appendChild(this.videoContainer);

        // Apply initial layout after a short delay to ensure elements exist
        setTimeout(() => this.applyLayout(), 500);
    }

    updateSettings(settings) {
        if (!settings) return;
        this.bannerSettings = { ...this.bannerSettings, ...settings };
        this.applyLayout();
    }

    applyLayout() {
        const leftEl = document.getElementById('banner-left');
        const rightEl = document.getElementById('banner-right');

        // Inverted Logic: 100 = Edge (Margin 0), 0 = Center (Margin Max)
        // Max Margin = ~40% of screen width approx. Let's say 400px safe.
        const maxMargin = 450;

        if (leftEl) {
            const dist = Math.max(0, Math.min(100, this.bannerSettings.leftDist)); // Clamp 0-100
            const margin = ((100 - dist) / 100) * maxMargin;

            leftEl.style.marginLeft = `${margin}px`;
            leftEl.style.display = this.bannerSettings.leftVisible ? 'flex' : 'none';
        }

        if (rightEl) {
            const dist = Math.max(0, Math.min(100, this.bannerSettings.rightDist)); // Clamp 0-100
            const margin = ((100 - dist) / 100) * maxMargin;

            rightEl.style.marginRight = `${margin}px`;
            rightEl.style.display = this.bannerSettings.rightVisible ? 'flex' : 'none';
        }
    }

    playSlashSound() {
        if (this.slashSound) {
            const clone = this.slashSound.cloneNode();
            clone.volume = 0.5;
            clone.play().catch(e => console.warn("Audio play failed:", e));
        }
    }

    injectStyles() {
        const oldStyle = document.getElementById('banner-styles');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'banner-styles';
        style.textContent = `
            /* Container Adjustments */
            #banner-container {
                top: 35% !important; 
                padding: 0 !important;
                align-items: flex-start !important;
            }

            /* Main Box (Horizontal Strip) */
            .arena-box {
                display: flex;
                flex-direction: row; 
                align-items: center;
                min-width: 300px;
                background: rgba(0, 0, 0, 0.85);
                padding: 10px 20px;
                border-radius: 50px; /* Pill shape */
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                pointer-events: none;
                animation-duration: 0.5s;
                animation-fill-mode: both;
            }
            
            #banner-defeat {
                width: 100%;
                display: flex;
                flex-direction: row; /* Side by side */
                justify-content: center;
                gap: 20px;
                pointer-events: none;
            }

            /* Animations */
            @keyframes slideInLeft { from { transform: translateX(-150%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideInRight { from { transform: translateX(150%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            @keyframes slideUp { from { transform: translate(-50%, 0); opacity: 1; } to { transform: translate(-50%, -100%); opacity: 0; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

            /* Profile Image */
            .arena-profile-img {
                width: 70px; 
                height: 70px;
                border-radius: 50%;
                border: 3px solid white;
                object-fit: cover;
                flex-shrink: 0;
            }

            /* Text Area */
            .arena-info {
                display: flex;
                flex-direction: column;
                margin: 0 15px;
            }

            .arena-name {
                color: white;
                font-weight: 900;
                font-size: 20px;
                text-shadow: 0 1px 2px black;
                white-space: nowrap;
            }
            
            .arena-sub {
                font-size: 14px;
                color: #ddd;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            /* Specific Side Styles */
            .left-enter { 
                animation-name: slideInLeft; 
                border-left: 5px solid #00ff00;
                padding-right: 30px;
            }
            
            .right-enter { 
                animation-name: slideInRight; 
                border-right: 5px solid #ff0000;
                flex-direction: row-reverse; /* Flip for right side */
                padding-left: 30px;
                text-align: right;
            }

            .top-enter { animation-name: slideDown; }
            .bg-fade-out { animation-name: fadeOut; animation-duration: 0.5s; animation-fill-mode: forwards; }
            .top-exit { animation-name: slideUp; animation-duration: 0.5s; animation-fill-mode: forwards; }

            /* Defeat Special Style */
             .defeat-label {
                color: #ff2c55;
                font-weight: 900;
                font-size: 28px;
                margin-top: 5px;
                text-shadow: 0 0 10px black;
             }
             .defeat-box {
                 background: rgba(20, 0, 0, 0.9);
                 border: 2px solid #ff2c55;
                 padding: 20px 40px;
                 border-radius: 20px;
                 display: flex;
                 flex-direction: column;
                 align-items: center;
                 position: relative; /* For absolute slash */
                 overflow: hidden;
                 transition: transform 0.2s, filter 0.2s;
             }
             
             /* Video Overlay */
             #video-overlay {
                 position: fixed;
                 top: 0;
                 left: 0;
                 width: 100%;
                 height: 100%;
                 pointer-events: none;
                 z-index: 1500; /* Below banners (2000), above game */
                 display: none;
                 align-items: center;
                 justify-content: center;
             }
             
             #video-overlay video {
                 max-width: 100%;
                 max-height: 100%;
                 object-fit: contain;
                 /* mix-blend-mode: screen; Optional: if user wants to remove black bg */
             }

             .broken {
                 transform: rotate(5deg) scale(0.95);
                 filter: grayscale(100%) brightness(50%) sepia(100%) hue-rotate(-50deg) saturate(500%) contrast(1.2); /* Deep red damaged look */
                 border-color: #500;
             }

             /* Slash FX */
             .slash {
                 position: absolute;
                 width: 200%;
                 height: 6px;
                 background: #fff;
                 box-shadow: 0 0 10px #fff, 0 0 20px #ff0055, 0 0 40px #ff0055;
                 top: 50%;
                 left: 50%;
                 opacity: 0;
                 pointer-events: none;
                 z-index: 10;
             }
             
             .slash-1 {
                 transform: translate(-50%, -50%) rotate(45deg) scaleX(0);
                 animation: slashHit 0.3s forwards cubic-bezier(0, 0.9, 0.1, 1);
             }
             
             .slash-2 {
                 transform: translate(-50%, -50%) rotate(-45deg) scaleX(0);
                 animation: slashHit 0.3s forwards cubic-bezier(0, 0.9, 0.1, 1);
             }

             @keyframes slashHit {
                 0% { transform: translate(-50%, -50%) rotate(var(--rot)) scaleX(0); opacity: 0.8; }
                 50% { transform: translate(-50%, -50%) rotate(var(--rot)) scaleX(1); opacity: 1; }
                 100% { transform: translate(-50%, -50%) rotate(var(--rot)) scaleX(1); opacity: 0; }
             }
             
             @keyframes shakeItems {
                 0% { transform: translate(0, 0); }
                 25% { transform: translate(5px, 5px); }
                 50% { transform: translate(-5px, -5px); }
                 75% { transform: translate(5px, -5px); }
                 100% { transform: translate(0, 0); }
             }
        `;
        document.head.appendChild(style);
    }

    handleEvent(e) {
        const { type, data } = e.detail;

        // Deduplication Logic (Prevent same event spam within 3 seconds)
        const key = `${type}_${data.username || data.attacker?.username}`;
        const now = Date.now();
        if (this.recentEvents.has(key)) {
            const lastTime = this.recentEvents.get(key);
            if (now - lastTime < 3000) {
                console.log(`Duplicate event ignored: ${key}`);
                return;
            }
        }
        this.recentEvents.set(key, now);

        if (type === 'PLAYER_DEFEATED') {
            this.defeatQueue.push({ type: 'DEFEAT', data, duration: 6000 });
            this.processDefeatQueue();
        } else if (type === 'BANNER_ATTACK') {
            this.attackQueue.push({ type: 'ATTACK', data, duration: 8000 });
            this.processAttackQueue();
        }
    }

    // --- ATTACK QUEUE PROCESSOR ---
    processAttackQueue() {
        if (this.attackActive || this.attackQueue.length === 0) return;

        const item = this.attackQueue.shift();
        this.attackActive = true;
        this.showAttackBanner(item);
    }

    showAttackBanner(item) {
        const { data, duration } = item;

        // Reset Logic
        this.leftEl.innerHTML = '';
        this.rightEl.innerHTML = '';
        this.leftEl.style.display = 'none';
        this.rightEl.style.display = 'none';

        this.leftEl.className = 'arena-box left-enter';
        this.rightEl.className = 'arena-box right-enter';

        // Attacker: Left Side
        this.leftEl.style.display = 'flex'; // Show banners
        this.renderProfile(this.leftEl, data.attacker, true);

        // Try Playing Video
        if (data.giftName) {
            this.playGiftVideo(data.giftName);
        }

        // Victim: Right Side (Multi-Victim Support)
        if (data.victims && data.victims.length > 0) {
            // Sort by loss count
            data.victims.sort((a, b) => b.count - a.count);

            // Take Top 3
            const topVictims = data.victims.slice(0, 3);

            this.rightEl.innerHTML = ''; // Clear previous
            this.rightEl.style.display = 'flex';
            this.rightEl.style.flexDirection = 'column'; // Stack vertically
            this.rightEl.style.alignItems = 'flex-end'; // Align to right
            this.rightEl.style.gap = '10px';
            this.rightEl.className = 'right-enter-container'; // No background on container itself

            topVictims.forEach((victim, index) => {
                const victimDiv = document.createElement('div');
                victimDiv.className = 'arena-box right-enter';
                // Add staggered delay
                victimDiv.style.animationDelay = `${index * 0.2}s`;

                this.renderProfile(victimDiv, victim, false);
                this.rightEl.appendChild(victimDiv);
            });
        }

        setTimeout(() => {
            this.leftEl.classList.add('bg-fade-out');

            // Fade out all victim boxes
            const victimBoxes = this.rightEl.querySelectorAll('.arena-box');
            victimBoxes.forEach(box => box.classList.add('bg-fade-out'));

            setTimeout(() => {
                this.leftEl.style.display = 'none';
                this.rightEl.style.display = 'none';
                this.rightEl.innerHTML = ''; // Clear children

                this.leftEl.classList.remove('bg-fade-out');

                this.attackActive = false;
                this.processAttackQueue();
            }, 500);
        }, duration);
    }

    // --- DEFEAT QUEUE PROCESSOR --- 
    processDefeatQueue() {
        // Allow up to 3 concurrent banners
        if (this.defeatEl.childElementCount >= 3 || this.defeatQueue.length === 0) return;

        const item = this.defeatQueue.shift();
        this.showDefeatBanner(item);

        // Try processing next immediately if space permits
        setTimeout(() => this.processDefeatQueue(), 200);
    }

    showDefeatBanner(item) {
        const { data, duration } = item;

        // Ensure container is visible
        this.defeatEl.style.display = 'flex';

        // Create individual box
        const banner = document.createElement('div');
        banner.className = 'defeat-box top-enter';
        banner.innerHTML = `
            <img src="${data.avatar}" class="arena-profile-img" style="width: 100px; height: 100px; border-color: #ff2c55;">
            <div class="arena-name" style="margin-top:10px; font-size: 20px;">${data.username}</div>
            <div class="defeat-label" style="font-size:24px;">YIKILDI!</div>
        `;

        this.defeatEl.appendChild(banner);

        // Sequence: 
        // 0ms: Appear
        // 1000ms: Slash 1 (Left->Right)
        // 1300ms: Slash 2 (Right->Left) + Broken Effect

        setTimeout(() => {
            const s1 = document.createElement('div');
            s1.className = 'slash slash-1';
            s1.style.setProperty('--rot', '45deg');
            banner.appendChild(s1);
            banner.style.animation = 'shakeItems 0.2s'; // Small shake
            this.playSlashSound();
        }, 1000);

        setTimeout(() => {
            const s2 = document.createElement('div');
            s2.className = 'slash slash-2';
            s2.style.setProperty('--rot', '-45deg');
            banner.appendChild(s2);

            // Apply broken state
            banner.classList.add('broken');
            banner.style.animation = 'shakeItems 0.4s'; // Bigger shake
            this.playSlashSound();
        }, 1300);

        setTimeout(() => {
            banner.classList.remove('top-enter');
            banner.classList.add('top-exit');

            setTimeout(() => {
                if (banner.parentNode) banner.parentNode.removeChild(banner);

                // Hide container if empty
                if (this.defeatEl.childElementCount === 0) {
                    this.defeatEl.style.display = 'none';
                }

                // Trigger queue for next item
                this.processDefeatQueue();
            }, 500);
        }, duration);
    }

    // Helper to render HTML structure (Horizontal Strip)
    renderProfile(container, player, isAttacker) {
        const subText = isAttacker ? 'SALDIRIYOR' : 'KAYBETTİ';
        const subColor = isAttacker ? '#00ff00' : '#ff4500';

        container.innerHTML = `
            <img src="${player.avatar}" class="arena-profile-img" style="border-color:${this.rgbToHex(player.color)}">
            <div class="arena-info">
                <div class="arena-name" style="color:${this.rgbToHex(player.color)}">${player.username}</div>
                <div class="arena-sub" style="color:${subColor}">${subText}</div>
            </div>
        `;
    }

    rgbToHex(c) {
        if (!c) return '#ffffff';
        // Check if c is string already
        if (typeof c === 'string') return c;
        return "#" + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1);
    }

    playGiftVideo(giftName) {
        const filename = giftName.toLowerCase().replace(/\s+/g, '_') + '.mp4';
        const videoPath = `videos/${filename}`;

        console.log(`Attempting to play video: ${videoPath}`);

        this.videoContainer.innerHTML = '';
        this.videoContainer.style.display = 'flex';

        const video = document.createElement('video');
        video.src = videoPath;
        video.autoplay = true;
        video.muted = false; // Allow sound if browser permits (interaction usually required)
        video.playsInline = true;

        // Error handling: If file not found, hide overlay
        video.onerror = () => {
            console.warn(`Video not found or error: ${videoPath}`);
            this.videoContainer.style.display = 'none';
        };

        // Cleanup on end
        video.onended = () => {
            this.videoContainer.style.display = 'none';
            this.videoContainer.innerHTML = '';
        };

        this.videoContainer.appendChild(video);

        // Force play
        video.play().catch(e => {
            console.warn("Video autoplay blocked:", e);
            // If blocked, maybe just hide
            this.videoContainer.style.display = 'none';
        });
    }
}
