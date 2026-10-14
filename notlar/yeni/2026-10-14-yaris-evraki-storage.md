## Nerede kaldım

- Yarışa eklenen evrak Firebase Storage'da (Seyhun: "telefonda tuttuğum evrakları ilgili yerlere göndermem için bir buton yap, sonra telefonda kalması zorunlu olmayanları Firebase'e taşıyoruz, adım adım"; 1. adım; telefonda denenmedi). Analiz: `/mnt/project-files/firebase-kota/storage-analizi.md`.
  - Yarış › Evrak › "Evrak ekle" artık dosyayı `orgs/{org}/raceFiles/{id}` yoluna yükler (en çok 20 MB, yüzde görünür); yarışta künye `files [{id, name, type, size, at, url}]` (`cleanRaceFiles`, races.js). Her cihazdan açılır, paylaşılır, silinir (Storage'dan da). Açılan dosya cihazda da saklanır (`rf:<id>`). İndirilemezse adresi açar.
  - Eskiden yalnız telefonda duran evrak (`<yarış>:extra`) için iki yerde "Firebase'e gönder": yarışın Evrak sekmesinde sarı satır ("N evrak yalnız bu telefonda") ve Ayarlar › Diğer ayarlar › Bu cihazdaki veriler (bütün yarışlar). Gönderilen dosya yarışına bağlanır, telefondaki kopyası silinir; gönderilemeyen (yarışı silinmiş, 20 MB üstü) telefonda kalır (`moveLocalExtras`, `localExtraCount`, `src/features/athletes/raceStore.js`).
  - Hazırlanan evrak (T.C., veli bilgisi) yine yalnız cihazda; gerektiğinde yeniden hazırlanır.
  - KURAL DEĞİŞİKLİĞİ VAR: `storage.rules`'a `raceFiles` (yalnız ana hesap okur/yazar). Firestore kuralı değişmedi.
  - Testleri `test:yaris` › "Talimat dosyası" › "eklenen evrak künyesi".

## Sıradaki işler

- `storage.rules`'u Firebase konsolundan yayınla (Storage › Kurallar). Sonra telefonda bir yarışın Evrak sekmesinde "Firebase'e gönder"e bas; Mac'ten aynı yarışta evrakı aç.
- 2. adım: fiş fotoğrafları Storage'a. Sonra Instagram fotoğrafları, envanter/fatura/talimat/sonuç dosyaları, banka maili ekleri (her biri ayrı PR, eski kayıtlar okunmaya devam eder).
