## Nerede kaldım

Yayın › Süre bölümü, onaylanan "startlar-yeni" tasarımına göre değişti (görsel: /mnt/project-files/yayin-tasarim/startlar/startlar-yeni.png).

- **Gruplar:** günde bir kez seçiliyor. Seçilenler `plan.grps`, `plan.cls`, `plan.prep` alanlarına yazılıyor. "Değiştir"e basınca grup, sınıf ve bayrak çipleri açılıyor.
- **Bugün listesi:** yarış yarış gösteriliyor (lib/raceLive.js `dayRaces`).
  - Her yarışın altında grupları duruyor. Her satırda tek durum var: Bitti (saat · süre), Yarışta, Geri sayım, Abandone, Sıradaki, Bekliyor.
  - Abandone edilen grubun yeniden start'ı "tekrar" diye görünüyor.
  - Biten yarış tek satıra kapanıyor, dokununca açılıyor.
- **"+ Yarış":** sıradaki yarışı günün bütün gruplarıyla ekliyor (`raceOrder`). Grup seçilmemişse tek start ekliyor.
- **Bekleyen satır:** dokununca bayrak çipleri ile "Çıkar" görünüyor. Yukarı/Aşağı düğmeleri kaldırıldı.
- **Program:** en çok 24 start alıyor.
- **Başlat düğmesi:** "Başlat · 3. yarış Sarı" yazıyor.
- **Yarış sürerken:** sayacın altında yan yana iki düğme var, Abandone ve Bitti. Antrenman sayacı eskisi gibi kaldı.
- **Günü bitir:** listenin altına taşındı (bir kez daha soruyor). "Günü yeniden aç" ⋯ menüsünde kaldı.

## Sıradaki işler

- Telefonda denenmeli (giriş gerektiği için bulutta ekran görüntüsü alınamadı).
- Yeni canlı ekran düzeni, ardından yayın özeti belgesi ve canlı dinleme.
