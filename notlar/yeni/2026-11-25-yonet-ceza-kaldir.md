## Nerede kaldım

- Sporcu ekranında ceza yazısı küçük çıkıyordu: bilgi.css'te `var(--lv-font-c)` bu sayfada tanımlı değil, `font` kısaltması geçersiz sayılıp büyük boyut düşüyordu. bilgi.css'teki tüm `--lv-font-c` kullanımlarına yedek yazı tipi eklendi; ceza yazıları da büyütüldü (tam ekran: büyük 360°/720°/FD, altında 2–3,5 rem talimat; sonra kalan şerit daha büyük).
- Yönet: cezalı her sporcu panelde kırmızı/sarı düğme ("720° Ada ✕"); dokununca ceza hemen kalkar, 5 sn "Geri al". Haritadaki rozet de "720° ✕" ve dokununca kaldırır.
- Telefonda denenmedi.

## Sıradaki işler

- Başka dosyalarda `var(--lv-font-c)` yedeksiz 38 yer var (canlı ekran sayfaları; orada değişken tanımlı olabilir), gerekirse kontrol.
