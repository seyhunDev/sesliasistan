## Nerede kaldım

- Seyhun (2026-10-21) test cümleleri ve "rapor oluştur" komutu istedi. Test cümleleri Claude Docs'ta: "Sesli asistan test cümleleri" (https://claude.ai/artifact/YXQRcWyMTRUvv862iJBCGC).
- "Rapor oluştur" / "raporu paylaş" / "asistan raporu hazırla" (lib/assistReport.js `reportAsk`, yönlendirme "report", yapay zekaya gitmez): Asistan raporu sayfası açılır (`/settings/report`, Ayarlar › Testler › Asistan raporu). Paylaş (iPhone paylaşım menüsü) ve Kopyala.
- Kapsam: bugün (gece yarısından beri), bu cihaz. İçerik: sürüm, cihaz, Sesli yanıt / Hazır cevaplar durumu, model; özet (istek sayısı, sesli/yazılı, yapay zekaya giden, ortalama ve en uzun süre, hata sayısı); her istek için duyulan cümle, cevap, kim cevapladı, model, hata, adım adım süreler, canlı yazı; dinleme hataları saatiyle.
- Süre kaydı artık cevabı da tutuyor (`timingReply(engine, answer)`), 20 yerine son 100 komut; dinleme hataları ayrı listede (`sa-timing-err`, son 50; useSpeech `fail`).
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun test cümlelerini dener, "rapor oluştur" deyip raporu paylaşır; rapora göre asistan düzeltilir.
