## Nerede kaldım

- Antrenman sayfası (src/app/(app)/training/day/page.jsx) yarış multimedya düzeninde (onaylı örnek /mnt/project-files/antrenman-sayfasi/medya-ornek.png): altta Süre · Medya · Hava · Sonuçlar (RaceMedia'nın TabDock'u). Uygulamanın alt çubuğu bu sayfada da gizli (TabBar isMedia).
- Süre: aynı sayaç + Start/Şamandıra kareleri; solda Fotoğraf/Video (Medya'da kamerayı açar), sağda + (rüzgâr yaz); altında Yoklama, Yarışlar, Günlük.
- Medya: multimedyanın MediaTab'ı aynen. Kayıt orgs/{org}/raceLive/ant-<planId> (künyeler, rüzgâr, sayaç eşitleme), dosyalar Storage raceMedia (storage.rules zaten var). Antrenman yarışları start satırına çevrilir (startsOf), fotoğraflar yarışa ve ana göre gruplanır.
- Hava: multimedyanın WeatherTab'ı; yer planın `spot` alanı (WeatherTab'a saveSpot verildi), yoksa Dikili.
- Sonuçlar: günün yarışları + puan durumu (Races.jsx RaceList), "Yeni yarış"; yarışa dokununca o yarış açılır (Races rid0).
- Kural değişikliği yok. Telefonda ve gerçek veriyle tarayıcıda denenmedi.

## Sıradaki işler

- Telefonda dene: antrenman sayfasında Medya'dan fotoğraf/video çek, sayaç sürerken çekilenin "Yarış N · Son 1 dakika" grubuna düştüğüne bak; Hava'da yer doğru mu.
