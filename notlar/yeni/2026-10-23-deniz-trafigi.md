## Nerede kaldım

- Yeni sayfa Deniz trafiği (`/sea`; ana sayfa Tümü › Kulüp › "Gemiler", sesle "deniz trafiğini aç"). Dikili çevresindeki gemiler canlı (AIS): lacivert üstte harita (Yemek'teki MapLibre + OpenFreeMap), Teknem · yenileme süresi (10/20/30/60 sn, telefonda saklanır) · Acil düğmeleri; altta Yaklaşan / ayrılan, Seyirde, Demirde, Limanda bölümleri. Acil penceresi: 158 Sahil Güvenlik, 112, VHF Kanal 16, konumumu kopyala, en yakın SG teknesi.
- Veri: aisstream.io (ücretsiz, deneme aşamasında). Sunucu `src/app/api/sea/route.js`: son toplama 8 sn'den eskiyse aisstream'e ~4,5 sn bağlanır (kutu `SEA_BOX`), mesajları listeye işler, Netlify Blobs'ta (`sea` deposu; yoksa bellekte) saklar; 30 dk görünmeyen gemi silinir. Anahtar Netlify ortam değişkeni `AISSTREAM_KEY` (gizli); yoksa sayfa "Gemi verisi bağlı değil" der. Telefon sayfa açık ve ekranda iken sorar.
- `requireUser(req, { free: true })`: deniz trafiği istekleri yapay zeka istek sınırına (saatte 120) sayılmaz.
- Kurallar `src/lib/sea.js` (saf): AIS okuma, durum (yanaşıyor/ayrılıyor: limana uzaklık değişimi; kalkacak: hızlanmaya başladı ya da demirde/bağlı → seyirde; karaya oturmuş/kumanda edilemiyor amber), Sahil Güvenlik (tip 55/51 ya da TCSG adı), satır yazısı, asistan cevabı. Dikili SG karakolu haritada sabit işaret (yaklaşık konum).
- Teknem = telefonun konumu (teknenin AIS cihazı / MMSI'si sorulmadı; varsa sonra eklenir).
- Sesle (`isler/deniz.js`, yol `sea(...)`): "yanaşan gemi var mı", "limanda kaç gemi var", "demirde kaç gemi var", "deniz trafiği nasıl", "Sahil Güvenlik nerede", "sahil güvenliğin numarası ne". Testler: yonlendirme (sea*), elle "Deniz trafiği".
- Bulut ortamında aisstream ve harita sunucularına erişim yok: canlı veriyle denenmedi.

## Sıradaki işler

- Seyhun aisstream.io'dan ücretsiz anahtar alıp Netlify'a `AISSTREAM_KEY` (Contains secret values) ekleyecek; sonra telefonda: gemiler geliyor mu, Dikili kapsamı yeterli mi, durumlar doğru mu.
- Teknede AIS varsa MMSI ile "Teknem"i gemiden göstermek.

## Asistan

- Deniz trafiği soruları yerelde cevaplanır (yapay zekaya gitmez); veri /api/sea.
