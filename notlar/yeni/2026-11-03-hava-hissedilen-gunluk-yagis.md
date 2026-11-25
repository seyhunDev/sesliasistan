## Nerede kaldım

- Seyhun 2026-11-03 hava sayfası ve ana sayfa havası Windy görseli gibi olacak (örnek /mnt/project-files/hava-tasarim/hava-sayfasi-ornek.png, onayı bekleniyor). Önce veri eklendi: Open-Meteo saatlik `apparent_temperature` → `dayHours(...)[i].feel` (hissedilen, yuvarlak; yoksa null), günlük `precipitation_sum` → `days[i].mm` ve `today.mm`. Eski önbellekte bunlar null.
- Bölüşüm: ortak saatlik tablo `src/features/weather/HourTable.jsx`'i ana sayfa tasarım konuşması yazacak ("şimdi" kırmızı çerçeve); hava sayfasını (5 günlük şerit + HourTable) bu konuşma yapacak.

## Sıradaki işler

- Seyhun onaylarsa hava sayfası: üstte 5 günlük şerit (DayStrip), altta HourTable.
