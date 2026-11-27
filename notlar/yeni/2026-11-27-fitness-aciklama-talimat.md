## Nerede kaldım

- Sorun (Seyhun 2026-11-27): adım adım ekranda sesli anlatım, hareketin açıklamasıyla birlikte İngilizce animasyon talimatını da okudu.
- Sebep (çıkarım, veri okunamadı): Hareketler › hareket › "Kopyala", panoya üç şeyi birlikte koyuyor: ad, açıklama ve İngilizce talimat. Bu metin Açıklama › Düzenle'ye yapıştırılınca hepsi açıklama olarak kaydedildi. Sesli anlatım da açıklamayı okuyor (FitGuided howOf/howSay). Kodda açıklamaya talimat yazan başka bir yer yok; Higgsfield animasyon alımı açıklamaya dokunmuyor.
- Düzeltme: `lib/fitness/howText.js` `cleanHow` talimat kısmını ve baştaki hareket adını atar. Kullanıldığı yerler:
  - kütüphane kaydı (`cleanLib`, `libSetHow`)
  - program hareketi (`cleanItem`)
  - sesli anlatım (FitGuided)
- Kalıcı temizlik: ana hesap Fitness'ı açınca, kayıtlı kütüphanede talimat karışmış hareket varsa temizlenmiş hali bir kez kaydedilir ve programlara taşınır (`libDirty`, useFitLib).
- Telefonda denenmedi.

## Sıradaki işler

- Velora hareketleri ve hazır programlar normal kullanıcılara (örnek onaylandı, yapılıyor).
