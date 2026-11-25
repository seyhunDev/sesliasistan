# Tehir gösterimi, yükleme ekranı, bekleme ekranı örnek H (2026-11-03)

## Nerede kaldım

- Tehir (Seyhun: "iki ekranda tehir bayrağı ve sebebi; iniş saatini, uyarı işareti saatini göstermeyelim; bir saatlik tehirse geri sayımda göstermeliyiz"):
  - `apText` artık yalnız sebep ve yer ("Rüzgâr yok · Karada"); iniş ve uyarı işareti saati hiçbir ekranda yazılmaz.
  - Tehir süresi belliyse büyük sayaç inişe geri sayar: "Tehir inişine" (clockState, lib/raceLive `plan.ap.down`).
  - Videosuz bekleme: AP bayraklı kutu "Tehir · sebep"; inince "Tehir indi · Start yakında".
  - Videolu yan alan: etikette AP bayrağı + "Tehir" / "Tehir indi" (`.lv-skick.ap`), altında geri sayım adı ve sebep.
- Yayın › Tehir: "İnince" satırı (1 dk sonra geri sayım / Ben başlatırım) → `plan.ap.auto`; tehir çekiliyken takip çubuğunda da değiştirilir. Karada her zaman kapalı. `apLower` auto kapalıyken uyarı işareti kurmaz.
- Hazırlık bayrağı her yarışta değişir: Yayın satırındaki bayrak karesi (#1046).
- Yükleme (Seyhun: "o loading tasarımı yanlış"): sahte iskelet (sıralama paneli, CANLI rozeti) kalktı. Düz zemin, sol üstte geri + yarışın adı (listeden `sessionStorage lv-pre:<id>`), üstte ince kayan çizgi. Son veri `lv-data:<id>` ile saklanır; yarış yeniden açılınca ekran anında son haliyle gelir, arkadan tazelenir.
- Bekleme ekranı örnek H (yayin-tasarim/oncesi-yeni/H-*.png, onay): vitrin dönmez. Solda geri sayım, yarış/grup, (tehir kutusu), Program, rüzgâr şeridi; sağ üstte parkur. Parkur yoksa günler varken beklenen rüzgâr, yoksa rüzgâr grafiği. Yayın'dan "Göster" ile rüzgâr/program seçilirse sağda o.

## Sıradaki işler

- Örnek G (parkur sahnesi sade: eksen çizgisi ve "PİN AVANTAJLI" yazısı yok, tek açıklama kutusu) onay bekliyor; onaylanınca courseScene + test "parkur sahnesinde rüzgâr oku" güncellenir, /canli/ornek verisi yenilenir.
- Telefonda denenmedi.
