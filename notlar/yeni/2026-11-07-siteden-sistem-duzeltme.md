## Nerede kaldım

- Siteden yarış sistemi gözden geçirildi (Seyhun 2026-11-07 "sistemi incele, haritasını çıkar, hatalı eksik davranışları düzelt"). Harita: /mnt/project-files/sistem-haritasi/siteden-yaris-haritasi.md.
- Yarış sayfası ⋯ › "Siteden bağla" (`/athletes/races/site?into=<yarış>`): sınıfı kendi yarışına bağlar; sınıf zaten alınmışsa birleştirir. Siteden ekranında alınmış sınıfta "Yarışımla birleştir".
- Takip: Gruplar bölümü günün gruplarını canlı gösterir (`raceSite.watchEntryDoc`, grup başına sayı, bizim sporcuların grubu); Program bölümü (`race.notice.schedule`, bugün ve sonrası); Talimatlar'da ek talimatın notu (değişiklik) ve eski sürümler soluk.
- Sporcu listesi grupları telefonda da (`applyList` + `siteDocs.listGroups`, sunucuyla aynı kural). Arka plan yarışın adı/tarihi değişince izleme kaydını günceller.

## Sıradaki işler

- Telefonda deneme: Siteden bağla, birleştir, Takip › Gruplar/Program.
