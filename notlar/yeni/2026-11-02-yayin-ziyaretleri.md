## Nerede kaldım

- Canlı yayın ziyaretleri (Seyhun 2026-11-02, örnek /mnt/project-files/yayin-takip/ornek.png onaylı): /canli ve /canli/<yarış> isimsiz haber verir (`src/features/liveScreen/useVisit.js`: açılış, görünürken 5 dk'da bir, gizlenince sendBeacon; görünür süre; tıklanan düğmenin adı). /canli/ornek sayılmaz.
- Kayıt Firestore'a DEĞİL Netlify Blobs'a (`canli-iz` deposu, `src/app/api/canli-iz/route.js`): oturum başına `z/<gün>/<yarış|_>/<oturum>`, eski günler `o/<gün>` özetine çevrilip ham kayıt silinir. IP saklanmaz; şehir Netlify `x-nf-geo` başlığından. Özet işlevleri `src/lib/visitStats.js` (testler `test:yaris` › Canlı yayın ziyaretleri).
- Ayarlar › Genel › Yayın (`/settings/yayin`, `src/features/settings/BroadcastStats.jsx`, yalnız ana hesap): Bugün / 7 gün / 30 gün; şu an, ziyaretçi, ort. kalma, geri gelen; yarışlar Yayında / Yaklaşan / Biten (yayın durumu, "Yayına aç"), genel sayfa satırı. Yarışa dokununca saat saat (ya da gün gün), ne yaptılar, nereden, cihaz ve şehir; Linki kopyala, Yayın masası.
- Telefonda ve Netlify'da denenmedi (Blobs yalnız Netlify'da çalışır; yerelde kayıt düşmez).

## Sıradaki işler

- Netlify'da ilk gerçek ziyaretten sonra Ayarlar › Yayın'da sayıların geldiğini kontrol et.
- İstenirse: YouTube videosunu oynatma (iframe içi tıklama sayılamıyor), "Kulübüm" gibi süzgeçler.
