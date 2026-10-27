## Nerede kaldım

- Yarış günü ana sayfa (Seyhun "A · Yarışın yeri büyük", örnek onaylandı): seçilen gün bir yarışın günleri içindeyse büyük hava ve rüzgâr grafiği yarışın yerinin (Cockpit `away`, homeTiles `awayRace`, veri raceWeather `loadRaceDay`, görünüm RaceWx `DayChart`). Üstte camgöbeği yer adı (Foça), dokununca yarış sayfası; altta tek satır ev yeri "Dikili · 17° · Kıble 6–10 kn ›", dokununca hava sayfası.
- Yarış yeri ev yerine 10 km'den yakınsa ya da hava alınamazsa eski düzen. raceHome `open` satırlarına yer verisi (spot, Çevre yarış alanı, ilçe, il) eklendi.
- Testler: elle "yarış günü havası", ekran testi "Ana sayfa › yarış günü havası". Telefonda denenmedi.

## Sıradaki işler

- Widget'ta da aynı düzen (büyük rüzgâr yarış yerinin, altta tek satır Dikili): iPhone konusu yapacak, Xcode'da yeniden derleme ister.

## Tasarım

- Yarış günü büyük hava yarış yerinin; ev yeri tek satırda kalır.
