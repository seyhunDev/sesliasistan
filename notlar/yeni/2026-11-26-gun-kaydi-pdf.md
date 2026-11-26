## Nerede kaldım
- Gün kaydı (Seyhun 2026-11-26 "Yap"): Yönet'te yapılan her şey bilgiLog'a yazılır, `by` = yapan antrenör. Yeni türler: ceza { k, to, dev, back }, ceza-off { auto }, not { dur }, video { tags, dur }. Gönderilenler listesi bunları göstermez (loadLog LOG_KINDS).
- Günler › ⋯ › "Gün kaydı" (Günü başlat penceresi ve Kanallar listesi) PDF açar: özet, sporcu özeti, saatli olaylar, sayfa numarası. Paylaş ile kaydedilir. Hesap `src/lib/gunKaydi.js` gunRows, PDF `src/features/bilgi/gunKaydiPdf.js`, veri `loadGunKaydi` (günlük + gün belgesi + izden katılanlar). Test elle.mjs "Gün kaydı".
- Bu tarihten önceki günlerde yalnız mesaj, ses, kalıp ve gelen ses vardır; ceza, not ve video kaydı bugünden başlar.
- Video etiketleri: "Sporcu" satırı eklendi. Önce bugün kanala katılanlar, sonra kulübün etkin sporcuları (ilk 12, +N ile hepsi). Önceden yalnız seçili sporcu geliyordu, liste boştu.

## Sıradaki işler
- Telefonda dene: ceza ver/kaldır, not, video sonrası Gün kaydı PDF'inde görünüyor mu; video etiketinde sporcular geliyor mu.
