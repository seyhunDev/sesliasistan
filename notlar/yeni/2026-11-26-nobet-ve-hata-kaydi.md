## Nerede kaldım
- Sistem taraması madde 10 (zamanlayıcı nöbeti): `src/lib/server/watchdog.js`. plan-reminders (5 dk) ve race-site (10 dk) birbirini izler; race-site `system/raceSite.at` yazar. Biri 30 dk çalışmadıysa (ya da plan-reminders yarıda kaldıysa) Velora ana hesabına tek bildirim "… durdu", düzelince "… yeniden çalışıyor" (`alertAt`). Yarım saatte bir bakılır (~70 okuma/gün). Velora Food kurye zamanlayıcısı izlenmiyor (her dakika yazma gerekirdi).
- Sistem taraması madde 9 (merkezî hata kaydı): `lib/crash.js logCrash` hatayı `/api/hata`'ya da yollar (yükleme hatası hariç, giriş yoksa gitmez). Sunucu `orgs/{kulüp}/hatalar/{gün}` = { n, list (en yeni 50) } yazar; kişi başı saatte en çok 10. Ayarlar › Admin › Hatalar sekmesi son 7 günü gruplu gösterir (`features/admin/Hatalar.jsx`, `lib/hata.js`). Kural değişikliği gerekmez (ana hesap genel kuralı). Telefonda denenmedi.

## Sıradaki işler
0. Telefonda: Ayarlar › Admin › Hatalar açılıyor mu.
