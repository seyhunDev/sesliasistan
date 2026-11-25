## Nerede kaldım

- 2026-11-25 Normal kullanıcı ve sporcu için Fitness ve ders programı (Seyhun "Yap", örnek https://claude.ai/artifact/5jmwL5FGd5eSM8DncUgH4s):
  - Tümü'de ve sol menüde Fitness herkeste (eskiden çalışan/sporcuda yalnız antrenman verilince).
  - Bugünün fitness antrenmanı: `features/home/TodayFit.jsx` (eski MyFitCard), normal ve sporcu ana sayfasında Hava'nın hemen altında tam genişlik kart, Başla. Bugün yoksa çıkmaz; sıradakiler Takvim'de. (HomeFrame `lead` → IpadHome, `.iph-lead`.)
  - Sporcuda Ders programı kartı: `features/home/DersCard.jsx` mavi dolu kart. Program yoksa Fotoğrafla ekle (fotoğraf okunur, Ders programı sayfasında önizleme açılır) · Elle ekle (`/schedule?yeni=1` yeni ders penceresi). Varsa bugünün dersleri (şu anki vurgulu) ve Güncelle (yeni fotoğraf).
  - Fitness ekranlarının içi değişmedi (Fitness ve sporcu antrenman konuşmalarının işi).

## Sıradaki işler

- Telefonda sporcu ve normal kullanıcı gibi bakılsın (Ayarlar › Görünüm).
