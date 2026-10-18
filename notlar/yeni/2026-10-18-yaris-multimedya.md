## Nerede kaldım
- Yarış multimedya sayfası (Seyhun: "multimedyayı ayrı bir sayfa olarak yapalım"; onaylı örnek /mnt/project-files/yaris-tasarim/multimedya/sayfa.png; telefonda denenmedi): `/athletes/races/<id>/media`, sekmeler Hava · Süre · Sonuçlar · Medya. Ana sayfadaki "Sıradaki yarış" kartında ve yarış sayfasının üst kartında "Multimedyayı aç".
  - Hava: yarış yerinin o günkü saatlik tahmini, hava sayfasının DayDetail grafiğiyle aynı (raceWeather.js `loadRaceDay`, 1 saat bu telefonda saklanır). "Rüzgar yaz" (8 yön, knot, saat şimdi, sağanak isteğe bağlı) grafikte içi boş nokta olur; DaySheet.jsx WindChart'a `marks` eklendi.
  - Süre: antrenman sayacı ortak (Countdown `mode="start"`, hazır 1/2/5 dk): başlatınca, 4:00 ve 1:00 kala orta bip, son 10 sn her saniye kısa, 0'da uzun (lib/raceLive.js `beepAt`). Antrenman sayacı eskisi gibi (son 5 sn). Sayaç 0 olunca günün sıradaki yarışı start saati ve son elle yazılan rüzgârla kendiliğinden yazılır; yarışa dokununca saat, parkur, bayrak, not.
  - Sonuçlar: Genel (sonuç PDF'inden bütün liste: kulüp, doğum yılı, net puan; bizimkiler yeşil; ilk 10 + Tümü; sınıf ve Genel/Junior/Bambino/Kızlar) ve Bizimkiler. Yükleme yarış sayfasındakiyle ortak (resultsImport.js); yapay zeka artık `born` ve `pts` de okur. Eski yüklenen PDF'lerde genel liste yok: yeniden yüklemek gerekir.
  - Medya: Fotoğraf (1600 px) ve Video (960 px'e küçültülür, sessiz, en çok 3 dk) kamerayla çekilir, Storage `orgs/{org}/raceMedia/{id}`; çekildiği saate göre yarışın altında gruplu; dokununca büyük, Paylaş / Sil.
  - Kayıt: `orgs/{org}/raceLive/{yarışId}` (wind, starts, media) ve `.../sheets/{belgeId}` (genel liste); yarış belgesinden ayrı, yarış silinince bunlar da silinir. Rüzgâr kaydında `src` alanı ("elle" ya da ileride cihazın adı) var: cihaz verisi aynı grafiğe düşer.
  - Asistan: "rüzgar 15 knot kuzeybatı" (bugün süren ya da açık yarışa yazar), "5 dakikalık sayacı başlat" (yarışın Süre sekmesini açar; yarış yoksa antrenman sayfası). isler/yarisMedya.js, yönlendirme testleri.
- storage.rules değişti (raceMedia): Seyhun konsolda yayınlamalı, yoksa fotoğraf/video kaydedilmez.

## Sıradaki işler
0. Telefonda dene: ana sayfadan Multimedyayı aç; Hava'da rüzgâr yaz; Süre'de 1 dk sayaçla bipleri dinle (iPhone sessiz modda ses çıkmaz), 0'da yarış satırı çıkıyor mu; Medya'da video çek ve boyutu; Sonuçlar'da PDF yükle.
1. Seyhun örnek sonuç PDF'i gönderecek: okuma (kulüp, doğum yılı, puan) ona göre ayarlanacak.
2. Önerilip sonraya kalanlar: gün sonu özet kartı (veliye/Instagram), fotoğraf/videoya sporcu etiketi, video sesi.
3. Antrenman sayacında da yarış start dizisi istenirse Countdown'a `mode="start"` vermek yeter (Seyhun'a soruldu).

## Asistan
- Yarış günü: "rüzgar <knot> <yön>" rüzgâr kaydı, "<n> dakikalık sayacı başlat" start sayacı (yerel, yapay zekasız).
