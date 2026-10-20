## Nerede kaldım

- Söz yapay zekası eklendi (ayrı işlem): iş bitince yerel sonuç cümlesi `/api/soz`'a gider, kısa Gemini çağrısı onu doğal konuşma cümlesine çevirir (en çok 4,5 sn). Sayılar, saatler ve adlar korunmadıysa ya da süre geçerse yerel cümle kullanılır. Dosyalar: `src/lib/ai/soz.js`, `src/app/api/soz/route.js`, `src/services/sozService.js`, `beyin/cevap.js` (`sozFits`, `phrase`).
- Gitmeyenler: yapay zekanın kendi yazdığı cevap, onay/seçim kartları (silme, para, kişi, yarış), görev listesi adımları, okuma istekleri, 12 karakterden kısa ya da 260'tan uzun / çok satırlı cevaplar, özet (brief).
- Sesli yanıt açıkken beklerken yalnız "Hemen ilgileniyorum." söylenir (ön cevabın yerel cümleleri artık söylenmez).
- Bilgi akışı: asistan sayfasındaki süre satırına "Söz 1,2 sn (model)" ya da "Söz zaman aşımı, 5,0 sn sonra, yerel cümle" eklendi; süre kaydında "İşin yapılması" ve "Söz yapay zekası (doğal cümle)" adımları ve hata nedeni var.
- Ayarlar › Diğer › Testler › Asistan süre kaydı: "Cevap cümlesini yapay zeka yazsın" (bu telefonda, varsayılan açık).
- Netlify'da isteğe bağlı `GEMINI_SOZ_MODEL` (daha hızlı küçük model); yoksa `GEMINI_MODEL`.

## Sıradaki işler

- Telefonda dene: söz süresi ve "yerel cümle" düşme sıklığı süre kaydından okunur. Yavaşsa `GEMINI_SOZ_MODEL` hızlı modele çekilir.
- Hızlı kalıpları açma (Seyhun'un ölçüm çıktısı bekleniyor).

## Asistan

- Karar (Seyhun, 2026-10-20): sonuç cümlesini ayrı yapay zeka çağrısı yazar (önceki "ikinci çağrı yok" kararının yerine). İşin mantığı yerel sonuçla yürür, söz yalnız gösterilen ve okunan metindir.
