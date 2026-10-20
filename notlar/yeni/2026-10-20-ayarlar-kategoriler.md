## Nerede kaldım
- Ana hesap Ayarlar yeniden düzenlendi (Seyhun: "çok karışık… testler kendi yerinde, butonlar tasarımlar aynı olsun"; telefonda denenmedi). Gruplar: Genel (Yazı boyutu, Görünüm, Hava konumu, Ana sayfada yarışlar, Banka defteri kartı) · Bildirimler (Bu telefonda bildirim, Plan hatırlatması, Günlük özetler) · Asistan (Sesli yanıt, Güçlü yapay zeka, Öğrenme, İzinler) · Diğer: alttan açılan üç pencere Bağlantılar (Gmail ve banka mailleri, iPhone takvimi), Veri ve kullanım (Yapay zeka kullanımı, Aramalar, Yedek indir, Bu cihazdaki veriler, Telefondaki veriyi Firebase'e taşı, Eski mail eklerini sil), Testler (Ses testi, Örnekleri dene, Süre kaydı; Deneme bildirimi, Tanıtım ve karşılama, Örnek veri) · Hesap (Kişiler, Şifremi değiştir, Sürüm, Çıkış yap).
- Satır tek tip (`src/features/settings/ui.jsx`): simge ve açıklama yok, solda ad, sağda o anki değer, ayrıntı dokununca altta açılır; `note` kırmızı kısa uyarı. Düğmeler tek bileşen `Btn` (main mor dolu, line ince çerçeve, danger kırmızı). Anahtarlar mor. `Row desc` yalnız Mail ayarları gibi bilgi sayfalarında açıklama satırı.
- Kaldırılan tekrarlar: "Hesaplar" (Mailler sayfası) ve ayrı "Gmail bağlantısı"; "Tanıtımı yeniden göster" + "Karşılamayı sıfırla" tek satır; "Örnekleri dene" Süre kaydı'ndan ayrı satır (Timing.jsx `ProbeRow`); deneme bildirimi Plan hatırlatması'ndan Testler'e. Sürüm satırında tarih · PR, dokununca değişiklik.
- Diğer hesapların kısa Ayarlar'ı (#531) aynı satır görünümünü aldı, içeriği aynı.
- Testler emülatörde (sahte yapay zeka) denendi: Örnekleri dene 17 cümle, Süre kaydı, Ses testi A ve C, mikrofon denemesi, tanıtım çalışıyor. Ses testi B (Gemini Live) yerelde anahtarsız denenemedi; live-token'daki iki model adı Google'da kaldırılmış olabilir, asistan motoru thread'ine iletildi.

## Sıradaki işler
0. Telefonda: Ayarlar › Diğer › Testler penceresi açılıyor mu, Örnekleri dene ve Deneme bildirimi çalışıyor mu; Sürüm artık Ayarlar › Hesap › Sürüm.

## Tasarım
- Ayarlar satırları: simgesiz, açıklamasız tek satır (ad + sağda değer); seyrek bölümler alttan açılan pencerede; tüm düğmeler `Btn` üç çeşit.
