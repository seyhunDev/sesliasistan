## Nerede kaldım

- Sesle yemek siparişi (ana hesap): "yemek siparişi ver" / "ne yiyelim" → geçmişe ve beğenilere göre 3 öneri, "Hangisini vereyim?"; "ilkini / ikincisini ver", "evet" (3 dk içinde) → o sipariş.
- "Sen seç sipariş ver" → en iyi öneri hemen; "Pizza Rüzgar'dan karışık söyle", "dün söylediğimden sipariş ver", "kulübe pizza söyle" → o, hemen.
- Hemen sipariş: restoran sayfası sepetle açılır, 3 sn çizgi dolar, kendiliğinden verilir (İptal / Şimdi; CartSheet `hemen`, `adres`). Seyhun 3 sn çizgiyi seçti (sesli onay değil).
- En az sipariş tutmazsa ya da adres yoksa sepete konur, sayfa açılır. "pizza yedim" Fitness › Beslenme'de kalır; "Ali'ye pizza söyle" mesajdır.
- Kod: `src/yemek/voice.js` (foodOrderAsk, planVoiceOrder), `src/features/assistant/isler/yemek.js`, yol `foodOrder` (lib/assistRoute.js, EARLY), `store.js` orderNow/loadFood.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: "yemek siparişi ver", "sen seç sipariş ver", "ilkini ver".

## Asistan

- Yemek siparişi yerelde çalışır (yapay zekaya gitmez), yalnız ana hesap. Para işi olduğu hâlde onay kartı yerine 3 sn geri sayım (Seyhun 2026-10-23).
