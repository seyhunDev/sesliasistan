## Nerede kaldım

- Yönet bas-konuş artık parça parça gidiyor (Seyhun 2026-11-25 "2-3 saniyede bir eklenenleri gönderip sporcuya sırayla, telsize yakın"):
  konuşurken her 2,5 sn'lik parça ayrı, tek başına çalınabilir bir kayıt olarak `bilgi/ses` belgesine yazılır (`id` konuşma, `seq`, son parçada `end` ve `dur`;
  bir önceki parça `prevSeq/prevData` olarak taşınır, hızlı gelen iki güncellemede parça kaybolmasın). Tam ses yine ayrıca kaydedilir (Kalıp yap, Tekrar).
- Kod: `usePtt.js` (`live`, PART_MS, aynı mikrofondan ikinci MediaRecorder), `bilgiStore.js` (`sendSesPart`, `finishSes`, `cancelSes`),
  `BilgiAdmin.jsx` (live verilir), `BilgiScreen.jsx` useVoice (kuyruk: sırayla çal, gelmeyen parçayı 3 sn bekle sonra atla, `cancel` gelince dur).
- Parça gidemezse ya da ikinci kaydedici açılamazsa tam ses eski yolla bir kez gider. Günlüğe konuşma başına tek kayıt.
- Maliyet: 20 sn konuşma ≈ 8 yazma (açık link varsa 16); okuma = parça × açık ekran. Firestore kuralı değişmedi.
- Telefonda denenmedi. Risk: iPhone'da iki kaydedici aynı anda (ilk denemede bakılacak), parçalar arasında kısa boşluk, açık linkin 5 sn'lik yedek okumasında parça atlanabilir.

## Sıradaki işler

- iPhone'da dene: Yönet'ten 10 sn konuş, sporcu ekranı ilk parçayı ~3-4 sn'de çalmaya başlamalı; boşluk ve kesik var mı bak.
