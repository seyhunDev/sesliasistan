## Nerede kaldım

- Rüzgâr grafiğinin yağış şeridi artık ölçülen ve beklenen yağmuru ayırıyor (Seyhun "B · Tek satır"): ölçülen yağmur istasyon raporundan (SYNOP 6RRRt, çoğunlukla 3/6 saatlik toplam) o saatleri kaplayan DOLU kutu; beklenen yağmur içi boş, kesik çerçeveli kutu. İstasyon yağmur bildiriyorsa şimdiden önceki tahmin kutuları çizilmez.
- Şimdi çizgisinde "← ölçülen | tahmin →" (kenara sığmazsa o yan çıkmaz), grafiğin altında açıklama satırı: Rüzgâr, Sağanak, Ölçülen rüzgâr, Ölçülen yağmur, Beklenen yağmur (yalnız grafikte olanlar).
- `src/lib/windObs.js`: `synopRain` → satırda `rain { mm, h }` (990 = iz/0, 991–999 = 0,1–0,9 mm). `CockpitWind.jsx`: `obsRain` (kısa süreli rapor önce, üst üste binen atlanır). Ana sayfa, Hava ve yarış sayfasında aynı.
- Testler: elle "ölçülen yağış", ekran testi "Hava › ölçülen / beklenen yağmur" (saate göre beklenti). Telefonda denenmedi.

## Sıradaki işler

- Telefonda bakıp ayrımın ilk bakışta anlaşıldığını Seyhun'a sor.

## Tasarım

- Yağış şeridinde dolu kutu = ölçülen, içi boş kesik çerçeve = beklenen; grafiğin altında yalnız grafikte olanların açıklaması.
