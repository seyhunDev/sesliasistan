## Nerede kaldım
- Silme onayı artık tarayıcı kutusu değil, alttan pencere: `src/components/ui/ConfirmProvider.jsx` (`useConfirm`, (app) layout'ta). "Sil"e basınca silme bitene kadar düğmede dönen halka, Vazgeç kilitli, pencere kapanmaz; bitince kapanır.
- Kullanılan yerler: yarışı sil (RaceEditor; silme bitince sayfa kapanır), yarış evrakı, ek evrak, talimat kaldırma, sonuç belgesi (RaceResults), yarış fotoğraf/video (MediaTab), rüzgâr kaydı (WeatherTab).

## Sıradaki işler
- Diğer sayfalardaki `confirm(` silmeleri (aidat, envanter, sohbet, fitness…) kendi sahipleri `useConfirm` ile değiştirebilir.

## Tasarım
- Yeni silme onayı: `const ask = useConfirm(); ask({ title, text, yes: "Sil", run: async () => … })`. `confirm()` yazma.
