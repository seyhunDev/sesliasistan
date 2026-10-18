## Nerede kaldım

- Telefonda İngilizce "This page couldn't load · Reload / Back" ekranı çıktı (20:56, iki PR main'e 20:55'te birleşmişti). Bu ekran Next.js'in kendi varsayılan çökme ekranı: uygulamada hiç error.jsx / global-error.jsx yoktu, herhangi bir sayfadaki çizim hatası bütün uygulamayı bu boş ekrana düşürüyordu. Saat yeni yayına denk geldiği için en olası sebep: açık kalan eski sayfa, yeni yayında silinmiş bir kod parçasını (chunk) istedi (Netlify eski dosyaları tutmuyor). Çıkarım, telefonda doğrulanmadı.
- Şimdi: `src/app/(app)/error.jsx` (sayfa çökerse alt çubuk ve asistan yerinde kalır, yalnız sayfa alanında Türkçe ekran), `src/app/error.jsx` (çerçeve/giriş çökerse), `src/app/global-error.jsx` (son çare, kendi html'i). Ortak ekran `components/ui/CrashScreen.jsx`: "Bu sayfa açılamadı", Tekrar dene · Yenile · Ana sayfaya dön, altta dokununca açılan "Ayrıntı" (hata metni).
- Kod parçası yükleme hatasında (`isChunkError`, lib/crash.js) sayfa dakikada en çok bir kez kendiliğinden yenilenir; olay düğmelerindeki import() hataları için genel dinleyici (`watchChunkErrors`, Pwa.jsx ServiceWorkerSetup).
- Son 10 hata telefonda `sa-crash` (localStorage) altında saklanır: yer, sayfa yolu, mesaj.
- Test: `npm run test:elle` › "Sayfa çökmesi".

## Sıradaki işler

- Ekran yine çıkarsa "Ayrıntı"ya dokunup ekran görüntüsü alınsın; hata metni gerçek kod hatasını gösterir, o sayfa düzeltilir.
