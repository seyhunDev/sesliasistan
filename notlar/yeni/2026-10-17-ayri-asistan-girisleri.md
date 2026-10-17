## Nerede kaldım

- Sayfa içi ayrı asistan girişleri kaldırıldı (Seyhun, 2026-10-17: "planlarda ayrı bir asistan gösteriyor, kaldıralım; başka nerelerde varsa onları da"). Uygulamada tek asistan: sekme çubuğundaki ana asistan.
  - Plan/görev/not açılınca altta çıkan "Bu kayıtla ilgili söyle…" çubuğu (AddSheet `sa-record-focus`) artık gelmiyor.
  - Ekle ekranındaki "Asistana söyle" düğmesi ve açıklaması kalktı; elle ekleme düğmeleri aynı.
  - Dersler sayfasında ders yokken çıkan "Söyle ya da yaz" seçeneği kalktı (fotoğraf ve tek tek ekle duruyor).
  - Mesajlar'daki küçük asistan küresi zaten kapalıydı (`CHAT_AI = false`).
- Ana asistanın yapabildikleri aynı: kayıtlar adıyla söylenir ("antrenman planının saatini 10 yap").
- Telefonda denenmedi.

## Sıradaki işler

- TabBar'daki kayıt ekranı (rec) kodu artık kullanılmıyor; ileride temizlenebilir.

## Tasarım

- Sayfaların içinde ayrı asistan girişi (çubuk, küre, "asistana söyle" düğmesi) olmaz; tek giriş sekme çubuğundaki asistan.
