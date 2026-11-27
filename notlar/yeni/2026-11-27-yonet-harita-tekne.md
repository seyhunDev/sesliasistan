## Nerede kaldım
- Yönet haritası (TekneMap): sporcular nokta yerine Velora Sailing Optimist çizimi (public/tanitim/engine.js + boat-draw.js, tanıtımla ortak, ilk açılışta yüklenir; yüklenemezse eski nokta), yönüne (bilgiTekne.hdg) dönük, rüzgâr parkurdan (yoksa orsa sayılır). Renk tekne kimliğine göre sabit (grup rengi veride yok). Uzaklaşınca (zoom < 14) yönlü küçük ok, ad yalnız cezalı/konuşan teknede.
- Sen: bu telefonun konumu (watchPosition, yalnız ekranda, hiçbir yere yazılmaz) büyük beyaz antrenör botu + mavi halka + "Sen". Geri oynatmada yok.
- Örnek: https://claude.ai/artifact/MMDJDf6thqn7VwVuhefoLg

## Sıradaki işler
- Denizde telefon/iPad kontrolü (boyut, yön, konum izni).
- Grup rengi (yarıştaki grubu sporcuya bağlamak) istenirse.
- public/tanitim/engine.js ya da boat-draw.js taşınırsa TekneMap'teki yol güncellenmeli.
