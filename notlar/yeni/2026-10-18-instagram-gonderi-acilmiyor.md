## Nerede kaldım

- Eski bir Instagram gönderisi "Gönderi yükleniyor"da kalıyordu (Seyhun: "eski bir gönderi açılmıyor, yükleniyor diyor ama yüklenmiyor"; telefonda denenmedi). Neden: gönderi açılırken fotoğrafı beklenir. Fotoğraf Storage'daysa telefon onu Storage'dan indirir; indirme olmayınca (Storage kuralı yayınlanmamış, kova CORS ayarı, zayıf bağlantı) Firebase kendi kendine 2 dakika yeniden deniyor, sayfa o sürece açılmıyordu. iPhone fotoğraf biçimi (HEIC) neden değil: fotoğraf seçilirken zaten JPEG'e çevriliyor.
- Şimdi: telefon Storage'ı en çok 8 sn bekler, olmazsa fotoğrafı sunucudan alır (`/api/post-photo`, yönetici erişimi; kural ve CORS'tan etkilenmez). Kaydetme yarıda kaldıysa ve gönderide fotoğraf adresi yoksa sunucu aynı gönderinin Storage'daki en yeni fotoğrafını bulur ve gönderiye yazar. Hiçbiri olmazsa gönderi fotoğrafsız açılır, Fotoğraf satırında "Açılamadı, yeniden seç" yazar (`loadPhoto`, `within`, `serverPhoto`, posts.js; `photoLost`, PostEditor).
- Kaydetme sırası düzeldi: yeni fotoğraf yüklenene kadar eski fotoğrafın adresi silinmez; kayıt yarıda kalırsa gönderi eski fotoğrafla açılır (`savePost`).
- Kural değişikliği yok. storage.rules konsolda yayınlanmadıysa yeni fotoğraflar yine Firestore'a düşer; yayınlamak önerilir.

## Sıradaki işler

- Açılmayan gönderiyi yeniden aç: fotoğrafıyla açılmalı. Fotoğrafsız açılır ve "Açılamadı" yazarsa fotoğraf hiç kaydedilmemiş demektir; yeniden seçip kaydet.
