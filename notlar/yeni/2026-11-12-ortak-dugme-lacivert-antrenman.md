## Nerede kaldım

- Seyhun (2026-11-12): "Neden butonların hepsi farklı tasarımda? Ortak tasarım var, onu kullanalım." Asıl neden: ortak düğmenin (.btn) lacivert zeminde görünümü yoktu, lacivert sayfalar kendi düğmesini yazmıştı (tl-go, tp-go, tw-hb, lvd-*, ck-btn, act-main, ck-pill, food-btn…).
- globals.css: `.ck`, `.navy`, `.lvd` içinde ortak düğmenin lacivert görünümü eklendi: İkincil yarı saydam beyaz kabarık, Ana elektrik mavisi (#3d7bff, beyaz yazı), Tehlike açık kırmızı yazı, Yazı #8fb3ff, seçili İkincil (aria-pressed) elektrik mavisi.
- Antrenman (/training, /training/day iPad + telefon): Start şeridi, Parkur/Video/Kamera/Yoklama/Günlük, Kapat, ⋯, −1/+1, İptal, Sesle söyle, DNF, Yarışı bitir, Ekle; geri düğmesi ortak BackButton. trainLive.css'te bu düğmelerin yalnız yer ve boyu kaldı (.tw-hb, .tw-x, .tl-go, .tp-go sınıfları test için duruyor).
- Sayaç (Countdown, yarış Süre sekmesi de), Races, TrainFlow (Düzelt/Paylaş), Parkur kartı (CourseTab), Video penceresi (LiveVideos; canlı ekranda da aynı parça) ortak düğmede. sahne.css'te lvd düğmelerinin yalnız boyu kaldı (em ile).
- Seçim çipleri, sekmeler, sporcu kareleri ve satırlar olduğu gibi (ortak kural).

## Sıradaki işler

- Diğer sayfalardaki lacivert düğmeler (raised, act-main, ck-btn, ck-pill, food-btn, acc-btn) ortak düğmeye. Lacivertte ana düğme rengi (mavi mi beyaz mı) Seyhun'a soruldu; önerilen mavi.
- Telefonda deneme: antrenman ve video penceresi düğmeleri.

## Tasarım

- Yeni düğme yazılmaz: lacivertte de `btn btn-primary/secondary/danger/text/icon/round` kullanılır; sayfa CSS'inde yalnız yer ve boy yazılır, renk/kenar/gölge yazılmaz.
