## Nerede kaldım

- Yarış sayfası kaydı artık yalnız değişen alanları yazar (2026-11-04, yarış sistemi haritası A alanı): `races.js` `saveRace(orgId, uid, r, base)` + `changedFields`; RaceEditor `base` (sayfanın bildiği son kayıt; her kayıttan sonra ve `sa-race-saved` ile gelen alanlarla güncellenir) → page.jsx `onSave(r, cur, base)`. Sayfa açıkken siteden gelen ek talimat, Yayın'dan yüklenen sonuç ya da başka cihazın yazdığı alan artık eski haliyle geri yazılmaz.
- Ortak yarıştan yenilik alınırken de (page.jsx) yalnız değişen alanlar yazılır. Yeni yarışın ilk kaydı eskisi gibi tümü.
- Telefonda denenmedi; test paketleri çalıştırılmadı (yalnız `changedFields` elle denendi).

## Sıradaki işler

- Aynı alanı iki yer aynı anda değiştirirse (ör. iki cihazda not) son yazan kazanır; alan içi birleştirme yok.
