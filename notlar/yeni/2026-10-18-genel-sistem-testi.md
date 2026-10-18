## Nerede kaldım
- Genel sistem testi, yapay zekasız (Seyhun: "sistemin doğru sağlıklı çalışıp çalışmadığını… yapay zekaya istek atmayalım"). Yerel testler 3045 → 3063 (hepsi geçiyor), tam test 1247/1247 (`--yzsiz`).
- Yeni testler: `elle.mjs` "Hava hesapları" (weather.js: sadeleşme, günün saatleri, yelkene uygun saatler, rüzgâr adı/şiddeti, gökyüzü, grafik şeridi, hava sorusu, yer adı, MGM/Windy, yapay zeka özeti); `yaris.mjs` "Yarış multimedya: yardımcılar" (dayOf/atOf, cleanDays, windOn/startsOn, dirShort, eski Ertelendi → Tehir, momentRace).
- Tarayıcı testi (`scripts/tam-test/tarayici.mjs`): girişsiz açılan sayfa listesi 19 → 43 (yarış multimedya, takvim, kişi sayfası, antrenman günü…).
- `hepsi.mjs` (canlı test) cümleler ve bildirim testlerini de alıyor.
- Girişli tarama (geçici, depoya girmedi: AuthProvider'a sahte kullanıcı + sahte Firebase): 43 sayfa × telefon/tablet/bilgisayar boyu açıldı, çökme yok; bilgisayar boyunda sol menü her sayfada (multimedya sayfası hariç, tam ekran). Tek hata Hesaplar (/mail, /debts): borç formu ile borç ayrıntısı penceresi aynı `key` ("off") alıyordu; düzeltildi.
- Bilinen küçük nokta (düzeltilmedi): `momentRace` bağlı yarışı silinmiş çekimde numarayı yalnız o günün startlarından sayar (seri numarası ve geçersiz yarışlar hesaba girmez). Normalde çekim yarışa bağlı (rid) olduğu için görünmez.

## Sıradaki işler
0. Telefonda Hesaplar › Borçlar: borç aç, düzenle, kapat (pencereler karışmıyor mu).
