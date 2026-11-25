## Nerede kaldım
- Canlı yayın uçtan uca testi (Seyhun 2026-11-02 "canlı yayın için test yaz"): `npm run test:canli-ekran` (scripts/canli-ekran-test). Sahte Firebase (emülatör, Java gerekir) + gerçek /api/canli + tarayıcı, TV ve telefon boyu. Sınananlar: saat eşlemesi, yarış verisi, yarış olmayan gün, olmayan/bozuk kimlik, açık yarışlar listesi; geri sayım şeritte (kare eş bayraklar, dakika çubuğu, sayaç işler), yarışta sıralama, tehir, bugün yarış yok, kaldırılan yarış, yükleniyor iskeleti, Yayın'dan yazılan geri sayımın 20 sn içinde açık ekrana gelmesi, /canli/ornek 12 adım; her ekranda çökme/yana taşma yok. Bulutta 26/26 geçti (217 sn).
- Testin bulduğu: şerit bayrakları start kaydı bulunmazsa kayboluyordu; artık sayacın yarışından da (timer.rid) okunuyor.

## Sıradaki işler
- test:hepsi'ye eklenmedi (ortak sunucuda yönetici anahtarı yok); ayrı çalıştırılır.
