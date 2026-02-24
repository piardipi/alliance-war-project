export class LikeArenaManager {
    constructor() {
        this.participants = {}; // { username: { avatar, likes, lastTime, username } }
        this.winners = []; // [ { username, avatar, method, rank, time } ]
        this.isRaceActive = false;
        this.spamFilter = {
            maxLikesPerSecond: 1500, // Reasonable cap per user
            userLastLikeTime: {}
        };

        // Settings
        this.settings = {
            throttleTime: 500, // Update UI every 500ms
        };

        this.updateInterval = null;
        this.winnerSelectionMode = 'none'; // 'race', 'raffle'

        this.init();
    }

    init() {
        console.log("LikeArenaManager initialized.");
        this.setupUI();
        this.setupEventListeners();
        this.startUpdateLoop(); // Start UI update loop immediately, even if race is stopped (to show persisted data)

        // Load from LocalStorage if exists (Persistence)
        this.loadState();
    }

    loadState() {
        const saved = localStorage.getItem('like_arena_state');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.participants = data.participants || {};
                this.winners = data.winners || [];
                // this.isRaceActive = data.isRaceActive || false; // Maybe don't auto-start

                // Only show gallery if there are winners
                if (this.winners.length > 0) {
                    this.renderWinnersGallery();
                    // documented.getElementById('winners-gallery-panel')?.classList.add('visible'); // Optional: auto-show on load? Maybe better hidden to not annoy user.
                }

                this.updateArenaUI(true); // Force update
            } catch (e) {
                console.error("Failed to load Like Arena state:", e);
            }
        }
    }

    saveState() {
        const state = {
            participants: this.participants,
            winners: this.winners,
            isRaceActive: this.isRaceActive
        };
        localStorage.setItem('like_arena_state', JSON.stringify(state));
    }

    setupUI() {
        // UI is mainly in index.html, but we might inject dynamic rows here
    }

    setupEventListeners() {
        // Tab Switching
        document.querySelectorAll('.header-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');

                // Update Buttons
                document.querySelectorAll('.header-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Update Views
                document.querySelectorAll('.arena-view').forEach(v => {
                    v.style.display = 'none';
                    v.classList.remove('active');
                });
                const targetView = document.getElementById(targetId);
                if (targetView) {
                    targetView.style.display = 'flex'; // or block based on css, flex is good for column layout
                    targetView.classList.add('active');
                }
            });
        });

        // Clear History
        document.getElementById('clear-history-btn')?.addEventListener('click', () => {
            if (confirm("Kazananlar geçmişi silinecek. Emin misiniz?")) {
                this.winners = [];
                this.saveState();
                this.renderWinnersGallery();
            }
        });

        // Gift Box Click -> Opening Animation
        const giftBox = document.getElementById('like-gift-box');
        const panel = document.getElementById('like-arena-panel');
        const introText = document.getElementById('arena-intro-text');

        if (giftBox) {
            this.makeDraggable(giftBox);

            giftBox.onclick = (e) => {
                if (giftBox.getAttribute('data-dragging') === 'true') return;

                // 1. Play Open Animation on Box
                // giftBox.classList.add('open-anim'); // Maybe just fade out or scale up
                giftBox.style.transform = 'scale(1.5) rotate(10deg)';
                giftBox.style.opacity = '0';
                giftBox.style.pointerEvents = 'none';

                // 2. Show Text
                if (introText) introText.classList.add('play');

                // 3. Wait 1.5s then show Panel
                setTimeout(() => {
                    if (introText) {
                        introText.classList.remove('play');
                        // introText.style.opacity = '0';
                    }
                    panel.classList.remove('hidden');
                    panel.classList.add('visible');

                    // Reset Box visuals for when it comes back
                    setTimeout(() => { giftBox.style.transform = ''; }, 300);
                }, 1500);
            };
        }

        const closeBtn = document.getElementById('close-arena-panel');
        if (closeBtn) {
            closeBtn.onclick = () => {
                panel.classList.remove('visible');
                panel.classList.add('hidden');

                // Reset Box
                giftBox.style.opacity = '1';
                giftBox.style.pointerEvents = 'all';
            };
        }

        // Panel Drag Handle
        const dragHandle = document.getElementById('arena-panel-drag-handle');
        if (dragHandle && panel) {
            this.makeDraggable(panel, dragHandle);
        }

        // Feature Buttons
        document.getElementById('start-race-btn')?.addEventListener('click', () => this.startRace());
        document.getElementById('stop-race-btn')?.addEventListener('click', () => this.stopRace());
        document.getElementById('reset-race-btn')?.addEventListener('click', () => this.resetRace());

        // Winner Selection Buttons
        document.getElementById('pick-winner-btn')?.addEventListener('click', () => {
            document.getElementById('winner-selection-modal').style.display = 'flex';
        });

        document.getElementById('close-winner-modal')?.addEventListener('click', () => {
            document.getElementById('winner-selection-modal').style.display = 'none';
        });

        // Winner Mode Selections
        document.querySelectorAll('.winner-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.getAttribute('data-mode');
                const count = parseInt(e.target.getAttribute('data-count') || 1);
                this.selectWinners(mode, count);
                document.getElementById('winner-selection-modal').style.display = 'none';
            });
        });

        // Raffle Mode
        document.getElementById('raffle-mode-btn')?.addEventListener('click', () => {
            // Show Raffle Specific UI (Slider for count etc) - For now simple random 1
            this.selectWinners('raffle', 1);
            document.getElementById('winner-selection-modal').style.display = 'none';
        });
        // Winners Gallery Close
        document.getElementById('close-gallery-btn')?.addEventListener('click', () => {
            const gal = document.getElementById('winners-gallery-panel');
            if (gal) gal.classList.remove('visible');
        });
    }

    makeDraggable(element, handle = null) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const target = handle || element;

        target.addEventListener('mousedown', (e) => {
            // If dragging the handle, we are moving the element (panel)
            // If dragging the element itself (gift box), we move the element

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            // Only set attribute on the element being moved to prevent click (for gift box)
            element.setAttribute('data-dragging', 'false');

            target.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent text selection
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.setAttribute('data-dragging', 'true');

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;

            // Remove transform if it exists (conflicts with top/left)
            // But panel uses transform for scale... we should check.
            // For panel, we might need to rely on transform translate if we want to keep scale?
            // Actually, best to just stick to top/left for position and assume scale is 1 when visible.
            // The panel CSS has `transform: scale(1) translateX(0)` when visible.
            // Changing top/left works fine with that.
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                target.style.cursor = 'grab';
                // Keep data-dragging true for a moment to prevent click
                setTimeout(() => element.setAttribute('data-dragging', 'false'), 50);
            }
        });
    }

    // --- Core Logic ---

    // Called by tiktokLayer.js
    processLike(data) {
        // data: { username, avatar, likeCount, totalLikes }

        // 1. Check Active
        if (!this.isRaceActive && Object.keys(this.participants).length > 0) {
            // If race is stopped, we MIGHT still track if we want "Waiting Mode" to still accumulate?
            // User requirement: "Yayın boyunca veri silinmez". So we track always, but "Race Status" might control visualization or locking.
            // Let's assume we TRACK always, but visual indicators show "Stopped".
        }

        // 2. Spam Protection
        // const now = Date.now();
        // const lastTime = this.spamFilter.userLastLikeTime[data.username] || 0;
        // if (now - lastTime < 100 && data.likeCount > 50) { // Very fast unrealistic batch
        //    console.warn(`[LikeArena] Spam detected from ${data.username}. Ignoring.`);
        //    return;
        // }
        // this.spamFilter.userLastLikeTime[data.username] = now;

        // 3. Update Participant
        if (!this.participants[data.username]) {
            this.participants[data.username] = {
                username: data.username,
                avatar: data.avatar,
                likes: 0,
                lastTime: Date.now()
            };
        }

        // Accumulate (Allow manual setting/correction later)
        this.participants[data.username].likes += data.likeCount;
        this.participants[data.username].lastTime = Date.now();
        this.saveState();

        // UI update is handled by loop
    }

    startRace() {
        this.isRaceActive = true;
        this.updateStatusUI("AKTİF YARIŞ");
        document.getElementById('like-gift-box').classList.add('pulse-active');
    }

    stopRace() {
        this.isRaceActive = false;
        this.updateStatusUI("DURDURULDU");
        document.getElementById('like-gift-box').classList.remove('pulse-active');
    }

    resetRace() {
        if (!confirm("Tüm beğeni puanları silinecek (Kazananlar kalır). Devam?")) return;
        this.participants = {};
        // this.winners = []; // User requested to keep winners
        this.saveState();
        this.updateArenaUI(true);
        // this.renderWinnersGallery(); // No need to re-render winners if not cleared
    }

    updateStatusUI(text) {
        const el = document.getElementById('arena-status-text');
        if (el) el.innerText = text;
    }

    startUpdateLoop() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => {
            this.updateArenaUI();
        }, this.settings.throttleTime);
    }

    updateArenaUI(force = false) {
        const listContainer = document.getElementById('arena-list-body');
        if (!listContainer) return;

        // Sort participants: Likes DESC, then Time ASC (Earlier is better if tie)
        const sorted = Object.values(this.participants).sort((a, b) => {
            if (b.likes !== a.likes) return b.likes - a.likes;
            return a.lastTime - b.lastTime;
        });

        // Render Top 50 is enough for UI
        const topList = sorted.slice(0, 100);

        // Efficient Re-render (Simple innerHTML for now, virtual DOM is overkill for <100)
        // Optimization: Use ID-based update if rows exist? 
        // For simplicity and correctness with sorting changes, full string build is safer and fast enough for 100 items.

        let html = '';
        topList.forEach((p, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            html += `
                <div class="arena-row ${rankClass}">
                    <div class="col-rank">${rank}</div>
                    <div class="col-user">
                        <img src="${p.avatar}" class="user-avatar" onerror="this.src='/fallback_avatar.png'">
                        <span class="username">${p.username}</span>
                    </div>
                    <div class="col-likes">${p.likes.toLocaleString()} ❤️</div>
                    <div class="col-action">
                         <button class="mini-gift-btn" onclick="window.LikeArenaManagerInstance.giveGift('${p.username}')">🎁</button>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Update Total Likes Header - REMOVED AS REQUESTED
        // const total = sorted.reduce((sum, p) => sum + p.likes, 0);
        // const totalEl = document.getElementById('arena-total-likes');
        // if (totalEl) totalEl.innerText = total.toLocaleString();
    }

    // --- Winner Logic ---

    selectWinners(mode, count) {
        const sorted = Object.values(this.participants).sort((a, b) => b.likes - a.likes);
        let winners = [];

        if (mode === 'top') {
            winners = sorted.slice(0, count);
        } else if (mode === 'raffle') {
            // Random from top 50 (active participants)
            // Or filtered? Let's take everyone with > 0 likes
            const pool = sorted.filter(p => p.likes > 0);
            for (let i = 0; i < count; i++) {
                if (pool.length === 0) break;
                const idx = Math.floor(Math.random() * pool.length);
                winners.push(pool[idx]);
                pool.splice(idx, 1); // remove to allow unique
            }
        }

        if (winners.length > 0) {
            this.announceWinners(winners, mode);
        } else {
            alert("İşlem için yeterli katılımcı yok!");
        }
    }

    giveGift(username) {
        const p = this.participants[username];
        if (p) this.announceWinners([p], 'manual');
    }

    announceWinners(winnerList, method) {
        // 1. Add to Winners History
        winnerList.forEach((w, idx) => {
            this.winners.unshift({
                username: w.username,
                avatar: w.avatar,
                method: method,
                time: Date.now()
            });
        });

        // Keep list reasonable
        if (this.winners.length > 20) this.winners = this.winners.slice(0, 20);
        this.saveState();
        this.renderWinnersGallery();

        // Switch to Winners Tab logic could be here, or just let user switch.
        // User requested "kazananları seç,ince yine dışarıda bir sürü şey oluyor hepsi o beğeni kutusuna tıkaldığımda içinde olsun"
        // so we just update the internal list. Maybe notify?

        // Show Gallery Panel when a winner is added
        document.getElementById('winners-gallery-panel')?.classList.add('visible');

        // 2. Play Effects
        this.playCelebrationEffect(winnerList);
    }

    renderWinnersGallery() {
        const container = document.getElementById('internal-winners-list');
        if (!container) return;

        let html = '';
        this.winners.forEach(w => {
            const timeStr = new Date(w.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `
                <div class="winner-card">
                    <img src="${w.avatar}" class="winner-avatar">
                    <div class="winner-info">
                        <div class="winner-name">${w.username}</div>
                        <div class="winner-method">${w.method === 'top' ? '🏆 Sıralama' : (w.method === 'raffle' ? '🎲 Çekiliş' : '🎁 Özel')} - ${timeStr}</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    playCelebrationEffect(users) {
        // Spotlight Effect - USER REQUESTED TO REMOVE EXTERNAL OVERLAY
        // Keeping internal confetti or highlights if needed, but for now completely disabling the external popup.

        const overlay = document.getElementById('visual-fx-overlay');
        const container = document.getElementById('winner-spotlight-container');

        if (!overlay || !container) return;

        // Remove logic to show external overlay
        // overlay.classList.add('active'); 
        // container.classList.add('pop-in');

        // Instead, maybe just simple confetti?
        this.createConfetti();

        // Hide after time?
        // setTimeout(() => { ... }, 5000);
    }

    createConfetti() {
        // Simple 50 particle explosion via DOM
        const container = document.getElementById('visual-fx-overlay');
        for (let i = 0; i < 50; i++) {
            const conf = document.createElement('div');
            conf.classList.add('confetti');
            conf.style.left = '50%';
            conf.style.top = '50%';
            conf.style.backgroundColor = ['#f00', '#0f0', '#00f', '#ff0', '#0ff'][Math.floor(Math.random() * 5)];
            conf.style.transform = `rotate(${Math.random() * 360}deg)`;

            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 300;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;

            conf.style.setProperty('--x', `${x}px`);
            conf.style.setProperty('--y', `${y}px`);

            container.appendChild(conf);

            setTimeout(() => conf.remove(), 2000);
        }
    }
}
