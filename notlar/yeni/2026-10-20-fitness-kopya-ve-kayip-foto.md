## Nerede kaldım
- Program silinip hazır program/PDF yeniden eklenince aynı hareket farklı adla ("Backpack split squat" / "Sırt çantalı split squat") yeni kayıt açıyordu; fotoğraflar eski adlı kayıtta kaldığı için yeni programda görünmüyordu.
- Hareketlerim › hareket › "Başka hareketle birleştir": iki farklı adlı kaydı birleştirir (fotoğrafı çok olan kalır, eski ad alias olur; sonraki programlarda iki ad da kalanı kullanır, kopya açılmaz).
- Hareketlerim altında "Hareketsiz kalan fotoğraf ve videolar": Storage'da olup hiçbir harekete bağlı olmayan dosyaları listeler, seçilen harekete geri ekler (fitMedia.looseMedia, library.libAttach).
- PDF okuma (/api/fitness-import) kulübün hareket adlarını alır; aynı hareketse o adı aynen kullanır.
- Hareket fotoğrafı/videosu kaydı güncel kayda uygulanır (library.mediaApply): yükleme sürerken eklenen bağlantı/fotoğraf artık ezilmiyor; kayıt hatası gösteriliyor.

## Sıradaki işler
- Tam ekran hareket sayfası (örnek /mnt/project-files/fitness/medya-ekle/ornek.png onaylandı).
