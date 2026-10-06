## Nerede kaldım

- Ana sayfa özetindeki yarış ve açık fatura okumaları artık açılış ekranı sürerken başlar (Seyhun: "uygulama başlarken zaten loading gösteriyoruz, o sırada özet alınamaz mı"; telefonda denenmedi): DataProvider profil gelince `prefetchRaces` (raceHome.js) ve ana hesapta `prefetchOpen` (openInvoices.js) çağırır; ana sayfa açılınca aynı istek kullanılır, okuma sayısı artmaz, açılış ekranı uzamaz. Banka mailleri, planlar, fişler zaten canlı dinleniyor; aidat açılışta ve uygulamaya dönünce okunur.
- Anlık güncelleme durumu: Banka (mailler), Antrenman (planlar), Fiş harcaması canlı; Aidat uygulamaya dönünce; açık faturalar 3 dakikada bir ve uygulamaya dönünce (Faturalar sayfasında değişince hemen); yarışlar 5 dakikada bir (yarış kaydedince bu cihazda hemen değil, en geç 5 dk); Instagram özeti Instagram sayfası açılınca.

## Sıradaki işler

- Uygulamayı kapatıp aç: ana sayfa gelince Sıradaki yarış ve Fiş / Fatura kartlarında iskelet ya hiç çıkmamalı ya da çok kısa görünmeli.
