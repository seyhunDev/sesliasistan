## Nerede kaldım

- Takvim sayfası (`/calendar`) ana sayfanın koyu "Sahne" diline geçti (Seyhun 2026-11-25 "Yap"; örnek project-files/takvim-sahne/ornek.html; telefonda/iPad'de denenmedi). `src/features/calendar/CalendarView.jsx` + `calSahne.css`; `main.sh.cal-sh` (sporcu.css: koyu zemin, alt çubuk ve sol menü koyu, `body.sh-body`).
- Üstte yuvarlak düğmeler: geri · Takvim · Ders programı · limon + (Plan, Görev, Doğum günü). Dar büyük ay adı + yıl, Bugün kapsülü, önceki/sonraki ay.
- Ay ızgarası kutuda: telefonda rakam + tür noktaları; seçili gün limon daire, bugün limon halka. iPad (48rem+) hücrelerde 3 ad + "+N daha" (tür rengi sol çizgi; fitness da). Yatay iPad (64rem+) solda ay, sağda seçili gün.
- Seçili gün: dar büyük gün adı, "Bugün · N kayıt"; liste ana sayfadaki plan listesi gibi (saat · tür çizgisi · ad/alt satır · durum); süren plan limon zeminli "Şimdi" (ana sayfadaki kural), fitness Yaptı limon. Altta + Plan (limon) · + Görev · pasta.
- Renk açıklaması satırı kalktı. Ana sayfaya gömülü takvim (embedded/flat) artık hiçbir yerde kullanılmadığı için kaldırıldı; globals.css'teki eski `.cal-*` kuralları silindi.

## Sıradaki işler

- Telefonda ve iPad'de bak: ızgara, seçili gün listesi, + menüsü, açılan pencereler (Plan/Görev pencereleri hâlâ açık renk).
- Ekran testindeki eski `.cal-emb` adımları (asistan-ekran-test/adimlar.mjs) ana sayfa Sahne'ye geçtiğinden beri geçersiz; temizlenebilir.

## Tasarım

- Takvim "Sahne" (2026-11-25): ana sayfanın koyu dili ama sade; tek vurgu limon (seçili gün, süren plan, ana düğme). Tür renkleri yalnız ince çizgi/nokta: antrenman yeşil, yarış mavi, toplantı mor, fitness turuncu, görev kehribar, gecikmiş kırmızı, doğum günü pembe.
