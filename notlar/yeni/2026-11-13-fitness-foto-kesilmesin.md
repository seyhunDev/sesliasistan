## Nerede kaldım
- Fitness hareket fotoğrafları kesiliyor ve bulanık görünüyordu (Seyhun 2026-11-13, iPad antrenman ekranı). Neden: kutu sabit 4:3 ve `object-cover` (dikey/kare fotoğrafın altı üstü kırpılıyordu); yüklerken fotoğraf 1280 px'e küçültülüyordu, iPad'in büyük kutusunda kırpılınca büyütülüp yumuşuyordu.
- Düzeltme: antrenman ekranı (FitGuided MediaBox) ve hareket sayfası (ExerciseMedia Big) kutusu dosyanın kendi oranını alır (en dik 3:4, en yatay 16:9, en çok ekranın %60'ı), fotoğraf/video kesilmez (`object-contain`, kenar koyu zemin). Ortak `boxRatio`/`ratioOf` ExerciseMedia.jsx'te. Yeni yüklenen fotoğraflar 2048 px, kalite 0,85 (fitMedia prepMedia).
- Önceden yüklenmiş fotoğraflar 1280 px olarak kalır; kesilmez ama daha net olması için yeniden yüklenmeli. Kaynak fotoğrafın kendisi düşük çözünürlüklüyse uygulama bunu düzeltemez. Telefonda denenmedi.

## Sıradaki işler
- Seyhun iPad'de bakınca kutu oranını/yüksekliğini beğenmezse ayarla.
