## Nerede kaldım
- Fitness › Hareketler › bir hareket (Seyhun 2026-11-26): "Açıklama" kutusu dokununca düzenlenir (kütüphanede `how`, programlardaki anlatımın yerine geçer; boşaltılınca programınki döner). Altta "Animasyon": Yapay zekayla oluştur · Animasyon yükle · Kopyala · Paylaş (`ExerciseAnim.jsx`).
- Animasyon hareketin dosyalarında `{ a: true }` (video ya da GIF) olarak durur; antrenmanda fotoğraftan önce oynar, kız da erkek de görür (`library.forSex`). Yenisi eskisinin yerine geçer (dosya silinmez). 3 dosya sınırı dolu ise önce bir fotoğraf kaldırılmalı.
- Yapay zekayla oluştur: `/api/fitness-anim` (yalnız ana hesap). Veo'nun Gemini API önizlemeleri 2026-10-22'de kapandığı için Gemini Omni (`GEMINI_VIDEO_MODEL`, varsayılan `gemini-omni-1.1-flash`) "interactions" üzerinden arka planda; telefon 6 sn'de bir sorar, bitince video sunucuda Storage'a yazılır. Günlük sınır `FIT_ANIM_DAY` (5), fiyat `FIT_ANIM_PRICE` (Netlify'da Seyhun ayarlar). İstek biçimi SDK tiplerinden çıkarıldı, gerçek çağrı hiç denenmedi.
- Kopyala: hareketin adı, açıklaması ve İngilizce talimat (+ tarayıcı izin verirse fotoğraf) panoya; Paylaş: fotoğraf + yazı paylaşım penceresinde (ChatGPT, Gemini uygulaması). Talimat `lib/fitness/animPrompt.js`.

## Sıradaki işler
- Seyhun bir harekette "Yapay zekayla oluştur"u denesin; hata verirse sunucu günlüğündeki fitness-anim hatasına göre istek biçimini düzelt.
- Ayarlar › Yapay zeka kullanımı'nda fitanim sayacı henüz gösterilmiyor.
