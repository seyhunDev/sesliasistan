## Nerede kaldım

- Mesajlar: sohbete girip yazı kutusuna ilk dokunuşta yanıp sönen imleç kutunun dışında (mesajların üstünde) kalıyordu; klavyeyi kapatıp yeniden dokununca düzgündü (Seyhun, 2026-10-17; #458 sonrası). Eski yeniden çizdirme imleci aynı yere seçiyordu, iPhone bunu değişiklik saymıyor. Artık yazı bir an değiştirilip imleç başka yere, sonra geri konuyor; odaklanınca 120, 320, 700, 1200 ms'de ve klavye her durduğunda yapılıyor (ChatView `caret`). Telefonda denenmedi.

## Sıradaki işler

- Seyhun telefonda denesin: sohbete gir, kutuya ilk kez dokun, imleç kutunun içinde mi. Hâlâ dışarıdaysa sıradaki deneme: ilk dokunuşta odaklamayı `focus({ preventScroll: true })` ile kendimiz yapıp iPhone'un sayfayı kaydırmasını önlemek.
