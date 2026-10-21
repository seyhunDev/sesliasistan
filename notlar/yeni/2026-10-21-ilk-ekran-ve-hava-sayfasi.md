## Nerede kaldım
- Ana sayfa ilk ekranı tam bir sayfa ("A · tam lacivert", Seyhun 2026-10-21): lacivert kokpit alt sekme çubuğuna kadar uzar; içinde hava, rüzgâr grafiği, sıradaki iş, iş düğmeleri (yarı saydam, ana iş beyaz) ve en altta büyük günler (HomeDays.jsx, bugünden 7 gün). Güne dokununca sayfa takvim listesine kayar (#takvim).
- Sayfa en üstteyken alt sekme çubuğu ve asistan düğmesinin zemini de lacivert (body[data-ck-top], globals.css); aşağı kayınca açık rengine döner.
- Takvimdeki küçük gün şeridi (WeekStrip) ve güne dokununca açılan pencere (DayPick: yoklama, fitness) kaldırıldı; günler artık kokpitte. homeTiles.js'teki trainingWeek/dayInfo testler için duruyor.
- Hava sayfası ana sayfayla aynı: lacivert üst kısım (geri, yer, yenile, büyük sıcaklık, şimdiki rüzgâr, CockpitWind grafiği), büyük gün seçici (dokununca grafik o güne geçer), "Saat saat" listesi, MGM / Windy, kaynak satırı (WeatherTop.jsx). Eski WeatherDetail silindi; DayDetail (yarış multimedya Hava) duruyor.
- CockpitWind `date` alır: başka günde "şimdi" çizgisi çıkmaz, ölçüm o günün.
- Telefonda denenmedi.

## Sıradaki işler
- Seyhun DayPick penceresini (günün yoklaması / fitness) geri isterse: büyük güne uzun basınca ya da Takvim sekmesinde.
- Hava sayfasında saat seçme (eski grafikteki parmakla saat seçimi ve "Şimdi") gerekirse CockpitWind'e eklenir.
- Aynı kokpit/liste kalıbı diğer sayfalara.

## Tasarım
- İlk ekran tam bir sayfa: lacivert kokpit + iş düğmeleri + büyük günler; en üstteyken alt çubuk da lacivert. Hava sayfası aynı lacivert kokpit.
