## Nerede kaldım

- Canlı ekran (sol-alt örneği onaylandı 17:10): start kartı üst ortadan kalktı, sol altta rüzgârın hemen üstünde (`GStart`; yarış öncesi büyük süre + yarış/grup/sınıf, yarışta küçük `GClock` bandı). Tehir, genel geri, gün bitti, bitti, yarış yok durumları da aynı kartta (rozet rengi kırmızı/turuncu). Üst orta videoya kalır.
- Start dizisinde sağdaki dizi kartı yok; bayraklar start kartının içinde sade 5·4·1·0 şeridi (`seqStrip`), sağda program.
- Kart başlıkları canlı: solda renkli eğik kesimli rozet (`GCard tone`: pembe, t turkuaz rüzgâr, y sarı parkur/rota/sonuç, r kırmızı, o turuncu). Sağ altta yarış adı | Velora işareti (`VeloraGlyph`).
- Yarış öncesi akış (yalnız bekleme, ilk start'a kadar): beklenen rüzgâr (ortak saatlik tablo rüzgârın yanında açılır, geçmiş saatler soluk) → parkur → rota (`GRoute`) → program. Veri olmayan adım atlanır. `lib/raceRounds` `PRE_STEPS`, `preStep`, `preMove`; courseShow'a `sec`, `pre`, `hold` eklendi.
- Yayın › Video › Ekranda göster: "Yarış öncesi gösterim" Otomatik (8/12/20/30 sn, döner) ya da Elle; her adım açılıp kapanır; Geri · Durdur/Sürdür · İleri.

## Sıradaki işler

- Telefonda denenmedi. Otomatik akış sürekli döner (program sonda kalmaz); istenirse "bir tur sonra programda kal" eklenebilir.
