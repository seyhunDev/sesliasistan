## Nerede kaldım

- Kanalımda canlı kendiliğinden kaynak (Seyhun 2026-11-06 "kendim bir yayın açınca onu göreyim, + eklememe gerek kalmasın; etraftaki yayınları ekleme de kalsın"): Yayın sayfası açıkken dakikada bir kanalın süren canlı yayınlarına bakılır (`ytLiveNow`, liveBroadcasts active, 1 birim kota). Listede olmayan her canlı yayın kamera kaynağı olarak kendiliğinden eklenir (adı yayının başlığı, `auto: true`), yayın bitince yalnız kendiliğinden eklenen kalkar; elle eklenenlere ve anahtarlı kaynaklara dokunulmaz (`withMyLive`, lib/youtube.js). "+" içindeki Kanalımdan ve Bölgede canlı yayınlar yerinde.
- YouTube bağlı değilse ya da ana hesap değilse bakmayı bırakır. Kaynaklar /canli'deki seçicide (stream.sources) de görünür. Gerçek yayınla denenmedi.

## Sıradaki işler

- İlk gerçek test: PRISM/Moblin ile kanalda yayın aç, 1 dk içinde Yayın › Video kaynaklarında görünsün.
- Yayın sayfası kapalıyken de görünmesi istenirse sunucu zamanlayıcısı (ytAuth yenileme anahtarıyla).
