## Nerede kaldım
- Herkese açık canlı yarış ekranı (Seyhun 2026-11-01: "bu ekran herkese açık olacak… geniş ekranda göstereceğim"; örnek project-files/yaris-canli-ekran onaylandı; telefonda ve dev ekranda denenmedi): girişsiz sayfa `/canli/<yarış id>` (`src/app/canli/[id]/page.jsx`, `src/features/liveScreen/LiveScreen.jsx` + `liveScreen.css`). Solda sayaç (start öncesi geri sayım, startan beri süre, bitince süre; 5 · 4 · 1 · 0 şeridi) ve ekranda oynayan (Canlı yayın: YouTube gömülü; Tekrar: "1. yarış startı", Döngü) + galeri; ortada TEK sıralama listesi (sıra, yelken, ad, kulüp, her şamandıradaki sırası; parkur sırasıyla sütunlar, aynı şamandıra tekrar edebilir 1 · 4 · 1 · 2 · 3 · F; okunan son tekne pembe); sağda rüzgâr ve parkur kartı (`courseCard.js`). Önceki yarışlar `?y=<start id>`; resmî sonuç (PDF) varsa liste PDF'ten dizilir, Altın/Gümüş seçilir, elle finişten farklıysa "Elle 6". Laptop, dev ekran (yazı ekranla büyür), tablet (2 sütun) ve telefon (tek sütun, şamandıralar sütun kalır) düzeni.
- Veri: `orgs/{org}/raceLive/{yarış}` belgesinde `rounds` ({ [startId]: { route, legs } }), `screen` ({ kind live|rec, mid, loop }), `stream` ({ url }); saf işlevler `src/lib/raceRounds.js`, yazma `raceLiveStore.js` `saveRounds` / `saveScreen` / `saveStream`, ortak işler `src/features/liveScreen/liveActions.js`.
- Girişsiz okuma sunucudan: `src/app/api/canli/route.js` (yönetici anahtarı; Firestore kuralları DEĞİŞMEDİ). Yalnız ana hesabın açtığı yarış okunur (`canliEkran/{yarış}` = { org }, POST /api/canli). Sayfa 4 sn'de bir sorar, cevap 2 sn bellekte ve CDN'de tutulur.
- Uygulamada: yarış multimedya sayfası (ve yarış günü yarış sayfası) ⋯ › Canlı ekran (yalnız ana hesap; `LiveScreenSheet`): Linki kopyala, Ekranı aç, Ekranda (YouTube bağlantısı, kayıtlar, Döngü, Göster / Ekrandan kaldır), Dönüşler (asistana söylenen cümle yazılır, Son yazılanı geri al).
- Asistan (yalnız ana hesap, `isler/canliEkran.js`, `assistRoute` "liveScreen"): "birinci şamandıra 1302 1287 1415", "finish 1287 1302", "parkur 1 4 1 2 3 finish", "ekranda birinci yarışın startını döngüde göster", "ekranda canlı yayını göster", "ekrandan kaldır", hemen ardından "geri al". Dönüşler o anki yarışa (sayacın yarışı, yoksa son açılan) yazılır.
- Sonuç PDF'i artık yarış yarış puan sütunlarını da okur (`race-results` `r`, `resultSheet.js` cleanSheet). Eski yüklenen PDF'lerde bu yok: resmî sonuç canlı ekranda görünsün diye PDF bir kez daha yüklenmeli.
- Testler: `yaris.mjs` "Canlı ekran: dönüşler", `yonlendirme.mjs` liveScreen.

## Sıradaki işler
0. Telefonda: yarışta ⋯ › Canlı ekran › Linki kopyala, laptopta aç; sayacı başlat, sesle "birinci şamandıra 1302 1287" de, ekranda listeye düşüyor mu (4 sn içinde); Ekranda bir video seç, Döngü, Göster.
1. "Şamandıra dönüşlerini kamerayla oku" konusu dokunarak giriş ekranını yapacak; veriyi `raceRounds.js` `applyRound` + `saveRounds` ile yazar.
2. Canlı yayın Velora'dan değil YouTube Live'dan gelir (telefondan yayın yok).

## Tasarım
- Canlı ekran logo renklerinde açık görünüm (uygulamanın temasından bağımsız): pembe #e8336b tek vurgu, yeşil yalnız "Resmî", kehribar yalnız "Elle N" farkı.
