## Nerede kaldım

- Medya izleme ekranı iPhone Fotoğraflar gibi sadeleşti (örnek `yaris-tasarim/medya/izleme-sade.png`, Seyhun "Yap"): üstte yuvarlak geri, ortada başlık (yarış/start adı) ve altında "Bugün · 10:35", sağda ⋯ (Paylaş · Kimler var · Düzelt · Sil). Videoda yalnız sayaç ("Startan beri 1:35"), altta ince çubuk (geçen / −kalan, dokunup kaydırınca sarar) ve oynat/durdur; iPhone'un kendi düğmeleri yok. Dokununca yazılar gizlenir. Fotoğrafta da çekimdeki an aynı kutuda.
- Video inerken ortada halka ve "Yükleniyor %38" (inen kısım / süre).
- Yüklenen video ve fotoğraf 7 gün telefonda kalır (IndexedDB `sa-race-media` v2, `kept` deposu, `pendingStore.js` keepLocal/listKept/clearKept). Varsa izlerken yerel dosya oynar (beklemeden). 7 günü geçen, Medya açılışında silinir; Firebase'deki kalır. iPhone yer darlığında kendisi de silebilir (persist istenir).
- Medya › ⋯ (Çekim): "Telefonda 12 video · 3 fotoğraf · 640 MB" ve "Telefondan sil". Medyadan silinen kaydın telefon kopyası da silinir.
- Antrenman ve yarış medyası aynı bileşenler (MediaTab, MediaViewer), ikisinde de geçerli. Tarayıcıda denendi, telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: video açılışı, çubukla sarma, yan çevirme, Telefondan sil.
- Sesi kapat düğmesi istenirse izleme ekranına eklenebilir (şimdilik telefonun ses tuşları).
