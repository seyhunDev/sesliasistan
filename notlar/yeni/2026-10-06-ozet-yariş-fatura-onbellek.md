## Nerede kaldım

- Ana sayfa ÖZET'te yükleniyor iskeleti neden yalnız Sıradaki yarış ve Fiş / Fatura'da çıkıyordu (Seyhun: "neden iki tanesi loading gösteriyor, diğerleri normal"; telefonda denenmedi): diğer kartların bilgisi cihazda saklıydı (Aidat ve Instagram özeti localStorage, Banka mailleri Firestore önbelleği, Antrenman açılışta zaten yüklenen planlar), son bilinen bilgi hemen görünüyordu. Yarış ve açık faturalar yalnız bellekteydi, uygulama her açılışta yeniden okuyordu. Artık bu ikisi de bu cihazda saklanır (`sa-home-sum` › `race`, `inv`, HomeSummary.jsx); aynı gün içindeki açılışlarda son bilinen bilgi hemen görünür, okuma bitince güncellenir. Ertesi gün "5 gün kaldı" gibi yazılar yanlış olmasın diye günün ilk açılışında iskelet bir kez çıkar. Firestore'a ek okuma yok.

## Sıradaki işler

- Uygulamayı kapatıp aç: aynı gün ikinci açılışta özetteki hiçbir kartta iskelet çıkmamalı; günün ilk açılışında yalnız Sıradaki yarış ve Fiş / Fatura kısa süre iskelet gösterebilir.
