## Nerede kaldım

- Yönet yeni düzen (örnek bilgi-ekrani/yonet-gunler/ornek.html, Seyhun "Yap"): telefonda harita üstte, panelin üstüne kadar (panel yüksekliği `--pnl`, TekneMap kutu değişince yeniden çizer). Soldaki araç çubuğu kalktı: üstte geri · gün düğmesi (ad · tarih · kişi → Link penceresi) · ⋯ Araçlar penceresi (Antrenman, Sonuçlar/Gruplar/Program yarış günü, Parkur, Ekran, Hava, Mesajlar, Rotalar, Kayıtlar; en altta Günü bitir). Panel tutamağı dokununca/çekince küçülür: yalnız durum ve kutular kalır.
- Altta Süre · Video · Bas konuş (Video yalnız iPhone/iPad uygulamasında; tarayıcıda iki kutu).
- Hazır kalıplar (örnek bilgi-ekrani/kaliplar/ornek.html): bas-konuşla giden ses 30 sn boyunca "Kalıp yap" ile saklanır (ad sesin ilk kelimelerinden, /api/transcribe). Son kullanılan 3 kalıp isimlerin altında: dokun = seçilenlere bir kez, basılı tut = Tekrarla (15/30/60 sn, 3/5/10 kez), sürerken dokun = Durdur. Hepsi seçiliyse her gönderimde o an açık olanlara gider. Tekrar Yönet açıkken çalışır (ekran kilidi açık tutulur). Veri: orgs/{org}/bilgi/kaliplar (liste), bilgi/k-{id} (ses) + linkin kopyası bilgiAcik/{anahtar}/ses/k-{id}; gönderimde ses belgesine yalnız `kalip` kimliği yazılır, sporcu ekranı sesi bir kez indirir (`kalipSes`). Kural değişikliği yok.
- Günler: "Yeni kanal" yerine "Günü başlat" (tarih bugün, oklarla değişir; ad Antrenman / günün yarışı). O tarih varsa "Devam et" ile o gün sürer. Kanal kaydında `day` alanı. Link aynı. Sporcu ekranı bir kez katıldıktan sonra Yönet yeni günü başlatınca kendiliğinden geçer (sayfayı yeniden açınca yine bir dokunuş: izinler için).
- Rotalar: kayıt zaten vardı (bilgiIz, dakikada bir belge). Gün kapandıktan sonra ilk izlemede sporcu başına tek belgeye toplanır (orgs/{org}/bilgiKanal/{gün}/iz/{cihaz}), dakikalık belgeler silinir; sonraki izlemeler sporcu sayısı kadar okur. Rotalar: ⋯ › Rotalar (bugün), Günü başlat kartında son günler + İzle, Günler listesinde her satırda İzle.
- Telefonda denenmedi; ekran görüntüsüyle de bakılmadı (giriş ve canlı veri gerekiyor).

## Sıradaki işler

- Telefonda ve iPad'de dene: harita yüksekliği, panel tutamağı, üç kutu sığıyor mu, kalıp yap / tekrar / durdur, rotaları izle.
- Yönet pencereleri (Sheet) hâlâ açık renk; istenirse Sahne'ye geçer.
- İstenirse: sporcu ekranı arka plandayken konum (yalnız yerel uygulama ile mümkün).

## Tasarım

- Yönet: harita üstte, araçlar ⋯ penceresinde, altta isimler + son 3 kalıp + Süre · Video · Bas konuş (Seyhun 2026-11-25 "karmaşa olmasın").
