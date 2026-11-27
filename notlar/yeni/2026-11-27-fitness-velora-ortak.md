## Nerede kaldım

- Velora hareketleri ve hazır programlar herkese açıldı (Seyhun 2026-11-27, örnek onaylı: https://claude.ai/artifact/DWy9QwyLD4YFMKQMX2HDt5, "Normal kullanıcı" ekranları).
- Kaynak: Velora sahibinin (seyhunyildiz) kulübünde iki yer.
  - Hareketler: orgs/{org}/fitLib/main
  - Yayınlanan hazır programlar: orgs/{org}/fitHazir/{id}
- Okuma sunucudan: `/api/fitness-ortak` herkese salt okunur verir, 2 dk bellekte tutar. Kural değişikliği yok. Fotoğraf ve videolar indirme adresleriyle (token'lı) açılıyor.
- Ortak kod: `lib/fitness/ortak.js` (cleanHazir, hazirList, hazirOzet) ve `useOrtak.js`.
- Hazır programlar (`HazirProgramlar.jsx`):
  - Fitness ⋯ menüsünde ve ilk açılış ekranında. Kart kart; "Programıma ekle", Program ekle › Hazır program'ı o program seçili açar.
  - Velora sahibi "+ Programımdan ekle" ile kendi programını yayınlar ve kaldırabilir. Kişiye ait alanlar (kimin için, yaş, başlangıç) atılır.
- Hareketler, Velora sahibi olmayan hesapta (`VeloraHareketler.jsx`): Velora sekmesi salt okunur (fotoğraf, animasyon, açıklama); "Benim" kendi Hareketler kütüphanesini açar.
- Hareket seç (`ExercisePicker`): Velora sahibi olmayan hesapta "Velora hareketleri" ve "Benim" sekmeleri. Velora hareketi fotoğraf, animasyon ve açıklamasıyla eklenir.
- Hazır programı ekleyen normal kullanıcıda hareketler Velora'nın fotoğraflarıyla gelir (progWithLib); fotoğraf yüklemesi yalnız Velora sahibinde yapılır.
- `fromTemplate(id, start, times, list)`: list verilirse yayınlananlar da açılır.
- Telefonda denenmedi.

## Sıradaki işler

- Admin › Uzman programı (UzmanProgram.jsx) fromTemplate'i list'siz çağırıyor; yayınlanan hazır programlar orada açılmaz. Admin çalışmasına söylendi.
