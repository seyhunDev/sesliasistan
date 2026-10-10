## Nerede kaldım

- Netlify'a GitHub'dan yayın (Seyhun: "GitHub'dan Netlify'a deploy yapabiliyor muyuz"; Netlify ücretsiz planın 300 derleme dakikası bitti, otomatik derleme durdu): yeni iş akışı `.github/workflows/netlify.yml`. main'e her birleştirmede (mobil/, notlar/ ve .md değişiklikleri hariç) GitHub Actions `netlify deploy --build --prod` çalıştırır: derleme GitHub'da, Netlify'a hazır dosyalar gider, Netlify derleme dakikası harcanmaz (Mac'ten yayınla aynı). Ortam değişkenleri Netlify site ayarlarından gelir. GitHub › Actions › "Netlify yayın" › Run workflow ile elle de çalışır. Gizli bilgiler `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` (GitHub depo gizlileri) yoksa adım atlanır. Henüz çalıştırılmadı.

## Sıradaki işler

0. GitHub'dan yayını kur: Netlify › User settings › Applications › Personal access tokens › yeni anahtar; GitHub › depo › Settings › Secrets and variables › Actions › `NETLIFY_AUTH_TOKEN` ve `NETLIFY_SITE_ID` (Netlify › Site configuration › Site ID). Sonra GitHub › Actions › Netlify yayın › Run workflow; yeşil olursa Mac'ten yayın gerekmez. Netlify'ın kendi derlemesini kapat (Site configuration › Build & deploy › Stop builds).
