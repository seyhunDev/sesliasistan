## Nerede kaldım

- Uygulama içi canlı ekranda (yalnız sahibin ekranı, `own`) yeni düğme alanı: çubuğun üstünde **Benim | Yayın** anahtarı ve **"Ekranda: … ˄"** düğmesi (Seyhun 2026-11-06, örnek `canli-tv/kaynak-secimi/ornek.png` onaylandı).
- Benim (varsayılan): kendi seçimim öncelikli (kamera/drone/telefon, grubun canlı konumu ya da kendi videom); seçim yoksa yayınınki. Yayın: izleyicilerin gördüğü, kendi videom duraklar, Benim'e dönünce sürer.
- "Ekranda"ya basınca "Ne izleyeyim?" paneli: Yayınla aynı · Canlı kaynaklar (Yayın › kaynaklar'daki adlarıyla; bağlantısı olmayan soluk "bağlı değil") · Canlı konum · Videolarım. Dikeyde alttan, yatayda (iPad) sağdan kayar; seçince kapanır. Seçim yalnız bu telefonda, yayına gitmez.
- Alt çubukta artık Kamera / Konum yok: Parkur · Rüzgâr · Sıralama · Video · Start. Paneller açılırken ve kapanırken kayar (`.sc-vp.out`, 190 ms).
- Kaynak yayında işareti hazır: `stream.sources[].live` doğruysa seçicide kırmızı nokta (alanı kaynak/YouTube konuşması yazacak).
- Kod: `ScView` (LiveScreen.jsx), `follow` durumu ve `pickCam`; stiller sahne.css sonunda "Kaynak seçimi". Telefonda denenmedi.

## Sıradaki işler

- Kaynağın gerçekten yayında olduğunu algılama (YouTube) ve `live` alanı: kaynak/YouTube konuşmasında.
- Yayın masasını aynı kaynak sistemine sadeleştirme: Yayın konuşmasında.
- Video panelinde düzenleme (kırpma) sonra.
