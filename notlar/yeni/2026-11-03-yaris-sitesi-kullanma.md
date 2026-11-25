## Nerede kaldım
- Yarış sitesinden gelen belgeler artık sunucuda hemen kullanılıyor (Seyhun: "artık manuel yok, buradan aldıklarımızı datamıza yükleyip kullanacağız"; telefonda denenmedi):
  - `netlify/functions/race-site.mjs` (10 dk) yalnız sırası gelen yarışları seçer, imzalı istekle `race-site-background.mjs`'i çağırır (indirme + yapay zeka 30 sn'ye sığmaz). `/api/race-site` yarışı alınca ve "Şimdi bak" da arka planı çağırır.
  - `src/lib/server/raceSiteTake.js`: renk listesi / final grupları / sporcu listesi PDF tablosu sunucuda okunur (pdfjs-dist, Node; DOMMatrix yerine yalın matris) → günün grupları + kayıt listesi; yarış talimatı (ilan değil) yapay zekayla → program, boşsa sınıflar/iletişim; ek talimat ve program → programdaki değişiklik (aynı gün + başlık değişir). Her biri öncesini saklar, yarış sayfasında Geri al.
  - Tablosu okunamayan liste ve sonuçlar telefonda işlenir (yarış sayfası açılınca; sonuçlarda sporcularımız ayrı projede).
  - Talimat okuyucusu tek yerde: `src/lib/ai/raceNoticeAi.js` (/api/race-notice da kullanır).
  - "Siteden belgeler" listesi canlı (onSnapshot); sunucu talimatı işleyince yarış yeniden okunur, RaceEditor `sa-race-saved` ile `notice`'i de alır.
  - Bildirim belge işlendikten sonra gider, alt satırda ne yapıldığı ("48 teknenin grubu · 4 Kas"). İlk alışta (eski belgeler) bildirim yok.

## Sıradaki işler
0. Telefonda: yeni bir yarışı Siteden al; birkaç dakika sonra Siteden belgeler'de renk listesi "N teknenin grubu" yazıyor mu, ek talimat notu ve program değişikliği yarışta görünüyor mu; Geri al.
1. Netlify işlev günlüğünde `race-site-background` hata veriyor mu bak (pdfjs-dist paketleme, GEMINI anahtarı işlevde de olmalı).
