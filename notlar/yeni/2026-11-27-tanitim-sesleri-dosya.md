## Nerede kaldım

- Kısa tanıtımda (/tanitim/kisa) seslendirme tek cümlede takılıyordu. Neden: sesler `/api/tanitim-ses?id=…` ile geliyordu ve Netlify CDN'i büyük olasılıkla `?id=` kısmını yok sayıp her cümlede ilk saklanan sesi veriyordu.
- Yeni düzen: sesler yayında önceden dosya olarak hazırlanır. `npm run build` önce `scripts/tanitim-ses/uret.mjs` çalıştırır; `src/lib/tanitimSes.js`'teki her cümle için Storage `tts-cache` önbelleğine bakar, varsa indirir, yoksa (metin yeni ya da değişmiş) Gemini ile bir kez üretip saklar. Çıktı `public/tanitim/kisa/ses/<id>.mp3` + `liste.json` (depoya girmez, .gitignore).
- Sayfa önce bu dosyayı açar (`?h=<metin özeti>`, metin değişince adres değişir), yoksa API'ye, o da olmazsa cihazın sesine döner. Hızlı geçişte eski cümlenin cihaz sesiyle okunması da düzeltildi (AbortError yok sayılır).
- API yanıtına `netlify-vary: query=id` eklendi (yedek yol da her cümleyi ayrı saklasın).
- Telefonda denenmedi. Yayın günlüğünde "[tanıtım sesleri] N dosya hazır" satırı görünmeli; "atlandı" yazıyorsa Netlify ortam değişkenleri derlemeye gelmiyor demektir.

## Sıradaki işler

- Yayından sonra /tanitim/kisa'da sesi açıp her cümlenin ayrı okunduğunu denemek.
- Cümle değişirse yalnız `src/lib/tanitimSes.js` ve sayfadaki "say" birlikte değişir; ses bir sonraki yayında kendiliğinden yenilenir.

## Asistan

- Sabit metinli sesler (tanıtım vb.) çalışırken üretilmez; derlemede Storage önbelleğinden dosyaya yazılır. Storage açılmazsa hiç üretilmez (her yayında yeniden ücret olmasın).
