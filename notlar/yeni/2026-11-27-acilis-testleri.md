## Nerede kaldım
- Açılış öncesi testler (Seyhun 2026-11-27 "herkese açmadan önce hangi testleri yapmalıyım… çalışma ortamı hazırla"; telefonda denenmedi):
  `npm run test:yeni-kullanici` 32 adımdan 57 adıma çıktı. Yeni bölümler: 11 tanıtım sayfaları (/tanitim, /kisa, /simulator, video),
  12 "Velora'ya katıl" formu → Admin › Başvurular (hatalı telefon 400), 13 Yönet ("Günü başlat") ve Fitness › Hazır programlar,
  14 iki antrenörün verisi ayrı (ekranda ve Firestore kurallarında: sporcular, planlar, başvurular; başkasının takvimine yazamaz,
  kendini başka ekibe yazamaz), 15 yetki (Admin yalnız Velora sahibinde; sporcu başkasının verisini okuyamaz, kendini ana hesap yapamaz).
- Düzeltme: /api/basvuru başvuruyu "tek owner" hesabına gönderiyordu; herkes kaydolunca her antrenör owner olduğu için başvuru 503
  dönecekti. Artık önce TANITIM_ORG, sonra Velora sahibi (VELORA_ADMIN e-postası) aranır.
- Düzeltme: Fitness sayfasında kapalı pencerelerin React anahtarları aynıydı ("c"), konsolda "same key" hatası çıkıyordu.
- Çalışma ortamı (Artifact "Açılış masası"): otomatik sonuçlar, cihaz kontrol listesi (işaretler tarayıcıda), bağlantılar,
  açılıştan önce kalanlar. Kaynak /mnt/project-files/acilis-masasi/.
- `npm run test:hizli`: 4625/4682; kalan 57 madde main'de de aynı (eski kaynak metin kontrolleri), bu işle ilgisi yok.

## Sıradaki işler
0. Seyhun cihaz testlerini Açılış masası sayfasından yapar (iPhone Safari, Android Chrome, iPad, masaüstü).
1. Açılıştan önce: IBAN, KVKK metni (uygulamada yok), Firebase e-posta gönderen adı, kuralları yayınlama, kaydı açma kararı.
2. test:hizli'deki eski 57 kırmızı madde ayrı bir işte temizlenmeli.
