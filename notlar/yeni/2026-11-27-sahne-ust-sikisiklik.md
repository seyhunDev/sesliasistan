## Nerede kaldım

- Sahne ana sayfa üstü (Seyhun 2026-11-27, Android'de "isim menü simgesinin altına giriyor"): `sporcu.css` `.sh-hi` satır yüksekliği .9 → 1.02 (büyük harf İ/Ş işaretleri üst satıra taşıyordu), üstte 1rem boşluk, dar telefonda küçülür (clamp 2rem…), uzun ad kırılır. `.sh` üst boşluğu env(safe-area-inset-top) yoksa Capacitor'ün `--safe-area-inset-top` değişkenini de kullanır; `.sh-top` min-height 2.75rem.
- Hava grafiği altındaki rüzgâr aralıkları dar telefonda iki satıra kırılmıyor (WxPanel bloklar whitespace-nowrap, yazı clamp).

## Sıradaki işler

- Android telefonda dene. Hâlâ sıkışıksa sebep telefonun büyük yazı ayarı olabilir (WebView textZoom); gerekirse MainActivity'de setTextZoom(100) (APK yeniden derlenir).
