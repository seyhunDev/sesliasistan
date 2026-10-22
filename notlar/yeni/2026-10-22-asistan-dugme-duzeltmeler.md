## Nerede kaldım

- "Dinliyorum" artık tek yerde: düğmenin üstünde tek satır (nokta · Dinliyorum · süre). Söz yokken yazı kutusu çizilmez.
- × her durumda asistanı kapatır (dinleme ve bekleyen söz de gider); yazma kutusundaki × da kapatır.
- Asistan kapanınca sekme çubuğu alttan kayarak gelir (`.atab-up`).
- Basıp konuşmadan yine basınca: ses ölçer hiç ses görmediyse ve ham ses tepesi 0,04 altındaysa kayıt sunucuya ve yapay zekaya gitmez, "Ses duyulmadı, tekrar dene." çıkar (`useSpeech.js` QUIET_PEAK).
- İş bitince (düğmede ✓) `haptic("success")`. Telefonda denenmedi.

## Sıradaki işler

- Telefonda sessizlik eşiği (0,04) denenmeli: alçak sesle konuşma atılıyorsa eşik düşürülür.

## Tasarım

- Asistanın × düğmesi her zaman "Kapat"tır; söz silme ayrı bir düğme değil.
