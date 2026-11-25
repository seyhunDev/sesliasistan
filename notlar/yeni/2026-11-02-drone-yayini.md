## Nerede kaldım

- Drone canlı yayını (Seyhun 2026-11-02 "DJI dronundan canlı yayın; sistem hazır olsun, sadece bağlanması kalsın"): Yayın › Video › Kaynak'ta "Drone" kutucuğu. DJI Fly yalnız RTMP verir; en kolay yol RTMP ile YouTube'a göndermek, canlı ekran YouTube'u gömer. Bağlantı `raceLive.stream.drone` (cleanStream), ekranda `screen.kind: "drone"` (cleanScreen, screenUrl). "Nasıl bağlanır" penceresi adımları ve `rtmp://a.rtmp.youtube.com/live2/` adresini kopyalar; yayın anahtarı uygulamada hiç yazılmaz. Sesle "ekranda drone'u göster". Yayını sıfırla drone bağlantısını korur; son kullanılan bağlantı telefonda (localStorage `yayin-drone`) kalır, yeni yarışta hazır gelir. Gerçek dronla denenmedi.

## Sıradaki işler

- İlk gerçek uçuşta dene: YouTube kanalında canlı yayın açık mı (ilk açılış 24 saate kadar), DJI RC 2 ile 720p, gecikme "Ultra düşük".
- İstenirse YouTube'suz düşük gecikmeli yol (RTMP → WebRTC sunucusu) ücretli; şimdilik gerek yok.

## Asistan

- "ekranda drone'u göster" / "drone yayınını ekranda göster" → screenCommand { kind: "drone" } (lib/raceRounds.js), screenSay (liveActions.js).
