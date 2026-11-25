## Nerede kaldım

- Canlı ekrandaki alt yazı ("Ekranda yazı") artık kendiliğinden yazıyor (src/lib/raceCaption.js autoCaption). Yayıncı elle yazarsa elle yazılan önce gelir; Yayın › Video › Ekranda yazı başlığında "Otomatik · Start" ya da "Elle" görünür.
- Kurallar:
  - Start geri sayımında "Start", son 60 sn'de "Son dakika".
  - Sıfırdan sonra yazı yok. Sayaç durdurulursa da yazı yok.
  - "Genel geri" ile "Yarış iptal" en çok 60 dk görünür, yeni geri sayım başlayınca yerini "Start" alır. Tehirde "Tehir" görünür, uyarılar kehribar renkte.
  - Start'tan sonraki ilk 3 dk OCS, UFD ya da BFD girildiyse "Bireysel geri · 512".
  - Lider finişe gelince yarış bitene kadar "Finiş".
- Elle yazılacak hazır yazılar: Ödül töreni, Kısa ara, Protesto saati. Grup ve yarış adı çipleri kaldırıldı, çünkü bunlar zaten şeritte yazıyor.

## Sıradaki işler

- Yeni yayın düzeni (yayin-tasarim görselleri), sonra yayın özeti belgesi ve canlı dinleme.
