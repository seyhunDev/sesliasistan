## Nerede kaldım

- Ana hesap ve normal kullanıcının ana sayfası "yönetim paneli" görünümüne geçti (Seyhun 2026-11-28 "yap"; örnek /mnt/project-files/yonetim-paneli/ornek.html v2).
- `src/features/home/pano.css`: `main.sh.pro` altında lacivert zemin, tek vurgu elektrik mavisi (#3d8bff, sporcudaki limonun yerine), bütün bloklar aynı lacivert panel; tarih üst satırda solda.
- `SahneHome.jsx` Ozet: üstte özet kutuları (bugünkü plan, yaklaşan yarış günü, bekleyen iş); telefonda yalnız ana hesapta ilk ikisi.
- `src/features/home/Vitrin.jsx`: Velora Sailing ve Yönet görselli vitrin kartı (kodla çizilen SVG zemin, hareketli tekneler; hareket azaltılmışsa durur). Kulüp kutularındaki SailingTile/YonetTile kalktı. Telefon yatayken iki kart ekranı doldurur, iPad'de özetin altında yan yana.
- Boş günde "Plan yok" yanında "+ Plan" düğmesi.
- Sporcu ana sayfası değişmedi. Alt çubuk ve sol menü hâlâ limon (tüm uygulamada ortak).

## Sıradaki işler

- Seyhun telefonda ve iPad'de baksın.
- Alt çubuk, sol menü ve diğer sayfaların mavi vurguya geçmesi (sorulacak).
- Sporcu ana sayfası için ayrı tasarım (Seyhun "bir tık daha farklı").

## Tasarım

- Yönetim paneli dili: lacivert #070b16 zemin, panel #101829 / çizgi #1d2943, tek vurgu #3d8bff, mavi üstünde beyaz yazı. Öne çıkan özellik (Sailing, Yönet) düğme değil, görselli vitrin kartı.
