## Nerede kaldım
- Sesli asistan ses mimarisi, 1. grup (Seyhun 2026-11-04 "Sesli asistan – teknik mimari iyileştirme"; tasarıma dokunulmadı, telefonda denenmedi). Analiz raporu: https://claude.ai/artifact/U7cvXWQyLswVQJThuANTwx
  - Son kelimeler: bırakınca kayıt 350 ms daha sürer (`STOP_TAIL`, `stopTail`), ham ses de o arada toplanır.
  - Kısa konuşma: 0,6 sn'den kısa dinlemeyi "Çok kısa" diye atan kural kaldırıldı; dokunuş sınırı 300 → 200 ms (`PRESS_MIN`, TabBar `SHORT_MS`). Sessiz kayıt yine sessizlik süzgecinde kalır.
  - Ses kaybolmaz: çeviri olmazsa aynı ses internet beklenerek bir kez daha gönderilir (`sendAudio`, 15 + 12 sn). Yine olmazsa ve dinlerken yazı yoksa ses 10 dk bellekte tutulur (diske yazılmaz), bildirimde "Tekrar dene" aynı sesi gönderir (`retryJob`). Asistan kapanınca silinir.
  - Bir kayıt bir kez teslim edilir (`s.delivered`).
  - iPhone sistem hareketi / bildirim (pointercancel) artık dinlemeyi iptal etmiyor, gönderiyor; uzağa kaydırma yine iptal.
  - Uygulama arkaya geçerken dinleme sürüyorsa söylenen gönderilir (visibilitychange).
  - `bestText`: tam çevirinin sonu kesilmişse (parçaların son iki kelimesi yok ve belirgin kısa) parçalar seçilir; dolgu silinmiş kısa çeviri yine tam çeviri.

## Sıradaki işler
- Seyhun'un kararı bekleniyor: Gemini Live ve Web Speech kalsın mı (kaldırılırsa dinlerken canlı yazı gider; masaüstü Chrome ve iPhone Safari sunucu yoluna geçer).
- Uzun konuşma (30 sn+) için 9,5 sn sunucu bütçesi dar: Netlify arka plan işlevi + sonucu sorma (async) önerisi, onay gerekir.
- Uygulama çökerse bellekteki ses kaybolur; IndexedDB'de şifresiz kısa süreli saklama önerisi (gizlilik kararı Seyhun'da).
- Telefonda dene: tek kelime "evet", uzun cümle sonu, uçak modunda konuşup interneti açma ("Tekrar dene").
