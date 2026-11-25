## Nerede kaldım

- Sesle parkur hatalara karşı sağlamlaştırıldı (Seyhun 2026-10-30 "parkuru daha çok sesle oluşturacağım, hatasız olması lazım"). 70 gerçekçi ses tanıma cümlesiyle denendi, 14 hata düzeltildi (`src/lib/raceCourse.js`):
  - Yazıyla sayılar: "üç yüz otuz on iki knot" artık 330° 12 knot (eskiden 342 oluyordu); "üçyüz" bitişik; "yüz yirmi derece on beş knot" asistana gidiyor (eskiden gitmiyordu).
  - Tek başına "bir" sayı değil ("bir rüzgar ölçümü 330" 1° olmuyor).
  - "1. şamandıra", "2. şamandıra" (iPhone rakamla yazar), "orsa şamandırası 15" (derece demeden).
  - "bin'den komite", "bin burada" → pin; "12 nat / knat / nod" → knot.
  - "12-15 knot", "12 ile 15 knot" ortalama (13,5); eskiden 12 derece yazılıyordu. Yalnız aralık söylenirse parkura yazmaz.
  - "saat 11'de" derece sanılmıyor; "parkur yönü 320" eksen; "start hattı 52", "hat 52" komiteden pin; "orsa ayağı 1200 metre" tek başına da yazılıyor.
- Sesle geri alma: parkura yazdıktan sonra 3 dakika içinde "geri al", "yanlış", "sil", "iptal" son yazılanı siler (`isler/yarisMedya.js` courseJust, `assistRoute.js` en başta). Süre geçince eski genel "geri al" çalışır.
- Ses tanıma ipucuna (transcribe HINT) parkur sözleri eklendi: rüzgar, knot, derece, eksen, pin, komite, orsa, apaz, şamandıra.
- Testler: `npm run test:ses` içinde 4 yeni grup ("Sesle parkur: …", 44 cümle); yönlendirmede geri alma ve yeni biçimler.

## Sıradaki işler

- "Komite burada", "pin burada" sesle konum işaretleme yok (Saha'dan "burada" düğmeleri 2026-10-29'da kalktı; sonra asistanla yapılacaktı).
- Telefonda yarış gününde gerçek sesle denenmedi.
