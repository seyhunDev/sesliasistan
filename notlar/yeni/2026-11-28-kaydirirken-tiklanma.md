## Nerede kaldım

- Kaydırırken yanlışlıkla tıklanma düzeltildi (Seyhun 2026-11-28): `src/lib/tapGuard.js`, kök düzendeki `PressFeedback` kurar. iOS gibi yalnız kısa ve kımıldamayan dokunuş tıklama sayılır: parmak 10 px'ten fazla kaydıysa (aşağı çekip geri getirmek dahil), dokunurken sayfa ya da içteki liste kaydıysa, ya da dokunuş süzülen kaydırmayı durdurmak içinse (kaydırmadan 150 ms içinde) gelen click iptal edilir. Kodla yapılan kaydırma (sohbetin kendiliğinden inmesi) sayılmaz: yalnız dokunuştan sonraki 3 sn içindeki kaydırma parmağınkidir. Klavye/fare click'i, input/textarea/select ve `[data-tap-free]` dokunulmaz.
- Hafif titreşim artık tek yerden: gerçek dokunuşta düğme, bağlantı, `[data-press]` öğelerinde `haptic("light")` (iPhone uygulamasında Taptic, Android'de vibrate, iPhone tarayıcısında yok). `Button.jsx` kendi titreşimini bıraktı (çift olmasın). Basılma görüntüsü `usePress` ile aynı (kaydırırken çıkmaz).

## Sıradaki işler

- Telefonda dene: ana sayfada kaydırıp parmağı geri getirince bir yere gidilmemeli; süzülürken dokununca sadece durmalı.
- Sürükleyip bırakınca click bekleyen bir yer çıkarsa o öğeye `data-tap-free` ekle.
