## Nerede kaldım

- Bilgi Yönet (`/bilgi/yonet`) koyu "Sahne" görünümüne geçti (örnek bilgi-ekrani/bas-konus-kose/ornek.html, Seyhun "Yap"): koyu harita (openfreemap dark), koyu alt panel, tek vurgu limon. Pencereler (Sheet) eskisi gibi açık.
- Alt panel: üstte kanal adı · kişi sayısı, durum ve klavye düğmesi; altında sporcu isimleri hep açık. Bir isme dokununca o seçilir, başka isimler eklenir, Hepsi herkesi seçer.
- En altta aynı boyda iki büyük kutu: solda Süre (kutunun tamamı Başlat / Bitir, "4 dk" ile süre seçilir, akarken altta limon ilerleme çizgisi), sağda Bas konuş (limon; üstünde kime gideceği, kayıtta beyaz + süre + ses seviyesi; uzağa kaydırınca iptal).
- Birden çok kişiye gönderme: mesaj ve sesin `to` alanı artık cihaz kimlikleri virgülle (`lib/bilgi.js` toList/isFor); sporcu ekranı listede kendini görürse gösterir/çalar. İletildi/Görüldü durumları seçilenlere göre.
- iPhone yan düğmesi: ses tuşu / Eylem tuşu ile gerçek bas-konuş yalnız uygulama önde ve kamera oturumu açıkken (AVCaptureEventInteraction, iOS 17.2+), Xcode ile yeniden kurulum gerekir. Yapılmadı, sonraki iş.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda ve iPad'de dene: iki kutu aynı boyda mı, isimler iki satırı geçince kayıyor mu, koyu harita yükleniyor mu.
- İstenirse: iPhone ses tuşu ile bas-konuş (yerel kod + Xcode).
- Yönet pencereleri (Parkur, Ekran, Antrenman…) de Sahne'ye geçirilebilir.

## Tasarım

- Yönet ekranı Sahne dilinde: koyu zemin, limon tek vurgu; Süre ve Bas konuş eşit boy iki büyük kutu (Seyhun 2026-11-25).
