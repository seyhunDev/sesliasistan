## Nerede kaldım

- Hesaplar (/mail) sade düzene geçti (Seyhun onayladı, "yap"). Üstte tek kart: Kulüp toplam (banka + kasa), altında "Banka … ₺ · Kasa … ₺"; dokununca gösterilen banka hesapları seçilir. Kişisel sekmesinde bu kart kişisel gelir − gider olur.
- Beş sekme: Banka · Kasa · Fişler · Borçlar · Kişisel. Her sekme aylara göre tek liste (ay başlığında +giren · −çıkan), satır = başlık + gün · açıklama, sağda tutar + durum; dokununca ayrıntı penceresi. Her sekmenin tek ekleme düğmesi alt çubuğun üstünde.
  - Banka: "Ad ya da açıklama ara"; aranan kişinin toplamı üstte (En çok ödeyenler ve Kişiler bölümü kalktı). Durum: Kasaya geçti / Kişisel / tür. Hareket penceresinde "Bu kişinin bütün hareketleri".
  - Kasa: sayılan nakitler; "Kasaya sayılmayan girişler" ve "Arşiv" kapalı başlık, satıra dokununca Kasaya ekle / Arşivle / Arşivden çıkar. Ekle: Nakit giriş · Fişle çıkış · Elle çıkış.
  - Fişler: önce "Ödenecek" (ödenmemiş faturalar + ödeme bekleyen kulüp fişleri), sonra ayların fiş ve faturaları (Kasadan / Kartla / Bankadan / Fatura ödendi). Altta "Filtre ve Excel" → /receipts. Faturalar sekme ilk açılınca okunur.
  - Borçlar: Geri gelecek (kulüp + kişisel, Kulüpten/Kişisel etiketi), Benim borcum, Ödenenler kapalı. Ekle: Borç verdim · Borç aldım. /debts ve asistan "Borçlar" artık /mail?tab=borc açar.
  - Kişisel: kendi gelir/gider, bankadan aldıkların (Seyhun Yıldız hesabı), kişisel kart fişleri tek listede.
- Gelen mailler, Gmail durumu ve banka defteri kartı Mail ayarlarına (/mail/setup, Hesaplar'da sağ üstte "Ayarlar") taşındı (src/features/mail/MailInbox.jsx).
- Dosyalar: src/app/(app)/mail/page.jsx, src/features/bank/HesapViews.jsx, src/lib/hesapRows.js (test elle.mjs "Hesaplar sekme listesi"). CashBook.jsx ve LentSection silindi.
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun telefonda beş sekmeyi denesin; banka satırlarında tür yoksa işlem tipi (Havale, EFT…) yazılıyor, "Türü yok" uyarısı konmadı (düzeltecek bir düğme olmadan amber uyarı gereksiz).

## Tasarım

- Hesaplar: her sekme tek liste, aylara göre; satır = kayıt + durum; tek ekleme düğmesi alt çubuğun üstünde; kurulum, mail ve defter Ayarlar'da.
