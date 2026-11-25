## Nerede kaldım

- Seyhun 2026-10-29: Parkur'dan "Söyle ya da yaz" kutusu ve mikrofon kaldırıldı (sonra ana asistanla yapılacak). Altta yalnız iki büyük düğme var: "Yön ekle" (eski Elle ekle) ve "Pusula". `courseService` / `/api/course-parse` şimdilik kullanılmıyor, asistana bağlanınca işe yarar.
- Yarış Multimedya'nın tüm sekmelerinde üstteki gün şeridi kalktı. Özet'in yanında tek gün düğmesi var: bugünse "Bugün ▾", değilse "30 Eki ▾". Dokununca gün listesi açılıyor (tarih · gün adı · Bugün), altta "Gün ekle". Başlığın altındaki satırda tarih artık tekrar yazmıyor (yer · gün adı). Kod: RaceMedia.jsx, DaySheet.jsx `DayPick`; ekran testi adimlar.mjs `data-cur`.
- Rota kartında "olmalı" artık şimdiki rüzgâra göre: rüzgâr 150 ise pin 60°'de olmalı ("Pin 40° · olmalı 60°", altında "Komite tarafı 20° önde"). Rüzgâr yoksa eksene dik ("(eksene dik)"). Soluk noktalı çizgi de buna göre.
- Kart renkleri temadan geliyor (koyu temada da okunuyor). "10° sağa" yazısı belirgin mavi.
- Görüntüler: /mnt/project-files/yaris-tasarim/parkur/parkur-sade.png, gun-secimi.png.

## Sıradaki işler

- Pusula: telefonun pusula algısı zaten kullanılıyor (manyetik). iPhone Pusula uygulaması gibi gerçek kuzey isterse sapma (Dikili ≈ 5–6° doğu) eklenecek; Seyhun'a soruldu.
- Parkur ölçümünü ana asistandan söyleyerek ekleme (isler/ + yönlendirme testi).
