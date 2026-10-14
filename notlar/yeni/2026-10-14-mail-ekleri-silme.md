## Nerede kaldım

- Banka maillerinin Excel ekleri artık saklanmıyor, veri kaybı olmadan siliniyor (Seyhun: "veri kaybı yaşamadan hepsini silelim"; telefonda denenmedi). Bakiye, aidat, fatura ve banka defteri zaten yalnız ekten çıkarılan tabloyu (`sheets`) ve banka defterini kullanıyordu; ek yalnız "eki indir" için duruyordu, orijinali Gmail'de.
  - Ek silinmeden önce yeniden okunur (en çok 5000 satır, `MAIL_ROWS`); yalnız her ek başlıklı tabloyla tam okunduysa ve satır sınırına dayanmadıysa silinir (`rawDone`, mailParse.js). Okunamayan ek (PDF, bilinmeyen biçim) Storage'da kalır.
  - Yeni mailler: sunucu (`/api/mail/push` ve 5 dakikalık zamanlayıcı) tabloyu yazıp eki aynı anda siler (`patch(…, drop)`, firestoreRest.js; `FieldValue.delete`, plan-reminders.mjs).
  - Eski mailler: Ayarlar › Telefondaki veriyi taşı. Maildeki ek temizlenir; önceden Storage'a konmuş ekler indirilip yeniden okunur, tablo yazıldıktan sonra Storage'dan silinir (`cleanStoredMail`, `moveAllMailFiles` → `kept`, mailFiles.js). Sonuçta "N mail eki silindi (tablosu kayıtlı)", okunamayan varsa "N ek okunamadığı için Storage'da saklandı".
  - Kural değişikliği yok. Testi `test:elle` › "Mail eki silme (veri kaybı yok)".

## Sıradaki işler

- Yayından sonra Ayarlar › Telefondaki veriyi taşı'ya bir kez bas; sonra Hesaplar'da bakiye, Aidatlar ve Gelen ödemeler eskisi gibi mi bak.
- "Storage'da saklandı" sayısı yüksekse (Storage indirmesi tarayıcıda CORS ister) yeni threade yaz.
