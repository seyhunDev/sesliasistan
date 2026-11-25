## Nerede kaldım

- Ana hesap ve normal kullanıcı ana sayfası sporcu gibi koyu "Sahne" oldu (örnek velora-tarama/ana-normal-sahne.html, Seyhun "Her ikisi için de yap"). Kod: `src/features/home/SahneHome.jsx` (OwnerSahne, NormalSahne); OwnerHome.jsx ve NormalHome.jsx yalnız onları çağırır.
- Üst çubuk (☰ · tarih · ＋ · zil · profil) SporcuMenu.jsx `SahneTop`; menü ve + Ekle görünüme göre büyük kutu ve seçenek alır (`big`, `adds`). Ana hesap: Tekne ekranı, Sporcular, Fitness, Velora Sailing; normal: Tekne ekranı (antrenörde Yönet), Fitness, İngilizce, Velora Sailing. + Ekle: Plan, Görev, Not, Fiş (fiş izni yoksa Ders).
- Hava paneli Sahne: dev kn, ölçülen limon, tahmin beyaz kesik (ortak WindChart, renkler sporcu.css `.sh-wxp`), 3 saatlik aralıklar, tek satır yağış (WxPanel `rainText` dışa açıldı). Gün şeridi 7 gün, dokununca hava ve planlar o güne geçer.
- Ana hesap Kulüp kokpiti: süren yarış (RaceLive satırı) ya da sıradaki yarış geri sayımı; kutular yoklama, fitness bu hafta, aidat, hesaplar (açık fatura), Tekne ekranı Aç · Yönet, Velora Sailing; altında Bekleyen. Eski Kulüp listesi, Mesajlar satırı, Bilgi kutusu ve Velora Sailing tanıtım kartı ana sayfadan kalktı (Mesajlar alt çubukta).
- Normal kullanıcı: antrenörse Yönet kartı, bugünün fitness'ı yatay kart, Bekleyen, ödeme.
- Telefon tek sütun; dik iPad hava tam genişlik + iki sütun; yatay iPad (64rem+) solda hava, günler, planlar, sağda kulüp. Alt çubuk ve sol menü bu sayfada koyu; küre yerinde.
- Antrenman paylaşımı genişledi (lib/sporcuPaylas.js): ana hesabın yanında antrenör ve çalışanların bu alanda eklediği antrenmanlar da alanın sporcularına açılır (ana hesabın cihazı açıkken eşitlenir).
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda ve iPad'de bak: hava eğrisi renkleri, gün şeridi kayması, kutular.
- Eski IpadHome çerçevesi ana sayfada kullanılmıyor (Waiting oradan); temizlik onayla.
- Ayarlar yeni tasarım örneği "yap" bekliyor.
