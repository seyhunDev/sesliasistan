## Nerede kaldım

- Rüzgâr haritası yeni tasarım (Seyhun: "profesyonel, kullanımı kolay; play tuşu aşağıda kalıyor, harita yüksek, Leaflet/OpenStreetMap yazısı kalksın, daha modern"; örnek `/mnt/project-files/ruzgar-haritasi/ornek.png` onaylandı; telefonda denenmedi): koyu harita (CARTO Dark Matter, ücretsiz, anahtarsız), üstünde şiddete göre yumuşak renk geçişi ve rüzgârla akan beyaz çizgiler (Windy gibi; "Hareketi azalt" açıksa çizgi yok), noktalarda knot sayısı. Harita kısaldı (46vh, en çok 26 rem). Oynat, saat ve kaydırıcı haritanın içinde altta, renk ölçeği hemen üstünde; sol üstte konumdaki rüzgâr (kn, yön, sağanak), sağ üstte + / − ve "i" (konum, kaynak yazısı, Windy, Yenile). Harita altındaki yazılar ve ayrı ölçek kartı kalktı; haritanın altında gün düğmeleri (günün en sert rüzgârı) ve saatlik çubuklar. Hesaplar `fieldOf`, `sampleField`, `rgbOf`, `dayMax` (windMap.js), çizim WindMap.jsx. Kural değişikliği yok, Firestore'a okuma yok. Testleri `test:elle` › "Rüzgâr haritası".

## Sıradaki işler

- Telefonda Rüzgâr haritasını aç: çizgiler akıyor mu, Oynat'ta saatler ilerliyor mu, haritayı kaydırınca renkler yeniden geliyor mu, telefon ısınıyor ya da takılıyor mu. Çizgiler fazla/az gelirse yaz (sayı ve hız WindMap.jsx `SPEED`, parçacık sayısı).
