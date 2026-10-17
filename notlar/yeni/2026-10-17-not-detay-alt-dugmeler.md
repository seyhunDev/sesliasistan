## Nerede kaldım

- Not detay sayfası daha kullanışlı (Seyhun: "Not detay sayfasını daha kullanışlı bir hale getirelim"; onaylanan örnek `/mnt/project-files/not-detay/oneri.png`; telefonda denenmedi): işlemler artık yazının altında değil, sekme çubuğunun hemen üstünde sabit tek satır: Yapıldı (yeşil, Arşiv'e gönderir), Sabitle / Sabitli (sarı), Paylaş (telefonun menüsü, Kopyala orada; menü yoksa kopyalar), Sil (kırmızı yazı, 5 sn geri al aynı). Başlık ya da metin değişince bu satırın yerine Vazgeç + Kaydet gelir. Yapılmış/arşivdeki notta "Notlara al", Paylaş, Sil; durum ("Yapıldı 2 gün önce" / "Arşivde") bilgi satırına yazılır. Ayrı Kopyala düğmesi, "İŞLEMLER" başlığı, renkli yuvarlak simgeler, en alttaki "Notu sil", durum kartı ve bilgi satırındaki "Sabit" işareti kalktı. Not kartı geniş (boş yere dokununca metne yazılır); altında tek bilgi satırı: durum · kategori · kim ekledi · ne zaman. Sorumlu ve Bağlı plan satırlarında simge yok. Plan ve görev ekranları değişmedi. `NoteActions.jsx` (alt satır), `AddSheet.jsx` alt çubuk, `EditCard.jsx` not dalı (`noteState`, `whoRow`, `Row` simgesiz olabilir). Kural değişikliği yok.

## Sıradaki işler

- Not detayını telefonda dene: uzun bir notu aç, düğmeler kaydırmadan altta görünüyor mu; metne bir şey yaz, Vazgeç ve Kaydet çıkıyor mu; Sabitle, Paylaş › Kopyala, Yapıldı, Sil. Arşivdeki bir notu açıp "Notlara al".

## Tasarım

- Not detayı (2026-10-17): işlem düğmeleri sekme çubuğunun hemen üstünde sabit (Yapıldı, Sabitle, Paylaş, Sil); değişiklikte yerine Vazgeç + Kaydet. Simge ve ipucu yazısı yok, her bilgi tek yerde.
