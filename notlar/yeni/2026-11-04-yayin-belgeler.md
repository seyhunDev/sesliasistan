## Nerede kaldım

- Yayın'a "Belgeler" sekmesi eklendi (`src/features/broadcast/DocsTab.jsx`). Üstte "Genel sıralama: Sonuç yüklü / yok" ve "Ekrana al" (03 sahnesini elle açar). Altta yarışın siteden gelen belgeleri (önce sonuçlar, sonra listeler, talimatlar); dokununca PDF açılır. Altta "Siteye bak" ve "Sonuç yükle".
- Kaynak yarış sayfasıyla ortak: site belgeleri raceLive/{yarış}/site, sonuçlar yarışın sonuçları + raceLive/{yarış}/sheets (canlı ekran /api/canli fleets). Siteden gelip işlenmemiş ("new") sonuç ve listeler Yayın açıkken de işlenir; önce yalnız yarış sayfası açılınca işleniyordu.
- Geçici sonuç ekranda yoktu: canlı ekran yalnız puanı (net) olan sonuç PDF'ini sayıyordu; puansız PDF artık sırasıyla gösteriliyor (etiket "Sonuç").
- Yarış sayfasındaki Evrak / Dokümanlar ayrımı yarış sayfası sohbetinde; bu sekme o dosyalara dokunmaz.

## Sıradaki işler

- Geçici / kesin ayrımı ekranda yazmıyor (sheets'e durum yazılmıyor).
