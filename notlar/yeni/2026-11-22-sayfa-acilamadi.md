## Nerede kaldım

- Seyhun 2026-11-22 20:21: uygulamada her sayfada "Bu sayfa açılamadı", Ayrıntı: `undefined is not an object (evaluating 't.addEventListener')`.
- Neden: #1483'teki `listenWorkerOpen` (src/lib/openOutside.js). iPhone uygulamasında (WKWebView) `navigator.serviceWorker` yok; kaynakta `if (!sw) return` vardı ama derleyici (Turbopack) `navigator.serviceWorker`'ı hep var saydığı için bu denetimi derlenmiş koddan siliyordu. PushSync yüklenince çöküyordu.
- Düzeltme: denetim `"serviceWorker" in navigator` ve `typeof sw.addEventListener` ile; derlenmiş kodda denetimin durduğu `.next/static/chunks` içinde görüldü.
- Kural: `navigator.serviceWorker` için `if (!x)` denetimine güvenme; `"serviceWorker" in navigator` ya da `?.` kullan.

## Sıradaki işler

- Telefonda dene: uygulama açılıyor mu, bildirime dokununca sayfa açılıyor mu.
