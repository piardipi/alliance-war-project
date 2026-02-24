class AllianceWarApp {
    constructor() {
        this.selectedAlliance = null;
        this.availableVideos = [];
        this.apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3333' : `http://${window.location.hostname}:3333`;
        this.states = [
            { id: 'attack', label: 'Saldırı' },
            { id: 'losing', label: 'Kaybediyor' },
            { id: 'won', label: 'Yendi' },
            { id: 'lost', label: 'Yenildi' },
            { id: 'show', label: 'Şov' }
        ];

        this.ui = {
            selector: document.getElementById('war-alliance-selector'),
            infoPanel: document.getElementById('war-selected-alliance-info'),
            noSelection: document.getElementById('war-no-selection'),
            symbol: document.getElementById('w-alli-symbol'),
            name: document.getElementById('w-alli-name'),
            members: document.getElementById('w-alli-members'),
            assignments: document.getElementById('war-video-assignments'),
            player: document.getElementById('war-video-player'),
            stage: document.getElementById('war-stage'),
            defaultText: document.getElementById('war-default-text')
        };

        this.fetchAvailableVideos().then(() => {
            this.renderAllianceList();
            this.selectAlliance(null);
            this.bindEvents();
        });
    }

    async fetchAvailableVideos() {
        try {
            const res = await fetch(`${this.apiBase}/api/alliance-videos`);
            if (res.ok) {
                this.availableVideos = await res.json();
            } else {
                console.warn('Could not fetch alliance videos');
            }
        } catch (e) {
            console.error('Error fetching alliance videos:', e);
        }
    }

    bindEvents() {
        this.ui.player.addEventListener('play', () => {
            if (this.ui.defaultText) this.ui.defaultText.style.display = 'none';
        });
        this.ui.player.addEventListener('ended', () => {
            if (this.ui.defaultText) this.ui.defaultText.style.display = 'block';
            this.ui.player.style.opacity = '0';
        });
        this.ui.player.addEventListener('playing', () => {
            this.ui.player.style.opacity = '1';
        });
    }

    getAlliances() {
        return JSON.parse(localStorage.getItem('customAlliances')) || [];
    }

    getAllianceVideoMap(allianceId) {
        const stored = JSON.parse(localStorage.getItem('allianceVideos')) || {};
        return stored[allianceId] || {};
    }

    saveAllianceVideoMap(allianceId, stateId, videoFilename) {
        const stored = JSON.parse(localStorage.getItem('allianceVideos')) || {};
        if (!stored[allianceId]) stored[allianceId] = {};
        stored[allianceId][stateId] = videoFilename;
        localStorage.setItem('allianceVideos', JSON.stringify(stored));
    }

    renderAllianceList() {
        const alliances = this.getAlliances();
        this.ui.selector.innerHTML = '';

        if (alliances.length === 0) {
            this.ui.selector.innerHTML = '<div style="color:#aaa; text-align:center;">Henüz İttifak Yok</div>';
            return;
        }

        alliances.forEach(a => {
            const div = document.createElement('div');
            div.className = 'alliance-item';
            div.style.borderLeft = `4px solid ${a.colorHex || '#bbb'}`;
            div.innerHTML = `<span style="font-size:18px;">${a.symbol}</span> <b>${a.name}</b>`;

            div.addEventListener('click', () => {
                Array.from(this.ui.selector.children).forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
                this.selectAlliance(a);
            });

            this.ui.selector.appendChild(div);
        });
    }

    selectAlliance(alliance) {
        this.selectedAlliance = alliance;
        if (!alliance) {
            if (this.ui.noSelection) this.ui.noSelection.style.display = 'flex';
            if (this.ui.infoPanel) this.ui.infoPanel.style.display = 'none';
            return;
        }

        if (this.ui.noSelection) this.ui.noSelection.style.display = 'none';
        if (this.ui.infoPanel) {
            this.ui.infoPanel.style.display = 'flex';
            this.ui.infoPanel.style.flexDirection = 'column';
        }

        if (this.ui.symbol) this.ui.symbol.textContent = alliance.symbol;
        if (this.ui.name) {
            this.ui.name.textContent = alliance.name;
            this.ui.name.style.color = alliance.colorHex || '#ffcc00';
        }

        if (this.ui.members) {
            this.ui.members.innerHTML = '';
            alliance.members.forEach(m => {
                let avatarUrl = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
                if (alliance.memberAvatars && alliance.memberAvatars[m]) avatarUrl = alliance.memberAvatars[m];

                this.ui.members.innerHTML += `
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <img src="${avatarUrl}" style="width:40px; height:40px; border-radius:50%; border:2px solid ${alliance.colorHex}; margin-bottom:4px; object-fit:cover;">
                        <span style="font-size:10px; color:#ddd; max-width:50px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m}</span>
                    </div>
                `;
            });
        }

        this.renderStateAssignments();
    }

    renderStateAssignments() {
        if (!this.ui.assignments) return;
        this.ui.assignments.innerHTML = '';
        const savedMap = this.getAllianceVideoMap(this.selectedAlliance.id);

        this.states.forEach(state => {
            const currentVid = savedMap[state.id] || '';

            const container = document.createElement('div');
            Object.assign(container.style, {
                background: '#222',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #444',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
            });

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.innerHTML = `<strong style="color:#aaa;">${state.label}</strong>`;

            const playBtn = document.createElement('button');
            playBtn.textContent = '▶ Oynat';
            Object.assign(playBtn.style, {
                background: '#4CAF50',
                border: 'none',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px'
            });
            playBtn.addEventListener('click', () => {
                const vid = selectBox.value;
                if (!vid) {
                    alert("Önce bu durum için bir video seçin.");
                    return;
                }
                this.playVideo(vid);
            });
            header.appendChild(playBtn);

            const selectBox = document.createElement('select');
            Object.assign(selectBox.style, {
                width: '100%',
                padding: '5px',
                background: '#111',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '3px'
            });

            selectBox.appendChild(new Option('-- Video Yok --', ''));

            this.availableVideos.forEach(v => {
                const opt = new Option(v, v);
                if (v === currentVid) opt.selected = true;
                selectBox.appendChild(opt);
            });

            selectBox.addEventListener('change', (e) => {
                this.saveAllianceVideoMap(this.selectedAlliance.id, state.id, e.target.value);
            });

            container.appendChild(header);
            container.appendChild(selectBox);
            this.ui.assignments.appendChild(container);
        });
    }

    playVideo(filename) {
        const url = `${this.apiBase}/alliance_videos/${filename}`;
        this.ui.player.src = url;
        this.ui.player.play().catch(e => console.error("Video Oynatılamadı:", e));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new AllianceWarApp();
});
