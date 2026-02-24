// Alliance War Manager - Phase 11
// Creates the "🎯 A" floating button to open the separate battle screen.

class AllianceWarManager {
    constructor() {
        this.initDOM();
        window.allianceWarManager = this;
    }

    initDOM() {
        // 1. Right Side Trigger Button
        const btn = document.createElement('div');
        btn.id = 'alliance-war-trigger';
        btn.innerHTML = '🎯 A';
        btn.title = 'İttifak Savaş Sahnesi (Ayrı Sayfa)';
        Object.assign(btn.style, {
            position: 'absolute',
            right: '20px',
            top: 'calc(50% + 200px)',
            transform: 'translateY(-50%)',
            zIndex: '1500',
            width: '50px',
            height: '50px',
            background: 'linear-gradient(45deg, #cc0000, #ff6600)',
            borderRadius: '50%',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 0, 0, 0.8)',
            border: '2px solid gold',
            transition: 'all 0.3s ease'
        });

        btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-50%) scale(1.1)');
        btn.addEventListener('mouseleave', () => btn.style.transform = 'translateY(-50%) scale(1.0)');

        // Açılış Aksiyonu
        btn.addEventListener('click', () => {
            window.open('/alliance-war.html', '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
        });

        document.body.appendChild(btn);
        this.btn = btn;
    }
}

// Global olarak başlat
document.addEventListener('DOMContentLoaded', () => {
    new AllianceWarManager();
});
