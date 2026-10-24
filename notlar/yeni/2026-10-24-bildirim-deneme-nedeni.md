## Nerede kaldım
- Deneme bildirimi (Ayarlar, uygulamada) "Bu cihaz abone değil" deyip nedenini söylemiyordu (Seyhun'un iPhone denemesi 2026-10-24, #800 sonrası). Artık hangi adımın eksik olduğunu yazıyor: Firebase ayarı yok (iPhone: GoogleService-Info.plist), bildirim izni yok, ya da anahtar alınamadı (hata metniyle). `src/lib/push.js` testPush.

## Sıradaki işler
0. iPhone'da Apple/Firebase adımları bitince deneme bildirimini yeniden çalıştır; hata metni neyin eksik olduğunu söyler.
