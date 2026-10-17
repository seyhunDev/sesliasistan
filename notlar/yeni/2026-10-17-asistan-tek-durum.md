## Nerede kaldım

- Asistan denetimi (Seyhun, 2026-10-17: "çalışırken iki farklı yerde bilgilendirme mesajları oluyor"): çalışırken durum yazısı yalnız üstteki ilerleme halkasında. Sohbetteki sıralı bekleme satırı (WaitLines, "… hazırlanıyor · Vazgeç") kaldırıldı; durdurmak için alttaki kutunun düğmesi. Görev listesi ekrandayken ilerlemeyi liste anlatır; halka yalnız dolar, yazı yazmaz (`ringOf({ shown })`). Tek işte halka + tek satır.
- Açılışta son 3 oturum (cihazdaki kısa özet, `sessionStore`) yeni konuşmanın üstünde soluk satırlar olarak görünür (`PastSessions.jsx`); halka bunları saymaz, açılışta büyük kalır.
- Kapanırken ve aşağı çekilip küçülürken tam ekran aşağı inerek kaybolur (`.afull-out`, TabBar `LEAVE_MS`); parmakla çekince bıraktığı yerden aşağı iner. Açılış animasyonu (`.afull-in`) her açılışta.
- Halkanın "konuşma doldu mu" ölçümü artık yalnız sohbet içeriğine bakıyor (eskiden alanın tamamını ölçüyordu).
- Telefonda denenmedi. Örnek: /mnt/project-files/asistan/tek-durum-ornek.png

## Sıradaki işler

- Telefonda: aç-kapat, aşağı çekip küçült, üç işli cümle; durumun yalnız halkada göründüğünü kontrol et.

## Asistan

- Çalışırken durum tek yerde: tam ekranda halka, küçülmüşken alttaki balon. Sohbete ayrı bekleme/durum satırı eklenmez.
- Asistan açılınca son 3 oturum her zaman görünür.
