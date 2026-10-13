## Nerede kaldım

- Kasadan fişle nakit çıkış (Seyhun: "fişin fotoğrafını çekerim, hesaplarda kullanırsak ödendi olarak geçirelim ve nakit çıkışı olsun"; telefonda denenmedi): Hesaplar › Kulüp › Kasa › "Nakit çıkış" artık iki seçenek sorar: "Fiş fotoğrafıyla" ve "Elle yaz". Fotoğrafla açılan fiş ekranı (başlık "Fişle nakit çıkış") ödeme şeklini Nakit getirir ve "Ödendi mi?" sorar (varsayılan "Ödendi · kasadan düş"). Kaydedince fiş Fişler'de ödendi (nakit) görünür, kasaya aynı tutarla "Fiş" çıkışı yazılır (`src: rc:<id>`, `saveReceipt(…, { kasa })`, DataProvider); "Henüz ödenmedi" seçilirse fiş ödeme bekliyor kalır, kasaya yazılmaz. Fişin tutarı ya da kişisel/kulüp seçimi sonradan değişirse kasadaki çıkış da güncellenir (`setCashFor`), fiş silinince ya da ödeme geri alınınca kalkar (#321). Kasa sayfası değişince kendiliğinden yenilenir (`sa-cash-saved` olayı). Asistan: "kasadan fişle çıkış yap", "fişle nakit çıkış yap", "fişi kasadan öde" kamerayı bu kipte açar (yalnız ana hesap; `kasaReceipt`, assistantLocal.js). Fatura için ayrı fotoğraf yolu yok: nakit ödenen fatura, faturanın "Nakit ödendi" düğmesiyle kasadan düşer. Kural değişikliği yok. Testleri `test:asistan` › "Fişle kasadan çıkış", yönlendirme › receiptCam.

## Sıradaki işler

- Hesaplar › Kasa › Nakit çıkış › Fiş fotoğrafıyla: bir fişin fotoğrafını çek, kaydet; Kasa'da çıkış, Fişler'de "Ödendi" görünüyor mu bak.
- Kasa kartının yeni düzeni Seyhun'un onayını bekliyor (aylara göre hareketler, simgeler, süzgeç).
