## Nerede kaldım

- Canlı yayın gün sonu: "Gün bitti" sahnesi yok; rüzgâr (beklenen/esen), yarış sonuçları, genel sıralama (her zaman "Geçici", "Tümü" düğmesi), yarın beklentisi açılıp kapanan kartlarla akıyor, podyum var (`EndHero`, `endScenes` LiveScreen.jsx; `lv-gcard` liveScreen.css).
- Kart başlıkları turuncu-pembe geçişli değil: koyu zemin, alt kenarda tek pembe çizgi, normal yazım (Seyhun: "turuncu başlık eski görünüyor").
- Yayın › yarış oluşturma 3 adım: 1 Sınıf (hepsi seçili gelir, olmayan çıkarılır), 2 Grup (seçilen her sınıf için grup), 3 Bayrak (start sırası özeti). Plan `sets` alanı; `raceOrder` sets üzerinden start sırası kurar (lib/raceLive.js).

## Sıradaki işler

- Telefonda ve gerçek yarış gününde denenmedi.
- Veri her 4 sn okunuyor (~45k okuma/gün); değişince gönderme önerildi.

## Tasarım

- Yayın kart başlıklarında renk geçişi (gradyan) kullanılmaz; tek vurgu rengi ince çizgi olarak.
