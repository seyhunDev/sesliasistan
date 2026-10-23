## Nerede kaldım

- Kameralar'da (Seyhun 2026-10-23): Windy'nin Türk kıyısında kamerası çok az; Dikili, Ayvalık, Foça, İzmir seçilince hep Midilli kameraları çıkıyordu. Seyhun YouTube canlı yayınlarını eklemeyi seçti.
- `/api/cams?…&q=<yer>` artık iki kaynaktan: YouTube Data API v3 araması ("<yer> canlı", yalnız canlı ve gömülebilir, Türkiye; başlığında ya da kanal adında yer adı geçen, haber elenir; 30 dk bellek, arama 100 birim / günde 10.000) ve Windy (5 dk). Biri çalışmazsa öteki gelir.
- Sayfada önce yerin YouTube yayınları (alt yazıda kanal adı), sonra yakından uzağa Windy. Pencerede YouTube oynatıcısı (sessiz başlar) ve "YouTube'da aç". En altta "Kameralar: YouTube · Windy.com".
- Anahtar Netlify `YOUTUBE_API_KEY` (gizli; Google Cloud'da YouTube Data API v3 açılmalı). "Konumum" yakın hazır yerde değilse YouTube aranmaz.
- Bulutta YouTube ve Windy'ye erişilemedi; ekran testi taklit veriyle geçti, telefonda denenmedi.

## Sıradaki işler

- Telefonda: Dikili, Ayvalık, İzmir'de YouTube yayını çıkıyor mu; eleme fazla katıysa (yer adı başlıkta yoksa) gevşetmek.
