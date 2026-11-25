## Nerede kaldım

- Siteden alınan yarış ile elle kurulan yarış birleşir (Seyhun 2026-11-07): yarış sayfası › Takip › Tüm belgeler ve işlemler › "Yarışımla birleştir" (siteden gelen belgeler, liste/gruplar, program ve izleme kendi yarışına taşınır; siteden açılan kopya silinir). Siteden ekranında "Var olan yarışıma bağla": yeni yarış açılmaz, belgeler doğrudan seçilen yarışa gelir. Sunucu `raceSiteSync.mergeSite`, API `POST /api/race-site { raceId, into }`, seçim penceresi `RacePickSheet.jsx`.
- Tek talimatta birden çok kategori (OPT.JUNIOR / OPTIMIST): talimat, ek talimat ve program okuyucuları yarışın sınıfıyla okur (`siteDocs.focusText`), başka kategorinin satırları alınmaz.
- Telefonda ve gerçek PDF ile denenmedi.

## Sıradaki işler

- İleride yarışlar yalnız siteden eklensin (Seyhun'un dediği, şimdilik değil).
- Bilgi alanı (ek talimat nerede gösterilsin) kararı bekliyor.
