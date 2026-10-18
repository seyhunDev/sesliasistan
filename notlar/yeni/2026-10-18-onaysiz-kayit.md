## Nerede kaldım

- Asistanla plan/görev/not ekleme onaysız (Seyhun, 2026-10-18: "ekle dedim mi direkt kaydedilsin, onay almaya gerek yok"). Planın saati söylenmediyse tüm gün, günü söylenmediyse bugün olarak hemen kaydedilir (`autoFill`, features/add/drafts.js; isler/kayit.js startDrafts/refineDrafts). "Saat kaçta olsun?" / "Hangi gün olsun?" / "Kaydedeyim mi?" soruları artık sorulmaz (yapay zeka istemi lib/ai/assistant.js ve yerel komutlar lib/commands.js da buna göre).
- Kayıttan sonra "Ekledim: …" cevabı ve kaydın altında Düzenle düğmesi aynı; değişiklik sesle de söylenir ("saatini 10 yap").
- Onaylı kalanlar (değişmedi): silme, para, mesaj gönderme, arama, sporcu silme gibi geri alınamaz işler.
- Ekle ekranının (AddSheet, /api/interpret) kendi akışı değişmedi.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda: "yarın antrenman planı ekle" deyip animasyona ve "tüm gün" kaydına bak.

## Asistan

- Ekleme/oluşturma onaysız; eksik gün bugün, eksik saat tüm gün. Geri alınamaz işler her zaman onaylı.

## Tasarım

- "Kaydedildi" animasyonu (onaylı örnek /mnt/project-files/asistan/kaydedildi-ornek.png, 2026-10-18): kayıt eklenince halka yeşil ✓ çizer ve "Kaydedildi" der (`ringOf({ saved })`); kayıt kartı yeşil parıltıyla aşağı kayarak gelir, ✓ rozeti büyüyerek belirir (globals.css `.asaved`, `.asaved-badge`). Telefonda denenmedi.
