## Nerede kaldım

- Asistan denetimindeki hatalar düzeltildi (rapor `/mnt/project-files/asistan/denetim-2026-10-09.md`; Seyhun: "senin bulduğun hataları da düzelt"; telefonda denenmedi):
  - Görev listesinde ✓ artık işin sırasıyla konur; sıradaki iş başlarken satırı kendisi "sürüyor" olur (`planIdx`, `nextInChain`). Önceden son iş "sürüyor" olmadan bitince ✓ çıkmıyordu.
  - Liste sürerken adımlar arasında mikrofon açılmaz, liste bitince de açılmaz (`midPlan`, `planEnd`).
  - Vazgeç listeyi durdurur, kalan işler üstü çizili görünür (`stopPlan`, `skip`). Görev listesi beklenirken Vazgeç/kapat denirse liste başlamaz; görev listesi isteği en çok 15 sn.
  - Cevap gelince "çalışıyor" durumu her zaman kalkar (nakit aidat gibi yerel işlerde takılı kalıyordu).
  - Liste ortasında yapay zeka hata verirse iş ✗ olur, liste sürer (`failNow`).
  - ✓/✗: başarıyla başlayan cevap ("Kaydettim: …") ✓, "eklemedim/kaydetmedim" ✗ (`failed`, taskPlan.js). Aidatta sporcu bulunamazsa ya da tutar yoksa iş ✗ ("kaydetmedim"). Aynı adda iki sporcu varsa (aidat, yoklama) "2 Mustafa var: … Hangisi?" ve seçenekler (`sameNamed`, names.js).
  - Gönderi, bu sohbette az önce oluşturulan yarışa bağlanır (aynı adlı eski yarışa değil). Yarış oluşturulamazsa ona bağlı gönderi yapılmaz.
  - Yapay zekanın sırası korunur, yalnız gönderi ve sayfa açma sona alınır (`lastPagesPlan`). En çok 10 iş; fazlası sonunda söylenir (`PLAN_MAX`, `planCut`).
  - Cihazdaki görev listesi kopyası yalnız aynı gün kullanılır; "bunun için", "o yarışa" gibi cümleler saklanmaz.
  - Yarış, nakit gelir ve yoklama kaydında sunucu onayı en çok 2,5 sn (yoklama 4 sn) beklenir, sonra arkada gider; reddedilirse uyarı çıkar (`soon`, src/lib/soon.js; `sa-save-failed`, ToastProvider).
  - Telefon istekleri en çok 30 sn bekler (`authFetch` `timeout`; demo 65 sn); ağ hatası Türkçe ("İnternete ulaşılamadı…", Safari "Load failed" yerine).
  - Etkinlik planı (asistanla "kamp planı yap") yanlış uca gidiyordu: görev listesi işlevi aynı adı taşıyordu (`askPlan` → `askTasks`). Düzeldi.
  - Ses: iPhone ses oturumu değiştirme kapatıldı (`SESSION_SWITCH = false`; "Ses alınamadı"nın en güçlü şüphelisi; bedeli YouTube mikrofondan sonra kendiliğinden devam etmez). Android uygulamasında her zaman kayıt yolu (`isNativeApp`, detect.js). Mikrofon hazır olmadan bırakılırsa "Çok kısa kaldı". Çeviri isteği en çok 15 sn, ikinci deneme yalnız hızlı hatada; sunucu zaman aşımında "Sunucu zamanında yanıt vermedi" (`jsonOf`). "Kotası dolu" yalnız gerçekten kota hatasıysa; bozuk ses Google çevirisini 6 saat kapatmaz.
  - Testleri `test:asistan` › "Denetim düzeltmeleri", `test:ses` › "Ses oturumu".

## Sıradaki işler

- Telefonda dene: "Atatürk Kupası adında yarış oluştur, bugün antrenmana Mustafa geldi, Enes aidatını nakit ödedi, Atatürk Kupası için Instagram yarış görseli hazırla". Her satırda ✓ çıkmalı, adımlar arasında mikrofon açılmamalı, sonunda asistan durmalı. Bir de liste sürerken Vazgeç'e bas.
- "Ses alınamadı" hâlâ çıkıyor mu bak. Kesildiyse nedeni ses oturumuydu.

## Asistan

- Görev listesi sürerken ve bitince mikrofon kendiliğinden açılmaz; Vazgeç listeyi durdurur (2026-10-09).
- iPhone ses oturumu değiştirme kapalı (`SESSION_SWITCH = false`); YouTube mikrofondan sonra kendiliğinden devam etmez (2026-10-09).
