## Nerede kaldım
- Ne yiyelim › ⋯ artık "Yemek ayarların" (`src/yemek/ui/FoodSettings.jsx`): Adreslerin (dokun düzenle/sil, Adres ekle), Ödeme (Kapıda kart / nakit; `yemek/me.pay`, sepette varsayılan), Önceki siparişler (dokun aç, Aynısı).
- Yönetim (`/yemek/yonetim`), Restoran ekranı (`/yemek/panel`), Kurye ekranı (`/yemek/kurye`), kurye kaydı (`/kurye-kayit`), `/api/kurye` ve ilgili bileşenler Velora'dan silindi; yönetim Velora Food'da. Ayarlar'daki "Yemek servisi yönetimi" satırı ve girişteki "Kurye olarak kayıt ol" kalktı. Kurye hesabıyla Velora'ya girilirse yalnız "Velora Food'dan giriş yap" + Çıkış.
- firestore.rules değişmedi (Velora Food aynı Firebase'i kullanıyor; kurye okuma kuralları onun için duruyor).
## Sıradaki işler
- Telefonda dene: ⋯ › adres ekle/düzenle, ödeme seç, sepette seçilen ödeme geliyor mu.
## Asistan
- Yemek yönetimi (restoran aç/kapa, kurye, durum değiştirme) Velora'da yok; Velora Food'da.
