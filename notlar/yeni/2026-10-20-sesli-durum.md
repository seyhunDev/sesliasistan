## Nerede kaldım

- Sesli durum cümleleri (Seyhun, 2026-10-20): Ayarlar › Sesli yanıt AÇIKSA asistan
  - yapay zeka beklenirken hemen hazır cümleyi söyler ("Tamam, planı hazırlıyorum.", "Bakıyorum.", "Tamam, sırayla yapıyorum: mesaj, takvim ve not."; ön cevap yoksa "Hemen ilgileniyorum."),
  - sonra gelen cevabı (akışta cümle cümle) okur,
  - onay bekleyen işte soru sorulmadıysa "Onayını bekliyorum." ekler,
  - sıralı işlerin sonunda hepsi yapıldıysa "Tamam, hepsi yapıldı." der; her adım bir önceki okunduktan sonra başlar.
  - KAPALIYSA eskisi gibi yalnız yazı (okuma isteği "notlarımı oku" yine "Sesli yanıtı aç" düğmesi çıkarır).
- Kod: `src/lib/sayLines.js` (startLine, spokenReply), `beyin/yapayZeka.js`, `beyin/cevap.js`, `beyin/gorevListesi.js` (sıradaki iş konuşma kuyruğunu bekler), Ayarlar › Sesli yanıt alt yazısı.
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun sesli yanıtı açıp birkaç istek denesin; cümleler uzun/kısa mı söylesin.

## Asistan

- Eski kural "yalnız okuma isteğinde oku" (#524) değişti: Sesli yanıt açıksa her cevap ve hazır durum cümleleri okunur; kapalıysa hiçbir şey okunmaz, yazı gösterilir.
