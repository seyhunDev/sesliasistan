# Bekleme ekranı: sade zemin, rüzgâr tahmini grafiği, sebepli tehir (2026-11-01)

## Nerede kaldım
- Seyhun: "zemin hoşuma gitmedi (dandik parkur); start'a geri sayımda parkur, beklenen rüzgâr, gün boyu grafik; ekranda neler bulacağımız; yönetimden sebep belirterek tehir (bir saatlik)."
- Zemin `Sea`: parkur çizgisi kaldırıldı, dalga deseni daha soluk.
- `/api/canli` `forecast`: yarış yeri (spot, yoksa kayıtlı tahmin yeri) için Open-Meteo saatlik rüzgâr (kn), 30 dk bellek. Bekleme ekranında `WindDay` grafiği (06–20, dolu çizgi rüzgâr, kesik sağanak, 3 saatte bir saat + yön oku, start saati pembe çizgi, şimdi kesik beyaz), yanında bugünkü parkur (ölçüm varsa), altta "ekranda neler" şeridi.
- Tehir: `plan.ap { from, why }` (`cleanPlan`), `apText`, `AP_MIN`/`AP_WHY`/`addMin` (lib/raceLive.js). Yayın'da "Tehir" → Süre (30 dk, 1 sa, 1.5 sa, 2 sa, Belirsiz) + Sebep (Rüzgâr yok, Çok rüzgâr, Yağış, Fırtına, Diğer) → Ertele: yeni saat `at`, eski saat `ap.from`; "Erteleme kalktı" eski saati geri getirir. Ekranda "Ertelenen start'a" + "Start 12:00'a ertelendi (11:00) · Rüzgâr yok".
- Görüntüler project-files/samandira-donus/yayin3/bekleme2-*.png, tehir-*.png.

## Sıradaki işler
- Telefonda deneme; yarış yeri (spot) yoksa grafik gelmez (yarış sayfasında Hava'dan yer seçilmeli).
