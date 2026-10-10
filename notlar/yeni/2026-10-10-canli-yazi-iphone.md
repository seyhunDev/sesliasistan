## Nerede kaldım

- Dinlerken söz kutuya yazılmıyordu (Seyhun: "imleç duruyor ama söylediğim yazıyla gösterilmiyor"; telefonda denenmedi). Olası neden: iPhone'da ses motoru (AudioContext) mikrofon izni beklendikten sonra açılıyordu, dokunuşun dışında açılan motor askıda kalıyor, ham ses toplanmıyor; o zaman kaydın tamamı m4a olarak gidiyordu, Gemini bu biçimi her zaman kabul etmiyor. Şimdi motor dokunuş anında açılır (`preCtx`, useSpeech `start`), kaydın tamamı WAV'a çevrilip gönderilir (`liveWhole`). Neden kesin değil: Ayarlar › Asistan süre kaydı'nda her sesli komutta "Canlı yazı …" satırı artık yazı gelmediyse nedenini de yazar ("istenmedi (ses parçası toplanmadı)" ya da "gelmedi: N istek, N boş (Gemini 400), ham ses yok"; `speechLiveTry`, `liveOf`; sunucu boş ara yazıda `why`).

## Sıradaki işler

- Telefonda dene: konuşurken yazı kutuda 2-3 sn'de bir geliyor mu. Gelmiyorsa Ayarlar › Asistan süre kaydı › son sesli komut › "Canlı yazı" satırını yaz.
- Kalıcı çözüm önerisi (Claude/ChatGPT gibi): ses sürekli akışla (WebSocket) Gemini Live'a gider, kelimeler söylendikçe döner; sunucu yalnız kısa ömürlü anahtar verir. Seyhun onaylarsa yapılır.
