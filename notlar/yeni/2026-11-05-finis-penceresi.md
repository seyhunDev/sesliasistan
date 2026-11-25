## Nerede kaldım
- Yayın › Süre finiş penceresi (Seyhun 2026-11-05 "varsayılan olsun değiştirilebilir; başka ceza almadıysa DNF"): ilk tekne Dönüşler'de finişe yazılınca ya da şeritte "İlk finiş"e basılınca 15 dk pencere açılır (`starts[].fw` pencere sonu). Şeritte "Finiş penceresi 12:34", açıkken −5 dk / +5 dk / Bitir. Süre bitince yarış kendiliğinden biter (`cleanStarts` fw geçtiyse fin = fw, sayfa kapalıyken de; `finishRace` bitişi en geç fw), Yayın sayfası açılınca bitirmeyen ve cezası olmayan teknelere DNF yazılır (`dnfPen`, grubun listesi yoksa dönüşte görülen tekneler; `starts[].dnf` bir kez).
- Kod: `lib/raceLive.js` FIN_WIN, openWin, moveWin, winLeft, needDnf; `lib/raceRounds.js` dnfPen; `BroadcastPage.jsx` winTick, WinLeft; `masa.css` .sure-win. Telefonda denenmedi.

## Sıradaki işler
- /canli'de finiş penceresi geri sayımı (Ekran sohbeti, alan `starts[].fw`).
- Geçici sonuç PDF'inde karışık grupları ayırma (Yayın sohbeti; örnek PDF bekleniyor).
