## Nerede kaldım
- Yarış multimedya (Medya, Hava, Sonuçlar, Süre) ve antrenman sayacında en alttakiler sabit düğmenin altında kalıyordu: `body[data-dock] main` alt boşluğu (globals.css) sayfanın kendi sınıfını eziyordu, düğme şeridi (Countdown.jsx `Bar`) body'ye taşındığı için `data-pagebar` kuralı da onu görmüyordu. Şeride `data-bar` eklendi; `body[data-dock]:has(> [data-bar]) main` alt boşluğu şerit kadar büyütür.

## Sıradaki işler
- Telefonda dene: Medya sekmesinde en alta kaydır, son fotoğraf satırı düğmelerin üstünde tam görünmeli.
