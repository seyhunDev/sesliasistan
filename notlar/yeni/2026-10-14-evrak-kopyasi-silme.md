## Nerede kaldım

- Firebase'e gönderilen yarış evrakı telefonda kopya bırakmıyor (Seyhun: "taşıdıktan sonra siliyor muyuz, kalıyorsa silme butonu yap, gereksiz veri tutmayalım"; telefonda denenmedi): taşıma sonrası yalnız telefondaki asıl kayıt siliniyordu, yüklenen her dosyanın bir kopyası (`rf:<id>`) IndexedDB'de kalıyordu, açılan dosya da saklanıyordu. Artık yükleme ve açma kopya tutmaz (dosya açılınca Storage'dan indirilir; `uploadRaceFile`, `loadRaceFile`, raceStore.js). Taşıma bitince eski kopyalar kendiliğinden silinir; Ayarlar › Diğer ayarlar › Bu cihazdaki veriler'de kopya varsa "N evrakın kopyası telefonda · Kopyaları sil" (`dropRaceCopies`). Taşınamayan dosyalar telefonda kalır (kaybolmasın). Hazırlanan evrak (T.C. bilgili) ve talimat kopyası eskisi gibi telefonda, tek tek silinebilir. Kural değişikliği yok.

## Sıradaki işler

- Ayarlar › Bu cihazdaki veriler'i aç; "Kopyaları sil" görünüyorsa bas, toplam düşmeli. Bir yarışta eklenen evrakı aç, yine açılmalı (internet gerekir).
- Storage 2. adım: fiş fotoğrafları.
