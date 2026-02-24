# GEMINI SİSTEM TALİMATLARI

## 1. OTOMATİK ÇALIŞTIRMA KESİNLİKLE YASAK
- Hiçbir işlem kullanıcı açıkça istemeden başlatılamaz.
- Önce yapılacak işlem açıkça anlatılmalıdır.
- “Onaylıyor musun?” beklenmelidir.
- Sessizlik veya ima ONAY DEĞİLDİR.

---

## 2. DOSYA ve DİZİN ERİŞİMİ KURALLARI
Dosya sistemi işlemleri SADECE şu durumlarda yapılabilir:
- Kullanıcı tarafından açıkça sağlanan dosyalar
- Kullanıcının açıkça adını verdiği dosyalar

KESİNLİKLE YASAK:
- Dizin taramak
- Dosya keşfi yapmak
- Varsayılan dizin kabul etmek
- Gizli veya sistem dizinlerine erişmek

YASAKLI YOLLAR (örnek):
- /etc
- /usr
- /var
- node_modules
- .git
- Herhangi bir gizli klasör

Varsayım yok. Keşif yok.

---

## 3. TEHLİKELİ KOMUTLAR
Aşağıdaki komutlar açık onay olmadan ASLA kullanılamaz:
- rm
- mv
- sudo
- chmod
- chown
- systemctl
- kill
- format
- delete

---

## 4. PROJE FAZ KURALI (ÇOK ÖNEMLİ)

Bu proje FAZLAR halinde ilerler.
Bir faz BİTMEDEN sonraki faza geçilemez.

### FAZ–1 TANIMI
FAZ–1 sadece şunları içerir:
- Uzay boşluğu arka planı
- Tam küre bir Dünya
- Kara ve deniz dokusu
- Dünya soldan sağa, Y ekseninde döner
- Kamera sabittir ve dünyanın içine girmez

FAZ–1’DE KESİNLİKLE OLMAYACAKLAR:
- Tıklanabilir alan
- Grid
- Ülke sınırı
- Bölünme
- Veri tabanı
- UI
- Ayar
- Kayıt
- Etkileşim

FAZ–1 tamamlanmadan FAZ–2 BAŞLATILAMAZ.

---

## 5. FAZ–2 (SADECE YÖNLENDİRME – UYGULAMA YOK)

FAZ–2, FAZ–1 tamamlandıktan SONRA başlatılabilir.

FAZ–2 KURALLARI ŞİMDİDEN TANIMLIDIR:

- Dünya geometrisi ASLA değiştirilmeyecek
- Bölünmeler ayrı bir katmanda olacak
- SADECE kara parçaları bölünecek
- Denizler ve kutuplar (kuzey + güney) BÖLÜNMEYECEK
- Toplam KARA parçası sayısı: 10.000

### FAZ–2 BÖLÜNME KURALLARI
- Bölünmeler kare olmak zorunda değil
- Üçgen / çokgen olabilir
- Parçalar eşit dağıtılmalı
- Her parça TEKİL bir ID almalı
- ID’ler 1–10000 arası numaralandırılmalı
- Bu ID’ler kalıcı olmalı
- Sayfa yenilense bile yerleri değişmemeli

### KUTUP KURALI (KRİTİK)
- Kuzey Kutbu ve Güney Kutbu bölünmeye DAHİL DEĞİLDİR
- Güney yarımkürede özel alan daha sonra kullanılacaktır
- Bu alan 10.000 parçaya dahil değildir

---

## 6. DAVRANIŞ KURALI
- Faz atlama yok
- “Sonra yaparız” diye gizli işlem yok
- Her adımda kullanıcıya açıklama yapılır
- Belirsiz noktalar MUTLAKA sorulur

Bu dosya sistemin anayasasıdır.
İhlal edilemez.
## 7. FAZ–1 ETKİLEŞİM GÜNCELLEMESİ (İZİNLİ HAREKETLER)

