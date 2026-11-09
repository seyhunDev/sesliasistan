## Nerede kaldım
- Yarış detayı Takip yeni tasarım (Seyhun 2026-11-09 "profesyonel, modern, minimal, sade"; örnek takip-telefon/ipad.png "Yap"): kutu yok, bölümler ince çizgiyle.
  - Üst: tek satır bilgi şeridi Bitti · Durum/Sıradaki · Hava (RaceStats; Hava hücresi dokununca saat saat hava açılır), altında Canlı ekran · Yayın · Harita (RaceGo extra; Harita dokununca harita açılır). RaceWxRows `stats`/`go` modu; eski Hava/Harita açılır satırları yalnız yarıştan önce.
  - Takip: en üstte son belge kartı (siteDocs.latestNews; Aç · Okudum → saveDocState read:true). Program gün seçicili (Bugün · Yarın · 11 Kas), saat solda iş sağda; son ek talimatın değiştirdiği satırlar (changedRows, undo.notice.schedule ile şimdiki) Okudum'a kadar mavi, eski saat üstü çizili. Gruplar tek renk çubuğu + sayı. Belgeler solda mavi noktalı satırlar, "Tüm belgeler".
  - CSS globals.css "TAKİP YENİ TASARIM" (.tk-*), .rz-stats şerit.

## Sıradaki işler
- Yarışlar listesi sayfası minimal/modern yeniden tasarım + "+ Yarış" ile federasyon yarışları listesi (Seyhun 2026-11-09): önce örnek.
- Üst kısım ilk öneri (Bugün kartı, mini saatlik çubuklar, iPad harita önizlemesi) bu tasarımla geçersiz.

## Tasarım
- Yarış detayı: kutu içinde kutu yok; bilgiler ince çizgili şeritte; değişen saat mavi + eski üstü çizili (Okudum'a kadar).
