## Nerede kaldım
- Yarış detayı yeni beyaz görünüm (Seyhun: "üst satır hala çok dolu… tasarımı tamamen değiştir… bundan sonraki yarışla ilgili kısımları bu sade tasarım, buton ve renk anlayışıyla yapacağız"; örnek /mnt/project-files/yaris-detay-sade/yeni-dil/ornek.png onaylı; telefonda denenmedi): lacivert blok kalktı. Üstte "‹ Yarışlar" ve ⋯ (Yayın ⋯ içinde), büyük ad, tek satır bilgi (tarih · yer · kalan gün; yarışta kırmızı nokta + "Yarışta · N. gün"). Hava tek satır (sıcaklık · rüzgâr · kn), dokununca gün satırı ve açık renk saat tablosu; Harita satırı başta kapalı (`RaceWx.jsx` `RaceWxRows`). Sekmeler tek parça seçici (`raceUi.jsx` `RaceSeg`): Takip · Hazırlık · Sporcu · Evrak · Yolculuk; yarış günü de sekmeler sayfada (bölüm penceresi ve ⋯'deki bölüm listesi kalktı). Yarış günü üstü `RaceDayTop` beyaz: büyük "2. yarış · start 12:58", Hava/Harita satırı, bizimkilerin sırası, tek mavi "Yayına git" / "Tüm sonuçlar". Sporcu: satırda tek durum (Tamam / N eksik / Geçersiz), dokununca bilgi penceresi, düğme yok. Yolculuk: Gidiş, Dönüş, Otel, Yarış alanı, Bütçe açılır satırlar (`Fold`). CSS globals.css "YARIŞ SADE" (`main.rz`): eski kartlar ve bölüm başlıkları bu sayfada düz.

## Sıradaki işler
0. Telefonda ve iPad'de yarış detayını aç: Hava ve Harita satırları, sekmeler, Sporcu ve Yolculuk satırları, yarış günü Yayına git.
1. Evrak sekmesi aynı satır düzenine (koyu "Belgeleri hazırla" düğmesi, sarı uyarı kutuları); Takip sekmesi.
2. Yarışlar listesi ve Yayın/canlı sayfaları yeni görünüme.

## Tasarım
- Yarış sayfaları (detay, liste, yayın) "yarış sade" görünümü (2026-11-06): beyaz zemin, lacivert blok ve kart çerçevesi yok, satırlar ince çizgi, sekmeler tek parça seçici, sayfada tek dolu mavi düğme; mavi yalnız iş, yeşil tamam, sarı eksik, kırmızı yaklaşan/geçersiz. Parçalar `src/features/athletes/raceUi.jsx` (Fold, RaceSeg) + globals.css `main.rz`.