Bu maddeler FAZ–1 kapsamındadır ve serbesttir.

### 7.1 Dünya Yüzeyi (Matlık)
- Dünya yüzeyi hafif MAT olmalıdır.
- Aşırı parlaklık, cam efekti veya yansıma OLMAMALIDIR.
- Kara ve deniz dokusu net ama doğal görünmelidir.

---

### 7.2 Uzay Arka Plan Hareketi
- Uzay arka planı statik OLMAYACAKTIR.
- Uzay dokusu yavaşça SAĞDAN SOLA doğru akmalıdır.
- Bu hareket dünyanın dönüşünden BAĞIMSIZ olmalıdır.
- Dünya ile uzay arka planı birbirine bağlanmayacaktır.

---

### 7.3 Mouse ile Dünya Kontrolü
- Kullanıcı mouse ile dünyayı çevirebilir.
- Bu kontrol sadece:
  - X ekseni (yukarı-aşağı bakış)
  - Y ekseni (sağa-sola çevirme)
  ile sınırlıdır.
- Dünya ters dönmemelidir (flip yok).
- Kamera sabit kalır, dünya döner.

---

### 7.4 Hover (Mouse Üzerine Gelme) Davranışı
- Mouse dünya üzerine geldiğinde:
  - Otomatik dönüş DURUR.
- Mouse dünya üzerinden çıktığında:
  - Otomatik dönüş DEVAM EDER.
- Bu durma sadece dönüşü etkiler, sahne donmaz.

---

### 7.5 Başlangıç Kamera Mesafesi
- Kamera başlangıçta:
  - Dünya ekrana ne çok yakın
  - Ne de çok uzak olacak şekilde ayarlanmalıdır.
- Dünya kadrajın merkezinde ve rahat izlenebilir olmalıdır.
- Kamera mesafesi FAZ–1 boyunca değişmez.

---

### 7.6 Hâlâ YASAK OLANLAR
Bu özellikler FAZ–1’de HÂLÂ YASAKTIR:
- Tıklama ile seçim
- Bölünme
- ID
- Grid
- UI
- Menü
- Ayar paneli
- Veri kaydı

Bu güncelleme FAZ–1 kapsamındadır.
FAZ–2 başlatılmaz.
## FAZ–1 KİLİTLENDİ

FAZ–1 tamamlanmıştır.
Bu aşamadan sonra:

- FAZ–1 özellikleri DEĞİŞTİRİLEMEZ
- Geriye dönük görsel veya davranış eklenemez
- Sadece FAZ–2 için yeni katmanlar eklenebilir

FAZ–1 referans sahnedir.
Tarih: (bugünün tarihi)

---

## FAZ–2: DÜNYA KATMANLARI (AKTİF FAZ)

FAZ–1 KİLİTLİDİR.
FAZ–1’e ait dünya geometrisi, dokular, kamera, modlar ve davranışlar
KESİNLİKLE değiştirilemez.

FAZ–2 SADECE üst katmanlar ekler.

---

### FAZ–2 AMAÇ

FAZ–1 dünyasının ÜZERİNE, ayrı katmanlar halinde:

- Ülke sınırları
- Kara parçaları

eklemek.

---

### FAZ–2 KATMAN MİMARİSİ (DEĞİŞMEZ)

[ KATMAN 0 ] FAZ–1 Dünya (DOKUNULMAZ)
[ KATMAN 1 ] Ülke Sınırları (overlay – aç/kapa)
[ KATMAN 2 ] Kara Parçaları (~7000 adet – aç/kapa)

Dünya mesh’i bölünemez.
Dünya texture’ı değiştirilemez.

---

### KATMAN 1: ÜLKE SINIRLARI

Özellikler:
- Gerçek dünya ülke sınırları kullanılır.
- İnce çizgi (stroke) olarak gösterilir.
- Dünya yüzeyinin hemen üstünde overlay şeklinde durur.
- Dünya ile birlikte döner.

