## Nerede kaldım

- Hata (Seyhun 2026-11-15): Bilgi ekranı › Yönet'te geri sayım sürerken "Bas konuş" "Mikrofon izni gerekli" diyordu, sayaç dururken çalışıyordu.
- Sebep: sayaç sürerken TimerSound iPhone ses oturumunu (navigator.audioSession) "playback" kipine alıyor (bipler sessizde de çalsın diye) ve her dokunuşta yeniden alıyor; iPhone bu kipte mikrofonu açmıyor, getUserMedia hata veriyordu.
- Çözüm: `Countdown.jsx` holdMic(on): mikrofon açıkken kip "playback"e alınmaz. Bas konuş mikrofonu açmadan önce holdMic(true) + micReset() (kip "auto", asistan mikrofonu gibi), kayıt bitince holdMic(false). Hata mesajı ayrıldı: izin yoksa "Mikrofon izni gerekli", başka hata "Mikrofon açılamadı".
- Telefonda denenmedi.

## Sıradaki işler

- iPhone'da sayaç sürerken Bas konuş dene; kayıt sırasında bip gelirse kayıt kesilmiyor mu bak.
