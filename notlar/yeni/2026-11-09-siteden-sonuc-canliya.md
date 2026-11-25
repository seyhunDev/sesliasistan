## Nerede kaldım
- Siteden gelen sonuç belgesi artık sunucuda (race-site-background, raceSiteTake → raceSiteResults.takeResults) okunuyor: önce yazılı tablo (pdfLines.resultTableOf), olmazsa yapay zeka (lib/ai/raceResultsAi.js, /api/race-results ile aynı yönerge). Genel liste hemen `raceLive/{yarış}/sheets/site-{belge}`'ye yazılıyor, canlı genel sıralama (/api/canli fleetsOf, 60 sn önbellek) uygulama açılmadan güncelleniyor.
- Bizim sporcuların sırası (race.results) yine uygulamada yarış sayfası açılınca işleniyor (belge "new" kalır). Telefon işleyince kendi kopyasını yazar, `site-…` kaydını siler (resultsImport `replace`), Geri al eskisi gibi.
- Eski (önceden gelmiş) sonuç belgeleri sunucuda yeniden okunmaz; yalnız bundan sonra gelenler.

## Sıradaki işler
- Gerçek bir site sonucuyla canlı ekranda denenmedi.
- Takip'te son gelen belge kartı ve Okudum (örnek /mnt/project-files/talimat-ust/ornek-telefon.png) Seyhun'un onayını bekliyor; yama oturum çalışma alanında.