Davranış:
- Varsayılan olarak AÇIK gelir.
- “Konsol” panelinden açılıp kapatılabilir.
- Kapatıldığında tamamen görünmez olur.
- Veri silinmez.

---

### KATMAN 2: KARA PARÇALARI

Kurallar:
- SADECE kara alanları bölünür.
- Kuzey ve Güney kutupları HARİÇTİR.
- Toplam parça sayısı yaklaşık 7000’dir.
- Bölünmeler kare olmak zorunda değildir.
- Üçgen veya çokgen olabilir.
- Görsel olarak “toprak fethediliyor” hissi vermelidir.

---

### PARÇA DAĞILIMI

- Ülkeler yüzölçümüne göre orantılı parçalanır.
- Aşırı küçük ülkeler için minimum parça sayısı atanır.
- Büyük ülkeler daha fazla parça alır ancak aşırıya kaçılmaz.
- Görsel denge korunur.

---

### NUMARALANDIRMA & ID SİSTEMİ

Her kara parçası:
- Tekil bir ID alır.

Format:
LAND_0001
LAND_0002
...
LAND_7000

ID Kuralları:
- ID’ler sabittir.
- Kalıcıdır.
- Asla yer değiştirmez.
- Sayfa yenilense bile aynı ID aynı koordinatta kalır.

Bu sistem, parça kayma problemini önleyen ana kilittir.

---

### ETKİLEŞİM (FAZ–2 SINIRI)

- Kara parçaları hover ve click algılayabilir.
- Şimdilik sadece test amaçlıdır.

KESİNLİKLE YASAK:
- Fetih mekaniği
- Renk atama
- Sahiplik
- Oyun kuralları

---

### UI KONTROLLERİ

“Konsol” paneline şu kontroller eklenir:

☑ Ülke Sınırları  
☑ Kara Parçaları  

Kurallar:
- Aç / kapa anlık çalışır.
- Kamera etkilenmez.
- Performans düşmez.

---

FAZ–2 BU TANIMLA SINIRLIDIR.
Ek özellik eklenemez.
Bir sonraki faz açıkça tanımlanmadan ilerlenemez.

FAZ–1 ve FAZ–2 kilitlidir.
Bu fazlarda oluşturulan hiçbir yapı değiştirilemez.

---

FAZ–3.1 — AFRİKA TEST PARSELLERİ

AMAÇ:
Afrika kıtası üzerinde,
birbirini tamamlayan,
boşluksuz,
organik kara parçalarından oluşan
bir test parsel sistemi kurmak.

KAPSAM:
- SADECE Afrika kıtası
- Ülke sınırları YOK SAYILIR
- Sadece kara maskesi referans alınır

PARÇALAR:
- Şekiller:
  - Üçgen
  - Daire
  - Yarım daire
- Şekiller tam geometrik olmak zorunda değildir.
- Gerekirse adaptif olarak bozulabilir.
- Yarım şeklin altına düşülmez.

KURALLAR:
- Parçalar kara sınırlarını aşamaz.
- Deniz alanına taşma YOK.
- Kara içinde boşluk YOK.
- Parçalar üst üste binmez.
- Parçalar birbirini tamamlar.

ETKİLEŞİM:
- Her parça:
  - Tekil ID alır
  - Numara atanabilir
  - Renklendirilebilir
- Tıklanabilirlik:
  - Önceliklidir
  - Eğer teknik olarak zorlayıcıysa,
    tıklama yerine parça seçilebilir / atanabilir olması yeterlidir.

SAYI:
- Afrika kıtasına doğal olarak kaç parça sığıyorsa o kadar üretilecek.
- Sabit sayı zorunluluğu yok.
- Bu bir testtir.
- Sonuç incelendikten sonra sayı artırılabilir veya azaltılabilir.

NOT:
Bu FAZ–3.1 bir TEST FAZIDIR.
Başarılı olursa aynı sistem FAZ–3.2’de diğer kıtalara uygulanacaktır.
