## Nerede kaldım

- Seyhun 2026-10-21: "Bitir'e tıklıyorum, bitmiyor, süre devam ediyor." Bitir yerelde dört durumda (yarış/antrenman, yarışa bağlı ya da değil) duruyor. Bulunan hata: yarış sayfası açılırken raceLive belgesindeki eski (süren) sayaç, telefonda sonradan bitirilmiş sayacın üstüne yazılıp sayacı yeniden başlatıyordu (ör. antrenmanda Bitir, sonra yarış multimedyayı açınca). Düzeltme: yerel sayaç her yazışta `at` taşır; açılışta belgedeki sayaç yalnız daha yeniyse alınır (`takeTimer`, `Countdown.jsx` write).
- Start · Şamandıra 1 · 2 · Finish kareleri: yarış sırasında dokununca startan beri geçen süreyi yazar; + / − şamandıra ekler/çıkarır. Yalnız "+ Yarış yap" ile yarış açılmışsa ve start geçtiyse çalışır; düz startta boş kalır. Seyhun'a ne olacağı soruldu.

## Sıradaki işler

- Kareler için Seyhun'un seçimi (yarış yokken gizle / tamamen kaldır / kalsın).
- Telefonda Bitir yine durmazsa hangi sayfada, kamerada mı Süre ekranında mı olduğunu sor.
