## Nerede kaldım
- Hava grafiği (hava penceresi, hava kartı, yarış multimedya Hava sekmesi: hepsi `DayDetail`): grafikte gezinince seçili saat satırının sağında "Şimdi" düğmesi çıkar, tek dokunuşla şu anki saate döner (yalnız bugünde).
- Saatlik/günlük sütunlar (`parts.jsx` `Col`; hava penceresi 3 saatlik satır, hava kartı, yarış havası): rüzgâr ve sağanak yan yana "4–12" (sağanak soluk). Yön oku sayının üstünde.
- Yarış › Çevre › Yarış havası başlığında yer adı: "YARIŞ HAVASI · Foça". Kaynak: yarış alanı bulunduysa orası, yoksa yarışın ilçesi (`racePlace`); Dikili değil.
- `DayDetail` yeni `place` alanı alır (en üstte kalın yazılır). Multimedya Hava sekmesi şimdilik yeri grafiğin altında küçük yazıyor; o sohbet `place={wx.place}` geçerse üstte görünür.
- Telefonda denenmedi.

## Sıradaki işler
- Multimedya sohbeti `WeatherTab`'da `place` geçsin (koordinatöre iletildi).
- Gerçekleşen (ölçülen) rüzgâr verisi önerisi Seyhun'un onayını bekliyor (İzmir havalimanı ölçümü ya da kulüpte rüzgâr ölçer).
