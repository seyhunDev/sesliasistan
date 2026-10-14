## Nerede kaldım

- Asistan tam sayfa (Seyhun: "asistan tam sayfa açılsın, arka plan animasyonlu, önünde görevler, yazılar net; futuristik, profesyonel, modern; alttaki konuşma kısmı aynı kalsın; sayfalara gitmeye gerek yok"; onay bekliyor, telefonda denenmedi): asistan açılınca ekranın tamamını kaplar. Arka planda yavaş kayan üç renk bulutu, silik nokta ızgarası ve ortada durum renginde parlayan halka (yeşil bekliyor, kırmızı dinliyor, kehribar çalışıyor, mavi konuşuyor; ışık sesle büyür). Konuşma başlayınca halka söner, görevler ve cevaplar önünde yarı saydam kartlarda. Alttaki konuşma kutusu değişmedi. Yalnız transform/opacity hareket eder (bulanıklık yok), "Hareketi azalt" açıksa durur. Açık ve koyu temaya uyar (`AssistBg`, `.afull`, `.abg`, TabBar.jsx; globals.css › TAM SAYFA ASİSTAN).
- Sayfa: görev listesi sürerken sayfalar arkada değişebilir, asistan kapanmaz; sonuçtaki düğmelerle (Sohbeti aç, Yarışı aç…) gidilir. Tek başına "X sayfasını aç", "Foça yarışını aç", "Ali'nin kartını aç" denince ya da sonuçtaki düğmeye basınca asistan kapanır, sayfa görünür (`showPage`, cevap.js). Kural değişikliği yok.
- Örnekler: `/mnt/project-files/asistan/tam-sayfa/tam-sayfa-acik.png`, `tam-sayfa-koyu.png`, `ornek.mp4`.

## Sıradaki işler

- Seyhun onaylayınca birleştir; telefonda asistanı aç, arka plan takılıyor mu, yazılar net mi bak.

## Tasarım

- Asistan açıkken tam sayfa: hareketli arka plan (renk bulutları + durum halkası), önünde konuşma ve görevler; alt konuşma kutusu aynı (2026-10-14).
