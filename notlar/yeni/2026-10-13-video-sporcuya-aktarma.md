## Nerede kaldım

- Yüklenen hareket videosu sporcunun antrenmanına gitmiyordu (Seyhun: "video ekliyorum, küçük pencerede oynatabiliyorum ama sporcunun hareket sayfasında gözükmüyor"; telefonda denenmedi). Video kütüphaneye (`fitLib/main`) yazılıyordu, sporcunun antrenmanlarına ise yalnız Hareketler penceresi "kapatılınca" ya da program kaydedilince kopyalanıyordu (`spreadLib`). Pencere kapatılmadan sayfadan çıkılınca kopyalama hiç olmuyordu. Ayrıca kopyalama tek toplu yazmaydı: listede az önce silinmiş eski bir antrenman olunca hepsi sessizce düşüyordu; başlanmış (bugünkü) antrenmana da kopyalanmıyordu. Program kaydı videonun kütüphaneye yazılmasını beklemeden yapılırsa eski kütüphaneyle (videosuz) kaydedilebiliyordu.
- Şimdi: video eklenir/kaldırılır kaldırılmaz sporcuların bugünkü ve sonraki antrenmanlarına kopyalanır (`useFitLib` `setMedia` → `spreadLib`), belge belge yazılır (biri yazılamazsa gerisi gider, konsola uyarı), bellekteki kütüphane yazma beklenmeden yenilenir (`saveLib`). Sporcunun ekranında video açılamazsa artık kaybolmaz: "Video burada oynatılamadı" (WebM/MOV biçimi notu) ve "Aç" (`MediaVideo`). Testi `test:elle` › "Fitness hareket kütüphanesi" › "yüklenen video sporcuya".

## Sıradaki işler

- Fitness › Hareketler'de bir harekete video ekle, pencereyi kapatmadan sporcu hesabıyla o hareketin olduğu antrenmanı aç; "Videoyu izle" görünmeli. "Video burada oynatılamadı" çıkarsa yazan biçimi yeni mesajla ver.
