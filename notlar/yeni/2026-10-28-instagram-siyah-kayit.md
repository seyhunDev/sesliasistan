## Nerede kaldım
- Instagram gönderisi: Paylaş › "Görüntüyü kaydet" siyah görsel kaydediyordu. Neden: paylaşılacak dosya önizleme çizilmeye başladıktan 400 ms sonra alınıyordu; yazı tipi geç yüklenince (iPhone uygulaması, ilk açılış) çizim bitmemiş, boş tuval JPEG'e siyah 300×150 olarak dönüyor ve bu dosya değişiklik olana kadar kullanılıyordu. Tarayıcıda yazı tipi 1,5 sn geciktirilerek doğrulandı (erken dosya 300 px tamamen siyah, sonra 1080 px dolu).
- Düzeltme (PostEditor.jsx): tuvale çizimler sırayla (`paint`, `drawing` ref), dosya ancak çizim bitince alınıyor; Paylaş da bekliyor. iPhone uygulaması siteyi yüklediği için Xcode'dan yeniden kurmak gerekmiyor, yalnız Netlify yayını.

## Sıradaki işler
- Telefonda dene: gönderiyi aç › Paylaş › Görüntüyü kaydet, Fotoğraflar'da görsel dolu mu.
- Bekleyen: fotoğraf önde yarış tasarımı (Seyhun örnek gönderi ve kendi fotoğrafını gönderecek), yapay zekayla şablon planı, Instagram hesabı bağlama (Meta geliştirici doğrulaması).
