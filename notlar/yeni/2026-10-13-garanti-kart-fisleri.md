## Nerede kaldım

- Garanti kart harcaması mailleri fiş oluyor (Seyhun: "Garanti'den harcama maili geliyor, uygulama okuyup fişe eklesin, ben bir daha fiş çekmek istemiyorum; sonra ödendi işaretlerim"). Gerçek Garanti mailiyle ve telefonda denenmedi. Okuma uydurma örneklerle test edildi.
  - Yol İş Bankası'yla aynı: Gmail betiği maili `orgs/{uid}/mails`'e yazar. `/api/mail/push` (ya da 5 dakikalık `sendMailDigests`) Garanti mailini okur ve `orgs/{uid}/receipts/g-{mail id}` fişini açar. Belge kimliği mailden geldiği için aynı mail iki kez fiş olmaz (`runGaranti`, `src/lib/garanti.js`).
  - Okunanlar: işyeri, tutar, tarih, saat, kartın son 4 hanesi. Cümle biçimi ("1234 ile biten kartınızla … MIGROS işyerinden 245,90 TL") ve etiketli biçim ("İşyeri: / Tutar: / Kart No") okunur (`spendOf`).
  - Yerelde okunamayan harcama mailini yapay zeka okur (`src/lib/ai/garantiAi.js`). Tutar ve işyeri mailde geçmiyorsa yanıt alınmaz (`fromAi`).
  - İade, iptal, reddedilen işlem, ekstre ve doğrulama mailleri fiş olmaz.
  - Gönderen: Hesaplar › Mail ayarları › "Garanti BBVA'yı takip et" iki alan adını ekler: garantibbva.com.tr ve garanti.com.tr (`GARANTI_SENDERS`). Betiği yeniden kopyalamak gerekmez.
  - Fiş her zaman "ödeme bekliyor" açılır, kendiliğinden ödendi yapılmaz.
    - Ödeme şekli Kart. Kategori işyerinden tahmin edilir (`catGuess`). Ekleyen "Garanti BBVA". Notta "Garanti ·1234".
    - Yabancı para birimli harcama "kontrol" durumunda gelir, notunda tutar ve birim yazar.
- Fişte yeni alan `scope`: "personal" (Kişisel) ya da "club" (Kulüp). Alanı olmayan eski fişler Kulüp sayılır.
  - Garanti fişleri Kişisel başlar. Elle eklenen fiş Kulüp başlar.
  - Fiş ekranında tek dokunuşla Kulüp / Kişisel seçilir. Düzenleme formunda ve Fişler süzgecinde de var, listede "Kişisel" yazar. `/receipts?scope=kisisel` Kişisel süzgeciyle açılır.
  - Garanti fişi Kulüp yapılınca o kartın son 4 hanesi `users.cardScope` alanına yazılır. O karttan sonraki harcamalar da Kulüp gelir (`setReceiptScope`, DataProvider).
  - Kişisel fişte "Öde" yerine tek "Ödendi" düğmesi var (`paidVia: "card"`); kulüp kasasına dokunmaz. Kulüp fişinde eskisi gibi Nakit (kasadan düşer) / EFT.
- Hesaplar › Kişisel'e "Kart harcamaları" satırı eklendi: bu ayın kişisel fiş sayısı, toplamı ve ödeme bekleyenleri gösterir, dokununca Kişisel fişler açılır (`personalReceipts`, receipts.js).
- Bildirim: "Kart harcaması: MIGROS DIKILI · 1.245,90 TL · ödeme bekliyor". Dokununca Fişler açılır.
- Asistan komutları: "son Garanti fişini kulübe al", "Migros fişini kişisel yap", "F-0012 fişini kulüp fişi yap" (`receiptScopeCommand`, assistMore.js; `receiptScopeCmd`, isler/para.js). "… fişini ödedim" kişisel fişte kasaya dokunmaz.
- Kural değişikliği yok. Yeni ortam değişkeni yok. Firestore'a yeni okuma yalnız Garanti maili gelince yapılır: fiş başına bir okuma, aynı fiş var mı diye.
- Testler: `test:elle` › "Garanti kart harcaması (fiş)", `test:asistan` › "Fiş Kişisel / Kulüp (sesle)".

## Sıradaki işler

0. Garanti'yi dene:
   - Garanti BBVA uygulamasında kart işlem bildirimleri için e-postayı aç. E-posta adresi betiğin kurulu olduğu Gmail olmalı.
   - Hesaplar › Mail ayarları › "Garanti BBVA'yı takip et".
   - Kartla küçük bir harcama yap. Birkaç dakika içinde Fişler'de "ödeme bekliyor" Kişisel fiş ve bildirim gelmeli.
   - Fiş gelmezse ya da işyeri veya tutar yanlışsa Hesaplar'daki mail kutusunda Garanti mailinin metnini (kart no ve adı silerek) yeni threade ver; okuma kalıbı eklenir.
   - Gönderen adresi farklıysa (ör. başka bir alan adı) Mail ayarlarından elle ekle ya da adresi yeni threade yaz.
