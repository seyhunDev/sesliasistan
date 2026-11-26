## Nerede kaldım
- "Yapay zekayla oluştur" Safari'de "Load failed" veriyordu (Seyhun 2026-11-26). Neden: telefon hareketin fotoğrafını Firebase Storage adresinden doğrudan indirmeye çalışıyordu; Storage kovası tarayıcıya CORS izni vermediği için istek düşüyordu (aynı sorun `getThumb`'da da biliniyordu). Gemini'ye hiç gidilmemişti.
- Düzeltme: fotoğraf sunucudan alınır (`GET /api/fitness-anim?orgId=&photo=<id>`, yönetici hesabıyla Storage'dan okur). Kopyala ve Paylaş da aynı yolu kullanır. Bağlantı hatası artık "Bağlantı kurulamadı" diye yazılır.

## Sıradaki işler
- Seyhun tekrar denesin; Gemini Omni isteği ilk kez burada gerçekten gidecek. Hata verirse Netlify fonksiyon günlüğünde "fitness-anim" satırına bak.
