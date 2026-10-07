## Nerede kaldım

- Yarış sayfası açılmıyordu (Seyhun: "yarış detay sayfasını yüklerken This page couldn't load hatası"): talimatı olan her yarışta sayfa çöküyordu. Neden: talimatı sayfanın üstüne taşırken (PR #201) talimat bilgilerinin sonunda eski "Talimatı yeniden yükle" satırı kalmıştı, artık olmayan bir değişkeni (`file`) kullanıyordu (NoticeView.jsx `NoticeDetails`). Satır silindi. Aynı türden ikinci hata asistanda bulundu: sohbetteki kayıt listesinde bir kayda dokununca `embedded` tanımsızdı (AssistantSheet `turnLinks`), düzeltildi. Bundan sonra böyle hatalar gönderimde yakalanır: `npm test` / `npm run gonder` derlemeden önce tanımsız ad denetimi çalıştırır (`scripts/tanimsiz-ad.mjs`, eslint `no-undef` yalnız src'de; lint'teki eski hatalara takılmaz).

## Sıradaki işler

- Talimatı olan bir yarışı aç, sayfa açılmalı; asistanda bir kayıt listesindeki kayda dokun, açılmalı.
