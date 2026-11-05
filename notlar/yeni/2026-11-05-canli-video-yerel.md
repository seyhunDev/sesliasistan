## Nerede kaldım
- #1250'deki "Buluta yükle" kalktı (Seyhun 2026-11-05 "canlı yayına göndermeyelim, sadece benim uygulamamda"). Yayın › Kayıtlar eski hâline döndü (doğrudan yükler).
- /canli alt çubukta ana hesaba, yalnız uygulama içinden açılınca (Yayın › Ekrana aç; sessionStorage canli-geri) **Video** düğmesi: "Video çek", bugün çekilenler; videoya dokununca yalnız bu cihazın ekranında arka planda oynar (.lv-my), yeniden dokununca kalkar. Video cihazda 7 gün (pendingStore kept, `mine: true`), hiçbir yere yüklenmez; linkteki yayın aynen sürer. Kod `src/features/liveScreen/LiveVideos.jsx`.
- Alt çubukta "Gizle" (herkes): düğmeler kalkar, küçük "Düğmeler" kalır.
- Geri oku yalnız uygulama içinde; paylaşılan linkte hiç geri yok (yükleme ekranı ve eski yerleşim dahil).
- Cihazda denenmedi.

## Sıradaki işler
- Telefonda/iPad'de dene: Yayın › Ekrana aç → Video → Video çek → dokun, arka planda oynuyor mu.
