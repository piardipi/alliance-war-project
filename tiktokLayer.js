import { io } from "socket.io-client";

// Dynamic Backend URL (Works for Localhost & LAN)
const BACKEND_URL = `http://localhost:3333`;
console.log(`[TikTokLayer] Connecting to Backend at: ${BACKEND_URL}`);

export const tiktokLayer = {
    socket: io(BACKEND_URL),
    connected: false,
    eventLog: [],

    // FAZ-4.2: Normalized Settings
    settings: {
        likesPerToken: 100, // Varsayılan: 100 beğeni = 1 Jeton
        defaultGiftValue: 1, // Varsayılan Hediye Değeri: 1 (İstenilen 1)
        giftValues: {
            "rose": 1,
            "tiktok": 1,
            "gg": 1,
            "ice cream cone": 1,
            "music on stage": 1,
            "love you so much": 1,
            "cake slice": 1,
            "you're awesome": 1,
            "parliyorsun!": 1,
            "heart me": 10,
            "thumbs up": 1,
            "heart": 10,
            "glow stick": 1,
            "tulip": 1,
            "match star": 1,
            "cheerful clover": 1,
            "finger heart": 5,
            "turkish coffee": 5,
            "blue bead": 5,
            "rosa": 10,
            "friendship necklace": 10,
            "journey pass": 10,
            "gold boxing gloves": 10,
            "perfume": 20,
            "doughnut": 30,
            "tea": 50,
            "family": 99,
            "cap": 99,
            "hat and mustache": 99,
            "game controller": 100,
            "super gg": 100,
            "bubble gum": 99,
            "mishka bear": 100,
            "confetti": 100,
            "hand hearts": 100,
            "hand heart": 100,
            "sceptre": 150,
            "crown": 200,
            "sunglasses": 199,
            "hearts": 199,
            "corgi": 300,
            "diamond ring of love": 300,
            "make it rain": 500,
            "money gun": 500,
            "you’re amazing": 500,
            "dj glasses": 500,
            "gem gun": 500,
            "swan": 699,
            "train": 899,
            "travel with you": 999,
            "galaxy": 1000,
            "gerry the giraffe": 1000,
            "fireworks": 1000,
            "future encounter": 1500,
            "under control": 1500,
            "whale diving": 2150,
            "motorcycle": 2988,
            "soaring spirit": 3999,
            "meteor shower": 3000,
            "leon the kitten": 4888,
            "unicorn fantasy": 5000,
            "flying jets": 5000,
            "wolf": 5500,
            "future city": 6000,
            "sports car": 7000,
            "interstellar": 10000,
            "falcon": 10000,
            "white tiger": 16000,
            "dragon flame": 26999,
            "lion": 29999,
            "leon and lion": 34000,
            "tiktok universe": 45000,
            "king of legends": 740000
        },
        fireVideoTriggerCount: 2, // New Trigger Count
        videoPreferences: {}, // { filename: { enabled: true, duration: 13 } }
        playerVideos: {} // Initialize to prevent undefined errors
    },
    processedEvents: new Set(), // Deduplication
    users: {}, // { uniqueId: { username, avatar, tokens, pendingLikes } }
    pendingGrowth: {}, // { username: amount }
    processInterval: null,

    init: function (gameLayer) {
        console.log("TikTok Layer Initializing (FAZ-4.2 Refined)...");
        this.game = gameLayer; // Store reference to conquestLayer
        this.loadSettings();
        this.createUI();
        this.connectBackend();
        this.fetchVideos(); // Load video list
        this.startBatchProcessing();
    },

    startBatchProcessing: function () {
        if (this.processInterval) clearInterval(this.processInterval);
        this.processInterval = setInterval(() => {
            this.processPendingGrowth();
        }, 100); // Process every 100ms (Faster updates)
    },

    processPendingGrowth: function () {
        if (!this.game || Object.keys(this.pendingGrowth).length === 0) return;

        // Her jeton işlenişinde ittifakların güncelliğini zorla kontrol et (Kullanıcının isteği: "devamlı kontrol edilmeli")
        if (this.game.loadAlliances) {
            this.game.loadAlliances();
        }

        let anyGrowth = false;
        const MAX_PROCESS_PER_TICK = 30; // Yavaş yayılma (30px / 100ms)

        Object.entries(this.pendingGrowth).forEach(([rawUsername, amount]) => {
            if (amount > 0) {
                // Ensure player exists
                const user = this.users[rawUsername];
                let username = rawUsername;
                let avatar = user ? user.avatar : null;

                // Phase 9: İttifak Yönlendirmesi
                let activeAlliance = null;
                if (this.game && this.game.alliances) {
                    const lowerId = rawUsername.toLowerCase();
                    const alli = this.game.alliances.find(a => a.members.some(m => m.toLowerCase() === lowerId));
                    if (alli) {
                        username = alli.name;
                        activeAlliance = alli;

                        // İttifakın üye avatarını o anki hediyeden/kullanıcıdan gelen veri ile güncelle
                        if (user && user.avatar) {
                            if (!alli.memberAvatars) alli.memberAvatars = {};
                            if (alli.memberAvatars[lowerId] !== user.avatar) {
                                alli.memberAvatars[lowerId] = user.avatar;
                                localStorage.setItem('customAlliances', JSON.stringify(this.game.alliances));
                                if (window.renderCustomAlliancesUI) window.renderCustomAlliancesUI();
                            }
                        }

                        // Eski yapı için yine geçerli avatarları setle
                        if (alli.memberAvatars && alli.memberAvatars[lowerId]) {
                            avatar = alli.memberAvatars[lowerId];
                        }
                    }
                }

                const player = this.game.spawnPlayer(username, avatar);
                if (player) {
                    // İttifak Resimlerini Haritaya Güncelle (Yukarıda eklediğimiz yeni yöntem)
                    if (activeAlliance && this.game.syncAllianceAvatars) {
                        // Eğer henüz set edilmemişse ittifak olduğunu the game bile bilsin
                        player.isAlliance = true;
                        player.allianceRefId = activeAlliance.id;
                        this.game.syncAllianceAvatars(player.id, activeAlliance);
                    }
                    // Start capping logic
                    const toProcess = Math.min(amount, MAX_PROCESS_PER_TICK);
                    const remaining = amount - toProcess;

                    // Process only the capped amount
                    // Pass trackVictims=true (4th arg) to get Battle Report
                    const report = this.game.grow(player.id, toProcess, true, true);

                    // Dispatch Banner Event if victims exist
                    if (report && report.victims && report.victims.length > 0) {
                        window.dispatchEvent(new CustomEvent('GAME_EVENT', {
                            detail: {
                                type: 'BANNER_ATTACK',
                                data: {
                                    attacker: {
                                        username: user.username,
                                        avatar: user.avatar,
                                        color: player.color // Need player color from game
                                    },
                                    victims: report.victims,
                                    giftName: null // or pass specific gift if we tracked it per user... 
                                    // ideally we'd pass the actual gift name that caused this, 
                                    // but pendingGrowth aggregates multiple gifts. 
                                    // For now, let's leave giftName null or generic.
                                }
                            }
                        }));
                    }

                    // Update queue: Keep remaining, or delete if done
                    if (remaining > 0) {
                        this.pendingGrowth[rawUsername] = remaining;
                    } else {
                        delete this.pendingGrowth[rawUsername];
                    }

                    anyGrowth = true;
                } else {
                    // If player spawn failed (e.g. full map), clear their queue to prevent infinite retry loop
                    console.warn(`Could not spawn ${username}, clearing queue.`);
                    delete this.pendingGrowth[username];
                }
            }
        });

        // Loop handles queue clearing individually now.
        // this.pendingGrowth = {}; // REMOVED global clear since we might have remainders

        // Single Redraw at the end
        if (anyGrowth) {
            this.game.updateTexture(); // Efficient texture push
            if (this.game.saveGameStateDebounced) this.game.saveGameStateDebounced();
        }
    },

    loadSettings: function () {
        const saved = localStorage.getItem('tiktok_settings_v3');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                console.log("Loaded TikTok Settings from Storage:", parsed);
                // Merge general settings
                this.settings.likesPerToken = parsed.likesPerToken || this.settings.likesPerToken;
                this.settings.defaultGiftValue = parsed.defaultGiftValue || this.settings.defaultGiftValue;

                // Advanced Video Settings
                if (parsed.fireVideoTriggerCount !== undefined) {
                    this.settings.fireVideoTriggerCount = parsed.fireVideoTriggerCount;
                }
                if (parsed.videoPreferences) {
                    this.settings.videoPreferences = parsed.videoPreferences;
                }

                if (parsed.giftValues) {
                    // Update: MERGE saved values with defaults instead of overwriting.
                    // This ensures new defaults are kept, but user customizations override them.
                    this.settings.giftValues = { ...this.settings.giftValues, ...parsed.giftValues };
                }
                if (parsed.playerVideos) {
                    this.settings.playerVideos = parsed.playerVideos;
                }

                // Sync Initial Trigger Value to Settings Logic if needed
                if (parsed.bannerLayout) {
                    this.settings.bannerLayout = parsed.bannerLayout;
                }
            } catch (e) {
                console.error("Settings load error:", e);
            }
        }

        // Fix: Apply loaded banner settings immediately
        if (this.settings.bannerLayout) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('BANNER_SETTINGS', { detail: this.settings.bannerLayout }));
            }, 500); // Small delay to ensuring BannerManager is listening
        }
    },

    saveSettings: function () {
        console.log("Saving TikTok Settings to Storage:", this.settings);
        localStorage.setItem('tiktok_settings_v3', JSON.stringify(this.settings));
        // Refresh UI if open
        this.renderSettingsValues();
    },

    handleOverlayClick: function () {
        if (!this.currentPlayingDetails) return;

        const uName = this.currentPlayingDetails.user.username;
        const vFile = this.currentPlayingDetails.video;

        // Pause Video
        const videoEl = document.getElementById('fire-ring-video');
        if (videoEl) videoEl.pause();

        if (confirm(`Bu videoyu [${uName}] kişisine atamak istiyor musunuz?`)) {
            this.openVideoAssignModal(uName, vFile);
        } else {
            // Keep paused or resume? Usually pausing is better so they can see.
            if (videoEl) videoEl.play().catch(e => console.warn(e));
        }
    },

    createUI: function () {
        // --- Main TikTok Panel ---
        const panel = document.createElement('div');
        panel.id = 'tiktok-panel';
        panel.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 350px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: 'Segoe UI', sans-serif;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        `;

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; font-size:16px;">TikTok Jeton Sistemi</h3>
                <button id="tiktok-settings-toggle" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:16px;">⚙️</button>
            </div>

            <!-- Connection -->
            <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <input type="text" id="tiktok-username" placeholder="@kullaniciadi" style="flex: 1; padding: 5px; background:#333; border:1px solid #555; color:white;">
                <button id="tiktok-connect-btn" style="padding: 5px 15px; background: #fe2c55; color: white; border: none; cursor: pointer; font-weight:bold;">Bağlan</button>
            </div>
            <div id="tiktok-status" style="font-size: 11px; color: #888; margin-bottom: 10px; text-align:right;">Durum: Hazır</div>

            <!-- Tabs -->
            <div style="display:flex; border-bottom:1px solid #444; margin-bottom:5px;">
                <div id="tab-events" style="flex:1; text-align:center; padding:5px; cursor:pointer; background:#333; font-size:12px;">Olaylar</div>
                <div id="tab-users" style="flex:1; text-align:center; padding:5px; cursor:pointer; border-bottom:2px solid #fe2c55; font-size:12px;">Kullanıcılar</div>
            </div>

            <div id="tiktok-events" style="height: 150px; overflow-y: auto; display:none; font-size: 11px; color:#ddd;"></div>
            <div id="tiktok-users" style="height: 200px; overflow-y: auto; font-size: 12px;"></div>

            <!-- Minimize Button (Bottom-Right) -->
            <button id="tiktok-minimize-btn" style="
                position: absolute;
                bottom: 5px;
                right: 5px;
                background: none;
                border: 1px solid #444;
                color: #aaa;
                cursor: pointer;
                font-size: 10px;
                padding: 2px 8px;
                border-radius: 4px;
            ">Gizle</button>
        `;
        document.body.appendChild(panel);

        // --- Restore Button (Hidden by default) ---
        const restoreBtn = document.createElement('button');
        restoreBtn.id = 'tiktok-restore-btn';
        restoreBtn.innerHTML = 'TK';
        restoreBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #fe2c55;
            color: white;
            border: 2px solid white;
            font-weight: bold;
            cursor: pointer;
            z-index: 1001;
            display: none; /* Hidden initially */
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(restoreBtn);

        // --- Side Settings Panel (New) ---
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'tiktok-settings-panel';
        settingsPanel.style.cssText = `
            position: absolute;
            top: 10px;
            right: 370px; /* Left of the main panel (350+10+10 margin) */
            width: 300px;
            background: rgba(30, 30, 30, 0.95);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: 'Segoe UI', sans-serif;
            z-index: 1000; /* Same Z-index layer */
            display: none; /* Hidden by default */
            border: 1px solid #444;
        `;

        settingsPanel.innerHTML = `
            <h4 style="margin:0 0 10px 0; border-bottom:1px solid #555; padding-bottom:5px;">Jeton Ayarları</h4>
            
            <div style="margin-bottom:10px;">
                <label style="font-size:12px; display:block;">1 Jeton İçin Gereken Beğeni:</label>
                <input type="number" id="set-likes-thresh" style="width:100%; padding:4px; background:#444; color:white; border:none; margin-top:2px;">
            </div>

            <div style="margin-bottom:10px;">
                <label style="font-size:12px; display:block;">Varsayılan Hediye Değeri:</label>
                <input type="number" id="set-default-gift" style="width:100%; padding:4px; background:#444; color:white; border:none; margin-top:2px;">
            </div>

            <h5 style="margin:10px 0 5px 0;">Özel Hediye Değerleri</h5>
            <div id="gift-settings-list" style="height:150px; overflow-y:auto; background:#111; padding:5px; margin-bottom:10px; border:1px solid #444;">
                <!-- Gift Rows -->
            </div>

            <div style="background:#222; padding:5px; border-radius:4px;">
                <input type="text" id="new-gift-name" placeholder="Gift Adı (örn: Rose)" style="width:60%; padding:3px;">
                <input type="number" id="new-gift-val" placeholder="Değer" style="width:35%; padding:3px;">
                <button id="add-gift-btn" style="width:100%; margin-top:5px; background:#4caf50; border:none; color:white; cursor:pointer;">Ekle</button>
                <button id="add-gift-btn" style="width:100%; margin-top:5px; background:#4caf50; border:none; color:white; cursor:pointer;">Ekle</button>
            </div>

            <button id="manual-fire-console-btn" style="width:100%; margin-top:10px; padding:6px; background:#2196F3; border:none; color:white; font-weight:bold; cursor:pointer;">TEST VİDEO (Manuel)</button>
            <button id="save-all-settings" style="width:100%; margin-top:10px; padding:8px; background:#fe2c55; border:none; color:white; font-weight:bold; cursor:pointer;">AYARLARI KAYDET</button>
        `;
        document.body.appendChild(settingsPanel);



        // --- Logic Hooks ---
        this.bindEvents();
        this.renderSettingsValues();
        this.bindAssignPanelEvents(); // New Binder
    },

    // --- Refined Video Assignment Logic ---

    bindAssignPanelEvents: function () {
        const openBtn = document.getElementById('open-video-assign-btn'); // Found ID
        const closeBtn = document.getElementById('close-assign-panel-btn');
        const saveBtn = document.getElementById('save-video-assign-btn');
        const triggerInput = document.getElementById('assign-trigger-count');

        if (openBtn) {
            openBtn.onclick = () => {
                this.toggleAssignPanel(true);
            };
        }

        if (closeBtn) {
            closeBtn.onclick = () => {
                this.toggleAssignPanel(false);
            };
        }

        if (saveBtn) {
            saveBtn.onclick = () => {
                this.saveAssignmentFromPanel();
            };
        }

        // Global Sync for Trigger Count
        if (triggerInput) {
            triggerInput.onchange = (e) => {
                let val = parseInt(e.target.value);
                if (val < 1) val = 1;
                if (val > 5) val = 5;
                e.target.value = val;

                this.settings.fireVideoTriggerCount = val;
                this.saveSettings();
                console.log("Global Trigger Count Updated:", val);

                // Also update the modal input if it exists, for visual consistency
                const modalInput = document.getElementById('modal-trigger-count');
                if (modalInput) modalInput.value = val;
            };
        }
    },

    toggleAssignPanel: function (show) {
        const panel = document.getElementById('video-assign-panel');
        if (!panel) return;

        if (show) {
            panel.style.right = '0';
            this.renderPlayerVideoList();

            // Sync Trigger Value on Open
            const trigIn = document.getElementById('assign-trigger-count');
            if (trigIn) trigIn.value = this.settings.fireVideoTriggerCount || 2;

            // Populate Video Select
            const select = document.getElementById('assign-video-select');
            if (select) {
                // Always refresh to ensure alias updates etc.
                select.innerHTML = '<option value="">Video Seçiniz...</option>';
                this.availableVideos.forEach(v => {
                    const opt = document.createElement('option');
                    const prefs = this.settings.videoPreferences[v];
                    const alias = (prefs && prefs.alias) ? prefs.alias : v;
                    opt.value = v;
                    opt.textContent = alias;
                    select.appendChild(opt);
                });
            }

        } else {
            panel.style.right = '-360px'; // Hide
        }
    },

    openVideoAssignModal: function (preFillUsername = null, preFillVideo = null) {
        // Renaming/Redirecting legacy call to new Panel
        this.toggleAssignPanel(true);

        // Populate Inputs if provided
        const userIn = document.getElementById('assign-video-username');
        const videoSel = document.getElementById('assign-video-select');

        if (userIn && preFillUsername) userIn.value = preFillUsername;

        if (preFillVideo && videoSel) {
            setTimeout(() => {
                videoSel.value = preFillVideo;
            }, 50);
        }
    },

    saveAssignmentFromPanel: function () {
        const usernameInput = document.getElementById('assign-video-username');
        const videoSelect = document.getElementById('assign-video-select');

        const username = usernameInput ? usernameInput.value.trim() : "";
        const video = videoSelect ? videoSelect.value : null;

        if (!username || !video) {
            alert("Lütfen kullanıcı adı girin ve bir video seçin!");
            return;
        }

        // Check if exists
        if (this.settings.playerVideos[username]) {
            if (!confirm(`[${username}] için zaten bir video atanmış. Değiştirmek istiyor musunuz?`)) {
                return;
            }
        }

        // Save
        this.settings.playerVideos[username] = video;
        this.saveSettings();

        // Refresh List & Clear Inputs
        this.renderPlayerVideoList();
        if (usernameInput) usernameInput.value = "";

        alert("Atama Kaydedildi! ✅");
    },

    renderPlayerVideoList: function () {
        const listContainer = document.getElementById('assigned-videos-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const users = Object.keys(this.settings.playerVideos);

        if (users.length === 0) {
            listContainer.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 10px;">Henüz atama yok.</div>';
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '10px';

        users.forEach(u => {
            const vid = this.settings.playerVideos[u];
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #333';

            tr.innerHTML = `
                <td style="padding: 8px; color: #fff;">${u}</td>
                <td style="padding: 8px; color: #aaa; font-size: 11px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vid}</td>
                <td style="padding: 8px; text-align: right;">
                    <button class="delete-assign-btn" data-user="${u}" style="background: none; border: none; cursor: pointer; color: #ff4500; font-weight: bold;">✕</button>
                </td>
            `;
            table.appendChild(tr);
        });

        listContainer.appendChild(table);

        // Bind Deletes
        const deleteBtns = listContainer.querySelectorAll('.delete-assign-btn');
        deleteBtns.forEach(btn => {
            btn.onclick = (e) => {
                const u = e.target.getAttribute('data-user');
                this.deleteAssignment(u);
            };
        });
    },

    deleteAssignment: function (username) {
        if (!username) return;
        if (confirm(`${username} atamasını silmek istediğinizden emin misiniz?`)) {
            delete this.settings.playerVideos[username];
            this.saveSettings();
            this.renderPlayerVideoList();
        }
    },

    startLeaderboardLoop: function () {
        // Removed as requested
    },

    renderLeaderboard: function (data) {
        // console.log("LB Data:", data ? data.length : "null");
        const list = document.getElementById('lb-list');
        if (!list) return;
        list.innerHTML = '';

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="padding:5px; color:#888; text-align:center;">Veri yok...</div>';
            return;
        }

        data.slice(0, 10).forEach(p => {
            // Removed 0 check to show all active players
            // if (p.landCount === 0) return; 

            const row = document.createElement('div');
            row.style.cssText = `
                display: flex; 
                align-items: center; 
                margin-bottom: 5px; 
                font-size: 13px;
                background: linear-gradient(90deg, rgba(${p.color.r},${p.color.g},${p.color.b}, 0.3) 0%, rgba(0,0,0,0) 100%);
                padding: 4px;
                border-left: 4px solid rgb(${p.color.r},${p.color.g},${p.color.b});
                border-radius: 4px;
            `;

            // Avatar or Fallback
            let avatarHtml = `<div style="width:24px; height:24px; background:#555; border-radius:50%; margin-right:8px; display:flex; align-items:center; justify-content:center; font-size:10px;">${p.rank}</div>`;
            if (p.avatar) {
                avatarHtml = `<img src="${p.avatar}" style="width:24px; height:24px; border-radius:50%; margin-right:8px; border:1px solid white;">`;
            }

            row.innerHTML = `
                ${avatarHtml}
                <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:bold; text-shadow:1px 1px 2px black;">${p.username}</div>
                <div style="font-weight:bold;">${p.landCount.toLocaleString()}</div>
            `;
            list.appendChild(row);
        });
    },

    bindEvents: function () {
        // Toggle Settings
        const toggleBtn = document.getElementById('tiktok-settings-toggle');
        const setPanel = document.getElementById('tiktok-settings-panel');

        if (toggleBtn && setPanel) {
            toggleBtn.onclick = () => {
                const isHidden = setPanel.style.display === 'none';
                console.log("Toggling Settings. Heading to:", isHidden ? 'block' : 'none');
                setPanel.style.display = isHidden ? 'block' : 'none';
                if (isHidden) this.renderSettingsValues();
            };
        }

        // Minimize / Restore Logic
        const minBtn = document.getElementById('tiktok-minimize-btn');
        const restoreBtn = document.getElementById('tiktok-restore-btn');
        const mainPanel = document.getElementById('tiktok-panel');

        if (minBtn && restoreBtn && mainPanel && setPanel) {
            minBtn.onclick = () => {
                mainPanel.style.display = 'none';
                setPanel.style.display = 'none'; // Also hide settings
                restoreBtn.style.display = 'block';
            };

            restoreBtn.onclick = () => {
                mainPanel.style.display = 'block';
                restoreBtn.style.display = 'none';
                // Settings remain closed until requested again
            };
        } else {
            console.error("TikTok UI Elements not found!");
        }

        // Save Settings
        const saveBtn = document.getElementById('save-all-settings');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const likeVal = document.getElementById('set-likes-thresh').value;
                const defVal = document.getElementById('set-default-gift').value;

                this.settings.likesPerToken = parseInt(likeVal) || 100;
                this.settings.defaultGiftValue = parseInt(defVal) || 10;
                this.saveSettings();
                alert("Ayarlar Kaydedildi!");
            };
        }

        // Add New Gift
        const addBtn = document.getElementById('add-gift-btn');
        if (addBtn) {
            addBtn.onclick = () => {
                const nameInput = document.getElementById('new-gift-name');
                const valInput = document.getElementById('new-gift-val');

                const rawName = nameInput.value.trim();
                const val = parseInt(valInput.value);

                if (!rawName || isNaN(val)) {
                    alert("Geçersiz giriş!");
                    return;
                }

                const key = rawName.toLowerCase();
                this.settings.giftValues[key] = val;

                nameInput.value = '';
                valInput.value = '';

                this.renderSettingsValues();
                this.saveSettings(); // Auto save on add
            };
        }

        // Manual Fire Button (Console Panel)
        const manualConsoleBtn = document.getElementById('manual-fire-console-btn');
        if (manualConsoleBtn) {
            manualConsoleBtn.onclick = () => {
                console.log("Manuel Konsol Tetikleyici Çalıştı!");
                this.playFireRingVideo({
                    username: 'Admin',
                    avatar: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/7094553213210987/100x100.jpeg',
                    isTest: true
                });
            };
        } else {
            console.warn("Manual Fire Console Button NOT FOUND");
        }

        // Connect Button
        const connBtn = document.getElementById('tiktok-connect-btn');
        if (connBtn) {
            connBtn.onclick = () => {
                const username = document.getElementById('tiktok-username').value;
                if (username && this.socket) {
                    this.socket.emit('connectToTikTok', username);
                    this.updateStatus(`Bağlanıyor: ${username}...`);
                }
            };
        }

        // Tabs
        const tabEvents = document.getElementById('tab-events');
        const tabUsers = document.getElementById('tab-users');
        const viewEvents = document.getElementById('tiktok-events');
        const viewUsers = document.getElementById('tiktok-users');

        // Overlay Click Binding for Fast Assignment
        const overlay = document.getElementById('fire-ring-overlay');
        if (overlay) {
            overlay.onclick = (e) => {
                // Ensure we are clicking the overlay or its direct children that bubble up
                // But we don't want to block clicks on the video if controls are needed
                // Actually, our goal is to trigger assignment on ANY click on the overlay for simplicity,
                // or maybe just the avatar/username?
                // User said "click on name".
                // Let's bind checking the target.

                // If clicked on avatar or username
                if (e.target.id === 'fire-ring-avatar' || e.target.id === 'fire-ring-username' || e.target.closest('.avatar-container')) {
                    this.handleOverlayClick();
                }
            };
        }

        if (tabEvents && tabUsers && viewEvents && viewUsers) {
            tabEvents.onclick = () => {
                viewEvents.style.display = 'block';
                viewUsers.style.display = 'none';
                tabEvents.style.borderBottom = '2px solid #fe2c55';
                tabUsers.style.borderBottom = 'none';
                tabEvents.style.background = '#333';
                tabUsers.style.background = 'transparent';
            };

            tabUsers.onclick = () => {
                viewEvents.style.display = 'none';
                viewUsers.style.display = 'block';
                tabUsers.style.borderBottom = '2px solid #fe2c55';
                tabEvents.style.borderBottom = 'none';
                tabUsers.style.background = '#333';
                tabEvents.style.background = 'transparent';
                this.updateUserListUI(); // Refresh list on tab switch
            };
        }
    },

    renderSettingsValues: function () {
        // --- Populate Jeton Ayarları Inputs ---
        const likeIn = document.getElementById('set-likes-thresh');
        const defIn = document.getElementById('set-default-gift');

        if (likeIn) likeIn.value = this.settings.likesPerToken;
        // Make sure to parse existing strings if any
        if (defIn) defIn.value = this.settings.defaultGiftValue;

        console.log("Re-rendering Settings Inputs:", this.settings);

        // Bind Open Modal Buttons
        const openBtn = document.getElementById('open-video-settings-btn');
        if (openBtn) openBtn.onclick = () => this.openVideoSettings();

        const openAssignBtn = document.getElementById('open-video-assign-btn');
        if (openAssignBtn) openAssignBtn.onclick = () => this.openVideoAssignModal();

        // Bind Video Settings Modal Buttons (Save/Cancel/Close)
        const closeVideoSettingsBtn = document.getElementById('close-video-settings-x');
        const cancelVideoSettingsBtn = document.getElementById('cancel-video-settings-btn');
        const saveVideoSettingsBtn = document.getElementById('save-video-settings-btn');

        if (closeVideoSettingsBtn) closeVideoSettingsBtn.onclick = () => this.closeVideoSettings();
        if (cancelVideoSettingsBtn) cancelVideoSettingsBtn.onclick = () => this.closeVideoSettings();

        if (saveVideoSettingsBtn) {
            saveVideoSettingsBtn.onclick = () => {
                // Save Trigger Count
                const triggerInput = document.getElementById('modal-trigger-count');
                if (triggerInput) {
                    const count = parseInt(triggerInput.value);
                    if (count >= 1 && count <= 5) {
                        this.settings.fireVideoTriggerCount = count;
                    }
                }
                // Save Checkboxes (Video Active States)
                const checkboxes = document.querySelectorAll('.video-active-checkbox');
                checkboxes.forEach(cb => {
                    const video = cb.getAttribute('data-video');
                    if (this.settings.videoPreferences[video]) {
                        this.settings.videoPreferences[video].enabled = cb.checked;
                    }
                });

                this.saveSettings();
                this.closeVideoSettings();
                alert("Ayarlar Kaydedildi! ✅");
            };
        }

        this.renderGiftList();

        // --- Banner Settings Binds (Console) ---
        const bindBannerControls = () => {
            const leftVis = document.getElementById('console-banner-left-vis');
            const leftDist = document.getElementById('console-banner-left-dist');
            const rightVis = document.getElementById('console-banner-right-vis');
            const rightDist = document.getElementById('console-banner-right-dist');

            const updateBanners = () => {
                const newSettings = {
                    leftVisible: leftVis ? leftVis.checked : true,
                    rightVisible: rightVis ? rightVis.checked : true,
                    leftDist: leftDist ? (parseInt(leftDist.value) || 0) : 100,
                    rightDist: rightDist ? (parseInt(rightDist.value) || 0) : 100
                };

                this.settings.bannerLayout = newSettings;
                window.dispatchEvent(new CustomEvent('BANNER_SETTINGS', { detail: newSettings }));
                this.saveSettings();
            };

            if (leftVis) { leftVis.checked = this.settings.bannerLayout?.leftVisible ?? true; leftVis.onchange = updateBanners; }
            if (rightVis) { rightVis.checked = this.settings.bannerLayout?.rightVisible ?? true; rightVis.onchange = updateBanners; }
            if (leftDist) { leftDist.value = this.settings.bannerLayout?.leftDist ?? 100; leftDist.oninput = updateBanners; }
            if (rightDist) { rightDist.value = this.settings.bannerLayout?.rightDist ?? 100; rightDist.oninput = updateBanners; }
        };
        setTimeout(bindBannerControls, 200);

        // Bind Manual Test Button
        const manualBtn = document.getElementById('manual-fire-console-btn');
        if (manualBtn) {
            manualBtn.onclick = () => {
                console.log("Manual Fire Test Triggered");
                this.playFireRingVideo(this.settings.fireVideoTriggerCount || 2);
            };
        }
    },

    renderGiftList: function () {
        const list = document.getElementById('gift-settings-list');
        if (!list) return;
        list.innerHTML = '';

        Object.entries(this.settings.giftValues).forEach(([key, val]) => {
            const row = document.createElement('div');
            row.style.cssText = "display:flex; justify-content:space-between; border-bottom:1px solid #333; padding:2px; font-size:11px; align-items:center;";
            row.innerHTML = `
                <span class="edit-gift-name" data-key="${key}" style="cursor:pointer; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${key}</span>
                <div style="display:flex; gap:5px; align-items:center;">
                    <input type="number" class="edit-gift-val" data-key="${key}" value="${val}" style="width:40px; background:#222; border:1px solid #444; color:#ffd700; padding:2px; text-align:right;">
                    <button class="del-gift-btn" data-key="${key}" style="background:#f00; border:none; color:white; cursor:pointer; font-size:9px; padding:2px 5px;">X</button>
                </div>
            `;
            list.appendChild(row);
        });

        // Bind Edit Inputs
        document.querySelectorAll('.edit-gift-val').forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-key');
                const newVal = parseInt(e.target.value);
                if (!isNaN(newVal)) {
                    this.settings.giftValues[key] = newVal;
                    this.saveSettings();
                }
            });
        });

        // Bind delete buttons
        document.querySelectorAll('.del-gift-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.getAttribute('data-key');
                delete this.settings.giftValues[key];
                this.saveSettings();
                this.renderGiftList();
            });
        });
    },

    openVideoSettings: function () {
        const modal = document.getElementById('video-settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.renderVideoSettings();
        }
    },

    closeVideoSettings: function () {
        const modal = document.getElementById('video-settings-modal');
        if (modal) modal.style.display = 'none';
    },

    toggleAssignPanel: function (show) {
        const panel = document.getElementById('video-assign-panel');
        if (!panel) return;

        if (show) {
            panel.classList.add('open');
            this.renderPlayerVideoList();

            // Sync Trigger Value on Open
            const trigIn = document.getElementById('assign-trigger-count');
            if (trigIn) trigIn.value = this.settings.fireVideoTriggerCount || 2;

            // Populate Video Select
            const select = document.getElementById('assign-video-select');
            if (select) {
                // Always refresh to ensure alias updates etc.
                select.innerHTML = '<option value="">Video Seçiniz...</option>';
                this.availableVideos.forEach(v => {
                    const opt = document.createElement('option');
                    const prefs = this.settings.videoPreferences[v];
                    const alias = (prefs && prefs.alias) ? prefs.alias : v;
                    opt.value = v;
                    opt.textContent = alias;
                    select.appendChild(opt);
                });
            }

        } else {
            panel.classList.remove('open');
        }
    },

    openVideoAssignModal: function (preFillUsername = null, preFillVideo = null) {
        // Renaming/Redirecting legacy call to new Panel
        this.toggleAssignPanel(true);

        // Populate Inputs if provided
        const userIn = document.getElementById('assign-video-username');
        const videoSel = document.getElementById('assign-video-select');

        if (userIn && preFillUsername) userIn.value = preFillUsername;

        if (preFillVideo && videoSel) {
            // Need to wait for options? Usually synchronous if we just called toggleAssignPanel
            // But let's check
            setTimeout(() => {
                videoSel.value = preFillVideo;
            }, 50);
        }
    },

    saveAssignmentFromPanel: function () {
        const usernameInput = document.getElementById('assign-video-username');
        const videoSelect = document.getElementById('assign-video-select');

        const username = usernameInput ? usernameInput.value.trim() : "";
        const video = videoSelect ? videoSelect.value : null;

        if (!username || !video) {
            alert("Lütfen kullanıcı adı girin ve bir video seçin!");
            return;
        }

        // Check if exists
        if (this.settings.playerVideos[username]) {
            if (!confirm(`[${username}] için zaten bir video atanmış. Değiştirmek istiyor musunuz?`)) {
                return;
            }
        }

        // Save
        this.settings.playerVideos[username] = video;
        this.saveSettings();

        // Refresh List & Clear Inputs
        this.renderPlayerVideoList();
        if (usernameInput) usernameInput.value = "";
        // Keep video selected? Or reset? Let's reset.
        // if (videoSelect) videoSelect.value = ""; 

        alert("Atama Kaydedildi! ✅");
    },

    renderPlayerVideoList: function () {
        const listContainer = document.getElementById('assigned-videos-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const users = Object.keys(this.settings.playerVideos);

        if (users.length === 0) {
            listContainer.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 10px;">Henüz atama yok.</div>';
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '10px';

        users.forEach(u => {
            const vid = this.settings.playerVideos[u];
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #333';

            tr.innerHTML = `
                <td style="padding: 8px; color: #fff;">${u}</td>
                <td style="padding: 8px; color: #aaa; font-size: 11px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vid}</td>
                <td style="padding: 8px; text-align: right;">
                    <button class="delete-assign-btn" data-user="${u}" style="background: none; border: none; cursor: pointer; color: #ff4500; font-weight: bold;">✕</button>
                </td>
            `;
            table.appendChild(tr);
        });

        listContainer.appendChild(table);

        // Bind Deletes
        const deleteBtns = listContainer.querySelectorAll('.delete-assign-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const u = e.target.getAttribute('data-user');
                this.deleteAssignment(u);
            });
        });
    },

    deleteAssignment: function (username) {
        if (!username) return;
        if (confirm(`${username} atamasını silmek istediğinizden emin misiniz?`)) {
            delete this.settings.playerVideos[username];
            this.saveSettings();
            this.renderPlayerVideoList();
        }
    },

    closeVideoAssignModal: function () {
        this.toggleAssignPanel(false);
    },

    triggerAssignedVideo: function () {
        const usernameInput = document.getElementById('assign-video-username');
        const videoSelect = document.getElementById('assign-video-select');

        const username = usernameInput ? usernameInput.value.trim() : "Admin";
        const video = videoSelect ? videoSelect.value : null;

        if (!video) {
            alert("Lütfen bir video seçin!");
            return;
        }

        // Create a dummy user object or find existing
        // For video playback, we mainly need username and avatar.
        // Try to find avatar if user exists
        let avatar = 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/7094553213210987/100x100.jpeg'; // Default
        if (this.users[username]) {
            avatar = this.users[username].avatar;
        }

        // Play it!
        this.playFireRingVideo({
            username: username || "Yönetici",
            avatar: avatar,
            isTest: false // Show avatar
        }, video);

        this.closeVideoAssignModal();
    },

    saveVideoSettingsFromModal: function () {
        // Save Trigger Count
        const trigInput = document.getElementById('modal-trigger-count');
        if (trigInput) {
            this.settings.fireVideoTriggerCount = parseInt(trigInput.value) || 2;
        }
        this.saveSettings();
    },

    renderVideoSettings: function () {
        const container = document.getElementById('modal-video-list');
        const trigInput = document.getElementById('modal-trigger-count');

        // Sync Trigger Count
        if (trigInput) {
            trigInput.value = this.settings.fireVideoTriggerCount !== undefined ? this.settings.fireVideoTriggerCount : 2;
        }

        if (!container) return;
        container.innerHTML = '';

        if (!this.availableVideos || this.availableVideos.length === 0) {
            container.innerHTML = '<div style="color:#666; font-size:12px; text-align:center; padding:20px;">Video bulunamadı.<br>Lütfen /videos klasörünü kontrol edin.</div>';
            return;
        }

        this.availableVideos.forEach(video => {
            // Default prefs
            if (!this.settings.videoPreferences[video]) {
                this.settings.videoPreferences[video] = { enabled: true, duration: 13 };
            }
            const prefs = this.settings.videoPreferences[video];

            const row = document.createElement('div');
            row.style.cssText = "display:flex; align-items:center; gap:10px; margin-bottom:5px; border-bottom:1px solid #222; padding-bottom:5px;";

            // Duration Input
            const dur = document.createElement('input');
            dur.type = 'number';
            dur.value = prefs.duration;
            dur.min = 1;
            dur.style.cssText = "width:50px; padding:5px; background:#222; border:1px solid #444; color:white; font-size:12px; text-align:center; border-radius:4px;";
            dur.onchange = (e) => {
                const val = parseInt(e.target.value) || 13;
                this.settings.videoPreferences[video].duration = val;
                this.saveSettings();
            };

            // Checkbox
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.checked = prefs.enabled;
            check.style.cursor = 'pointer';
            check.style.transform = "scale(1.2)";
            check.onchange = (e) => {
                this.settings.videoPreferences[video].enabled = e.target.checked;
            };

            // Name
            const name = document.createElement('span');
            name.innerText = video;
            name.style.cssText = "flex:1; color:#ddd; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
            name.title = video;

            row.appendChild(dur);
            row.appendChild(check);
            row.appendChild(name);
            container.appendChild(row);
        });
    },

    connectBackend: function () {
        if (this.socket) {
            console.log("Disconnecting old socket...");
            this.socket.disconnect();
        }
        this.socket = io(BACKEND_URL); // Use dynamic backend URL

        // Remove old listeners just in case
        this.socket.off('connect');
        this.socket.off('tiktokConnected');
        this.socket.off('tiktokError');
        this.socket.off('tiktokDisconnected');
        this.socket.off('tiktokEvent');

        this.socket.on('connect', () => {
            console.log("Connected to Backend Relay");
            this.updateStatus("Sunucu: Çevrimiçi");
            this.hideConnectionAlert();
        });

        this.socket.on('tiktokConnected', (data) => {
            this.updateStatus(`Yayında: @${data.username}`);
            this.connected = true;
            this.hideConnectionAlert();
        });

        this.socket.on('tiktokError', (err) => {
            this.updateStatus(`HATA: ${err.message}`);
            this.showConnectionAlert('error', `❌ TikTok Bağlantı Hatası\n${err.message}`);
        });

        this.socket.on('tiktokDisconnected', () => {
            this.updateStatus("Bağlantı Yok");
            this.connected = false;
            this.showConnectionAlert('disconnect', '⚠️ TikTok bağlantısı koptu!\nTekrar bağlanmayı deneyin.');
        });

        this.socket.on('disconnect', () => {
            this.updateStatus("Sunucu Bağlantısı Koptu");
            this.connected = false;
            this.showConnectionAlert('disconnect', '🔌 Sunucu bağlantısı kesildi!\nSayfa yenilemeyi deneyin.');
        });

        this.socket.on('tiktokEvent', (event) => {
            this.processEvent(event);
        });
    },

    updateStatus: function (msg) {
        const el = document.getElementById('tiktok-status');
        if (el) el.innerText = `Durum: ${msg}`;
    },

    showConnectionAlert: function (type, msg) {
        let box = document.getElementById('tiktok-conn-alert');
        if (!box) {
            box = document.createElement('div');
            box.id = 'tiktok-conn-alert';
            box.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 9999;
                padding: 14px 18px;
                border-radius: 10px;
                font-size: 14px;
                font-family: 'Segoe UI', sans-serif;
                color: white;
                max-width: 280px;
                white-space: pre-line;
                line-height: 1.5;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                animation: slideInRight 0.3s ease;
                cursor: pointer;
            `;
            box.title = 'Kapat';
            box.onclick = () => this.hideConnectionAlert();
            document.body.appendChild(box);
        }
        if (type === 'error') {
            box.style.background = 'linear-gradient(135deg, #c62828, #b71c1c)';
            box.style.border = '1px solid #ef5350';
        } else {
            box.style.background = 'linear-gradient(135deg, #e65100, #bf360c)';
            box.style.border = '1px solid #ff7043';
        }
        box.innerHTML = `${msg}<br><span style="font-size:11px; opacity:0.75; margin-top:4px; display:block;">Kapatmak için tıkla</span>`;
        box.style.display = 'block';

        // Auto dismiss after 8 seconds
        clearTimeout(this._alertTimeout);
        this._alertTimeout = setTimeout(() => this.hideConnectionAlert(), 8000);
    },

    hideConnectionAlert: function () {
        const box = document.getElementById('tiktok-conn-alert');
        if (box) box.style.display = 'none';
        clearTimeout(this._alertTimeout);
    },

    // Deduplication Storage
    processedEvents: new Set(),
    recentEventTime: {}, // Map<Signature, Timestamp>
    lastGiftCounts: {},  // Map<User_Gift, {count, time}>

    processEvent: function (event) {
        console.log(`[Frontend] Received Event: ${event.type} ID:${event.eventId} Count:${event.giftCount}`);

        // 1. Strong Deduplication via ID
        if (event.eventId) {
            if (this.processedEvents.has(event.eventId)) {
                console.log("Duplicate event (ID) ignored:", event.eventId);
                return;
            }
            this.processedEvents.add(event.eventId);
            if (this.processedEvents.size > 200) {
                const it = this.processedEvents.values();
                this.processedEvents.delete(it.next().value);
            }
        }
        // 2. Fallback: Content-Based Time Window Deduplication
        else {
            // Signature: User + Type + GiftName + Count
            // DO NOT use Date.now() here, as it makes every duplicate unique!
            const sig = `${event.username}_${event.type}_${event.giftName || 'like'}_${event.giftCount || 0}`;
            const now = Date.now();
            const lastTime = this.recentEventTime[sig] || 0;

            // If same content arrives within 2 seconds, ignore it
            if (now - lastTime < 2000) {
                console.log("Duplicate event (Content/Time) ignored:", sig);
                return;
            }
            this.recentEventTime[sig] = now;
        }

        // 3. Logic-Based Filtering (Immediate + Anti-Echo)
        // Rule: If same user sends same gift with same count within 3s, ignore.
        // This allows IMMEDIATE processing of the first one, but blocks "echoes".
        // It allows "Rose x2" (count increased) to pass.
        if (event.type === 'gift') {
            const key = `${event.username}_${event.giftName || 'gift'}`;
            const last = this.lastGiftCounts[key];
            const now = Date.now();

            if (last && event.giftCount <= last.count && (now - last.time < 3000)) {
                console.log(`[Frontend] Ignoring echo/duplicate gift (Count ${event.giftCount} <= ${last.count})`);
                return;
            }

            // --- STREAK (SERI HEDIYE) FARK HESAPLAMASI ---
            let actualNewGifts = event.giftCount;
            if (last && now - last.time < 5000) {
                if (event.giftCount > last.count) {
                    actualNewGifts = event.giftCount - last.count;
                }
            }

            // Update last processed with the TOTAL count, so next streak can be diffed properly
            this.lastGiftCounts[key] = { count: event.giftCount, time: now };

            // Overwrite event.giftCount with the specific delta (new gifts) 
            event.giftCount = actualNewGifts;
        }

        // 1. Log UI
        this.logEventUI(event);

        // 2. Data Logic
        if (!this.users[event.username]) {
            this.users[event.username] = {
                username: event.username,
                avatar: event.avatar,
                tokens: 0,
                pendingLikes: 0
            };
        }

        const user = this.users[event.username];

        if (event.type === 'gift') {
            const rawName = event.giftName || "";
            const key = rawName.trim().toLowerCase();
            const val = this.settings.giftValues[key] !== undefined
                ? this.settings.giftValues[key]
                : this.settings.defaultGiftValue;

            const earned = val * (event.giftCount || 1);

            // Phase 5: Camera Event (Always trigger for gifts)
            window.dispatchEvent(new CustomEvent('GAME_EVENT', {
                detail: {
                    type: 'GIFT',
                    data: {
                        username: event.username,
                        giftName: event.giftName,
                        value: earned
                    }
                }
            }));

            /* Phase 7 Hook Removed */

            // Phase 5.1: Banner Attack & Fire Ring Logic
            // NEW RULE: 2 coins = Fire Ring Video (No Banner, No Map Growth yet? Or both?)
            // User request: "2 tane jeton geldiğinde bu kalsötrdeki videolar otomatik çalacak."
            // Assuming growth still happens as it's a "gift".

            // Get configured trigger count (default 2)
            const triggerCount = this.settings.fireVideoTriggerCount || 2;

            if (this.game && event.giftCount === triggerCount) {
                // Trigger Fire Ring Video
                this.playFireRingVideo(user);

                // ALSO Grant Tokens & Grow (Standard behavior for value)
                this.addTokens(user, earned);


            } else if (this.game && event.giftCount > 2 && event.giftCount <= 9) {
                // 3-9: Banner Attack (Old Logic, preserved for now if wanted, or fallback to standard)
                // User only specified "2-9 arası şartı 2 ye indirilecek". 
                // It implies the special effect is now ONLY at 2.
                // So 3-9 falls back to standard growth.
                this.addTokens(user, earned);
            } else {
                // Standard Queueing for 1 or >=10
                this.addTokens(user, earned);
            }
        }
        else if (event.type === 'like') {
            user.pendingLikes += event.likeCount;
            const thresh = this.settings.likesPerToken || 100;
            const newTokens = Math.floor(user.pendingLikes / thresh);

            if (newTokens > 0) {
                this.addTokens(user, newTokens);
                user.pendingLikes %= thresh;
            }

            // Phase 7: Like Arena Hook
            if (window.LikeArenaManagerInstance) {
                window.LikeArenaManagerInstance.processLike({
                    username: user.username,
                    avatar: user.avatar,
                    likeCount: event.likeCount,
                    totalLikes: event.totalLikes
                });
            }
        }

        // 3. Update Leaderboard
        this.updateUserListUI();
    },

    addTokens: function (user, amount) {
        if (amount <= 0) return;
        user.tokens += amount;

        // Queue Growth (Batched)
        if (!this.pendingGrowth[user.username]) {
            this.pendingGrowth[user.username] = 0;
        }
        this.pendingGrowth[user.username] += amount;

        /* REMOVED DIRECT CALL to prevent freeze
        if (this.game) {
            const player = this.game.spawnPlayer(user.username, user.avatar);
            if (player) {
                this.game.grow(player.id, amount);
            }
        }
        */

        // Future: Play sound / Highlight row
    },

    logEventUI: function (event) {
        const list = document.getElementById('tiktok-events');
        if (!list) return;

        const item = document.createElement('div');
        item.style.marginBottom = '2px';
        item.style.borderBottom = '1px solid #333';

        if (event.type === 'like') {
            item.innerHTML = `<span style="color:#ff2c55;">♥</span> <b>${event.username}</b>: +${event.likeCount} like`;
        } else if (event.type === 'gift') {
            const key = (event.giftName || "").trim().toLowerCase();
            const val = this.settings.giftValues[key] || this.settings.defaultGiftValue;
            item.innerHTML = `<span style="color:#ffd700;">🎁</span> <b>${event.username}</b>: ${event.giftName} (+${val * event.giftCount})`;
        }

        list.appendChild(item);
        if (list.childNodes.length > 50) list.removeChild(list.firstChild);
        list.scrollTop = list.scrollHeight;
    },

    updateUserListUI: function () {
        const list = document.getElementById('tiktok-users');
        if (!list) return;

        const sorted = Object.values(this.users).sort((a, b) => b.tokens - a.tokens);

        list.innerHTML = '';
        sorted.forEach((u, index) => {
            const div = document.createElement('div');
            div.style.padding = '5px';
            div.style.borderBottom = '1px solid #333';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'space-between';
            if (index < 3) div.style.background = 'rgba(255, 215, 0, 0.1)'; // Top 3 highlight

            div.innerHTML = `
                <div style="display:flex; alignItems:center; gap:8px;">
                    <span style="color:#aaa; font-size:10px;">#${index + 1}</span>
                    <img src="${u.avatar}" style="width:24px; height:24px; borderRadius:50%;">
                    <span>${u.username}</span>
                </div>
                <div style="font-weight:bold; color:#ffd700;">
                    ${u.tokens} 🪙
                </div>
            `;
            list.appendChild(div);
        });
    },

    // --- FAZ-5: Fire Ring Video Logic ---
    availableVideos: [],
    videoQueue: [],
    isPlayingVideo: false,
    currentPlayingDetails: null, // Track current video for interaction assignment
    lastVideoTriggerTime: {}, // Global Cooldown Map per user

    fetchVideos: function () {
        // Use absolute URL to backend (Dynamic for LAN)
        fetch(`${BACKEND_URL}/api/videos`)
            .then(res => res.json())
            .then(files => {
                this.availableVideos = files;
                console.log("Loaded Videos:", this.availableVideos);
                this.renderVideoSettings(); // Update UI
            })
            .catch(err => {
                console.error("Error fetching videos:", err);
                alert(`Video listesi yüklenemedi! Hata: ${err.message}\nLütfen sunucu penceresini (siyah ekran) kontrol edin.`);
            });
    },

    playFireRingVideo: function (user, specificVideo = null) {
        // 0. Global Cooldown (5 Seconds)
        // Hard limit: A user cannot trigger a video more than once every 5 seconds.
        const now = Date.now();
        const last = this.lastVideoTriggerTime[user.username] || 0;
        if (now - last < 5000) {
            console.log(`[Video] Global Cooldown Active for ${user.username}. Ignoring trigger.`);
            return;
        }
        this.lastVideoTriggerTime[user.username] = now;

        // 1. Check for User Assignment (Priority)
        if (!specificVideo && this.settings.playerVideos && this.settings.playerVideos[user.username]) {
            specificVideo = this.settings.playerVideos[user.username];
            console.log(`[Video] Playing assigned video for ${user.username}: ${specificVideo}`);
        }

        // Filter enabled videos, default to enabled if no pref exists
        // If specificVideo is provided, we IGNORE settings and play it.
        let videosToPlay = [];

        if (specificVideo) {
            videosToPlay = [specificVideo];
        } else {
            videosToPlay = this.availableVideos.filter(v => {
                const prefs = this.settings.videoPreferences[v];
                return !prefs || prefs.enabled !== false;
            });
        }

        if (videosToPlay.length === 0) {
            console.warn("No enabled videos to play!");
            return;
        }

        // Deduplicate Queue: If user is already in queue, DON'T add again.
        // We REMOVED the "is already playing" check because it blocked valid consecutive gifts (e.g. at 6s).
        // The 5s global cooldown prevents spam, and this check prevents queue stacking.
        const alreadyInQueue = this.videoQueue.some(item => item.user.username === user.username);
        if (alreadyInQueue) {
            console.log(`[Video] User ${user.username} is already in queue. Skipping.`);
            return;
        }

        // Add to queue
        console.log(`[Video] Adding ${user.username} to queue.`);
        this.videoQueue.push({ user, specificVideo });
        this.processVideoQueue();
    },



    processVideoQueue: function (enabledList) {
        if (this.isPlayingVideo || this.videoQueue.length === 0) return;

        const queueItem = this.videoQueue.shift();
        const user = queueItem.user;
        const specificVideo = queueItem.specificVideo;

        // If specific video, use it. Otherwise pick random from enabledList
        let videoFile = specificVideo;

        if (!videoFile) {
            // Re-filter just in case settings changed while queuing
            const videosToPlay = enabledList || this.availableVideos.filter(v => {
                const prefs = this.settings.videoPreferences[v];
                return !prefs || prefs.enabled !== false;
            });

            if (videosToPlay.length === 0) return;
            const randIndex = Math.floor(Math.random() * videosToPlay.length);
            videoFile = videosToPlay[randIndex];
        }

        this.isPlayingVideo = true;
        this.currentPlayingDetails = { user: user, video: videoFile }; // Save for interactive overlay
        const videoUrl = `${BACKEND_URL}/videos/${encodeURIComponent(videoFile)}`;

        // Get Duration for THIS video
        const prefs = this.settings.videoPreferences[videoFile];
        const durationSec = (prefs && prefs.duration) ? prefs.duration : 13;

        // Get Elements
        const overlay = document.getElementById('fire-ring-overlay');
        const videoEl = document.getElementById('fire-ring-video');
        const avatarEl = document.getElementById('fire-ring-avatar');
        const usernameEl = document.getElementById('fire-ring-username');
        const avatarContainer = document.querySelector('.avatar-container'); // Need container to hide border too

        if (!overlay || !videoEl || !avatarEl) {
            console.error("Video Overlay elements missing!");
            this.isPlayingVideo = false;
            return;
        }

        // Set Content
        if (user.isTest) {
            if (avatarContainer) avatarContainer.style.display = 'none';
        } else {
            if (avatarContainer) avatarContainer.style.display = 'flex'; // Flex for column layout
            avatarEl.src = user.avatar;
            if (usernameEl) {
                usernameEl.innerText = user.username || "Tiktok Kullanıcısı";
                usernameEl.style.display = 'block';
            }
        }

        videoEl.src = videoUrl;
        console.log("Attempting to play video from:", videoUrl);
        videoEl.muted = false; // Try unmuted
        videoEl.currentTime = 0;

        // Show & Play
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex'; // Force flex

        videoEl.play().catch(e => {
            console.warn("Autoplay blocked, trying muted:", e);
            videoEl.muted = true;
            videoEl.play();
        });



        console.log(`Video playing for ${durationSec} seconds`);

        // Force Stop after Duration & Clear Fade
        if (this.videoTimeout) clearTimeout(this.videoTimeout);
        if (this.fadeInterval) clearInterval(this.fadeInterval);

        // Start Fade Out 1s before end (or less if duration is short)
        const fadeDuration = 1000;
        const fadeStartTime = Math.max(0, (durationSec * 1000) - fadeDuration);

        this.videoTimeout = setTimeout(() => {
            // Start Fading Audio
            const stepTime = 100;
            const steps = fadeDuration / stepTime;
            let currentStep = 0;
            const startVolume = videoEl.volume;

            this.fadeInterval = setInterval(() => {
                currentStep++;
                const newVol = Math.max(0, startVolume * (1 - (currentStep / steps)));
                videoEl.volume = newVol;
                if (currentStep >= steps) clearInterval(this.fadeInterval);
            }, stepTime);

            // Hard Close after Fade
            setTimeout(() => {
                console.log("Video duration ended. Closing.");
                overlay.classList.add('hidden');

                setTimeout(() => {
                    overlay.style.display = 'none';
                    videoEl.pause();
                    videoEl.currentTime = 0;
                    videoEl.volume = 1.0;
                    this.isPlayingVideo = false;
                    this.processVideoQueue();
                }, 300);
            }, fadeDuration);

        }, fadeStartTime);

        // Ensure loops if short
        videoEl.loop = true;
        videoEl.onended = null;
    }
};
