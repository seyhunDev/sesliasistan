## Nerede kaldım

- Bildirim testi düzeltmesi (Seyhun: "Hemen dene geliyor, 30 sn olanların hiçbiri gelmedi; açıkken, kapalıyken, kilitliyken"; telefonda denenmedi):
  - Neden (büyük olasılık): /api/push-tests bekleyen işlevi yalnız `process.env.NETLIFY` varken çağırıyordu; bu değişken işlev çalışırken tanımlı değil, işlev hiç çağrılmadı. Artık isteğin geldiği adres (https) kullanılıyor.
  - Uygulama açıkken zamanı 5 sn geçen deneme gitmediyse sayfa sunucudan hemen gönderilmesini ister (yol "uygulama").
  - Zamanlayıcı (plan-reminders) her çalışmada `system/scheduler` belgesine başlangıç/bitiş yazar (2 yazma / 5 dk). Bildirim testi sayfasında "Zamanlayıcı" satırı son çalışmayı gösterir; 10 dk'dan eskiyse ya da yarıda kaldıysa uyarır. Böylece "bir ara hatırlatmalar geliyordu" sorusu sayfadan görülür.

## Sıradaki işler

0. Telefonda: 30 sn denemesi, kayıtta yol (anında / uygulama / zamanlayıcı), "Zamanlayıcı" satırı. Zamanlayıcı çalışmıyorsa Netlify › Functions › plan-reminders günlüğüne bakılmalı.
