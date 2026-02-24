# Windows Güvenlik Duvarı Sorun Giderme Rehberi

Eğer diğer bilgisayardan oyuna bağlanamıyorsanız, Windows Güvenlik Duvarı bağlantıyı engelliyor olabilir.

## Adım 1: Node.js İzni Verin

1. **Başlat** menüsünü açın ve `Güvenlik Duvarı` yazın.
2. **"Bir uygulamanın Windows Güvenlik Duvarı üzerinden geçmesine izin ver"** seçeneğine tıklayın.
3. Açılan pencerede **"Ayarları Değiştir"** butonuna tıklayın (Yönetici izni gerekebilir).
4. Listede **Node.js JavaScript Runtime** veya sadece `node.exe`yi bulun.
5. Yanındaki **Özel (Private)** ve **Ortak (Public)** kutucuklarının HER İKİSİNİ DE işaretleyin.
6. **Tamam** diyerek kaydedin.

## Adım 2: Bağlantıyı Test Edin

1. Sunucunun çalıştığından emin olun (`npm run dev` ve `node server.js` terminallerde açık olmalı).
2. **Kendi Bilgisayarınızın IP Adresi:** `192.168.1.100`
3. Diğer bilgisayardan tarayıcıyı açın ve şu adresi girin:
   - Oyun: **`http://192.168.1.100:3000`**
   - Sunucu: **`http://192.168.1.100:3333`**
4. Eğer açılmıyorsa, her iki bilgisayarın da aynı Wi-Fi/Ethernet ağına bağlı olduğundan emin olun.
