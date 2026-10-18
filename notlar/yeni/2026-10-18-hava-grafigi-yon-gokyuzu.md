## Nerede kaldım

- Hava grafiğinde rüzgâr yönü ve gökyüzü (Seyhun: "grafiğin üstünde her saat rüzgâr yönü, hava açık mı kapalı mı bulutlu mu; grafik olarak kalmalı"; örnek `/mnt/project-files/hava/grafik-yon-gokyuzu.png` onaylandı; telefonda denenmedi): hava penceresindeki rüzgâr grafiğinin üstünde her saat rüzgârın estiği yöne bakan ok (17 kn ve üstü turuncu), altında ince gökyüzü şeridi: sarı açık, açık sarı az bulutlu, gri parçalı, koyu gri kapalı, mavi yağmur; yağmur ihtimali %30 üstü açık mavi, %50 üstü mavi, %70 üstü koyu mavi. Seçili saatin satırında gökyüzü ve yağmur ihtimali (%10 ve üstü) yazar. Yağmur ihtimali Open-Meteo `precipitation_probability`, saatlik listede 8. alan (`skyBand`, `dayHours` `rain`, weather.js; `WindChart`, DaySheet.jsx). Ana sayfadaki küçük grafik değişmedi. Eski önbellekte yağmur ihtimali yok, hava yenilenince gelir. Kural değişikliği yok.

## Sıradaki işler

- Telefonda hava penceresini aç: oklar yönü doğru gösteriyor mu (kuzeyden esen rüzgârda ok aşağı bakmalı), şerit renkleri ayırt ediliyor mu.
