# Piardiarena 3 - 3D Earth Scene 🌍

Bu proje, Three.js ve Node.js kullanılarak geliştirilmiş interaktif, canlı yayın veri entegrasyonlu (TikTok) web tabanlı bir 3D dünya haritası simülasyon ve fetihi oyunudur.

## 🚀 Özellikler

- **Gelişmiş 3D Renderleme**: Three.js ile fotogerçekçi, çizgi film (cartoon) ve fetih (conquest) tabanlı rendering yetenekleri.
- **Canlı TikTok Entegrasyonu**: `tiktok-live-connector` ile sunucu üzerinden güvenli ve asenkron veri akışı.
- **Modüler JS Yapısı**: `EventManager` kullanımı ile modülerleştirilmiş, izole frontend etkileşim yapısı.
- **Geliştirilmiş Sunucu Güvenliği**: Helmet ve Express-Rate-Limit entegrasyonu kullanılarak güvenlik açıkları onarılmış, güçlendirilmiş Express API.

## 📂 Proje Yapısı

```text
📦 Piardiarena3test
 ┣ 📂 public/              # Statik dosyalar, arayüz script'leri
 ┣ 📂 videos/              # Ana video içerik deposu
 ┣ 📂 alliance_videos/     # İttifaklara özel videolar
 ┣ 📂 sounds/              # Oyun ses dizini
 ┣ 📜 server.js            # Express ve Socket.io arka uç sunucusu
 ┣ 📜 main.js              # Ana oyun motoru (Three.js WebGL)
 ┣ 📜 EventManager.js      # Etkileşim ve Event yönetimi modülü
 ┣ 📜 index.html           # Ana HTML arayüz giriş noktası
 ┣ 📜 style.css            # Frontend genel stilleri
 ┗ 📜 package.json         # Bağımlılıklar (Dependencies)
```

## 🔧 Optimizasyon (Assets)

Projenin `assets/` klasöründe yapılan incelemelerde aşağıdaki yapıların projede kullanılmadığı (hardcode/artık dosya) tespit edilmiş ve silinerek temizlenmiştir:
- `assets/phase8/phase8_bg.jpg` (Kullanılmayan büyük arka plan afişi)
- Kullanılmayan `assets` dizin yapısı.

## 🛠 Kurulum ve Başlatma

1. Bağımlılıkları Kurun:
```bash
npm install
```

2. Geliştirici Sunucusunu Başlatın (Vite):
```bash
npm run dev
```

3. Backend/Güvenlik Sunucusunu Başlatın (Express):
```bash
node server.js
```
