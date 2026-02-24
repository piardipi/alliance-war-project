FAZ-3: Kara Parselleri Sistemi
--------------------------------------------------
Durum: TAMAMLANDI

Özellikler:
1. 7000 Adet Kara Parseli:
   - "countries.geo.json" verisi kullanılarak oluşturulan "Binary Land Mask" sayesinde
     noktalar sadece kara parçaları üzerine yerleştirildi.
   - Denizler ve Okyanuslar tamamen boş.
   - Kutuplar (Enlem > 75 ve Enlem < -60) hariç tutuldu.

2. Kalıcılık (Persistence):
   - Oluşturulan 7000 nokta "localStorage" veritabanına kaydedildi.
   - Sayfa yenilendiğinde noktalar yer değiştirmez.

3. Performans:
   - Three.js "InstancedMesh" teknolojisi kullanıldı.
   - 7000 obje tek bir "draw call" ile çizilerek 60 FPS korundu.

4. Etkileşim:
   - Hover: Parsellerin üzerine gelindiğinde dünya dönüşü durur (Raycasting).
   - Tıklama: Bir parsele tıkladığınızda "LAND_XXXX" ID'si konsola yazılır ve ekranda alert görünür.

5. Kontrol Paneli:
   - Sağ paneldeki "Konsol" sekmesine "Kara Parselleri (Faz-3)" kutucuğu eklendi.
   - Bu kutucuk ile parselleri gizleyip açabilirsiniz.

Nasıl Test Edilir?
------------------
1. Tarayıcıda projeyi açın.
2. Dünya üzerinde yeşil küçük noktalar göreceksiniz.
3. Bu noktaların sadece karalar üzerinde olduğuna dikkat edin.
4. Bir noktaya tıklayın ve ID'sini görün.
5. Sağ alttaki menüden paneli açıp "Kara Parselleri" tikini kaldırın/açın.
