## Nerede kaldım

- Ek talimatlar (Seyhun 2026-11-04 "her gün ek talimat açıklanıyor: kaç yarış, start saati, antrenör toplantısı; programda göstermiyoruz"): talimat, ek talimat ve program okuyucuları (raceNoticeAi, AMEND_SYSTEM raceSiteTake.js, raceProgramAi) artık toplantıları (antrenör/koç, kaptanlar) atlamaz ve günün planlanan yarış sayısını ayrı madde yazar ("3 yarış planlandı"). Bunlar race.notice.schedule (yarış sayfası) ve raceLive plan.agenda'ya (Yayın › Program, canlı ekran Program) gider.
- Ek talimatın notu artık ne değiştiğini yazar (`scheduleDiff`, lib/siteDocs.js): "4 Kas İlk start 11:00 → 12:00 · 4 Kas Antrenör toplantısı 09:30 eklendi". Bildirimin alt yazısı ve Dokümanlar satırı bu not.
- Gerçek ek talimat PDF'iyle denenmedi (Seyhun'dan örnek istendi). Telefonda denenmedi.

## Sıradaki işler

- Ek talimatta iptal edilen madde (ör. "toplantı yapılmayacak") programdan düşmüyor.
