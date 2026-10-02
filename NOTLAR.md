# Notlar

Telefon ve bilgisayar arasındaki köprü. Her yeni sohbet veya oturum önce bunu okur; iş bitince "Nerede kaldım" güncellenir.
Kalıcı konu bilgisi (tasarım, asistan) thread'lerde değil burada durur.

## Nerede kaldım

- Son işler: ders programı düzenleme (çalışan/öğrenci dersini silebilir, tüm programı sil), asistan çubuğu açılıştan sonra alttan yükselir, ana ekran uygulamasında alt boşluk kısaldı.

## Sıradaki işler

1. Asistan Sahnesi 2. adım: sayfada arka plan vurgusu / hayalet taslak.
2. Asistan Sahnesi 3. adım: mesajda hayalet balon.

## Tasarım

- Yeşil "Ufuk" tasarımı: tek asistan görünümü, standart alt çubuk (`src/features/home/TabBar.jsx`), yeni logo ve açılış (`src/components/ui/AppLogo.jsx`, `Splash.jsx`).
- Asistan çubuğu her sayfada aynı; küre iPhone'da yuvarlak kalmalı. Durumlar yazıyla değil küre animasyonuyla gösterilir.
- Sade: hazır öneri/kısayol düğmeleri, selam ve gün özeti asistan sahnesinden kaldırıldı; geri eklenmez.
- iPhone PWA'da güvenli alan (alt pay) ve klavye davranışı hassas; değişiklikten sonra telefonda dene.

## Asistan

- Yapay zeka öncelikli. Kullanıcı susunca `src/lib/precue.js` anında kısa ön cevap ve taslak verir; yapay zeka cevabı akış halinde gelir ve ön cevabı tekrar etmez.
- Yerel kurallar: `src/lib/assistantLocal.js`, `src/lib/ai/rules.js` (testleri `npm test`).
- "Kaydettim" yalnız yazma onaylandıktan sonra söylenir.

## Mac ↔ telefon

- Telefonda: Claude projesinde iş başına yeni thread aç; iş GitHub'a PR olarak gelir. PR birleşince Mac'te `git pull`.
- Mac'te: her iş için yeni oturum ya da `/clear`. Proje özeti gerekmez, Claude Code kodu kendisi okur.
- Proje özeti (`node scripts/proje-ozeti.mjs`) yalnız repoya erişimi olmayan bir sohbete verilir; kısa sürümü yeter.
