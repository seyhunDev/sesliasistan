## Nerede kaldım
- Velora Sailing artık Velora'nın içinde tam ekran açılıyor: `/sailing` sayfası (`src/app/(app)/sailing/page.jsx`), /sanal ile aynı yol. Ana sayfadaki "Velora Sailing" kartı oraya gider (ok ›), sekme çubuğu bu sayfada yok (TabBar `isMedia`), asistan "Sailing'i aç" diyebilir (`nav.js` sailing).
- Giriş: `/api/sailing-giris` anahtarı (`sailingToken`, `externalLinks.js`) çerçeve adresinin # kısmında gider; Sailing onunla Velora hesabıyla açılır.
- Çerçeve güvenli alanın içinde (çentik/Dynamic Island payı lacivert). Sailing çerçevede olduğunu anlar, üst çubuğunda "‹ Velora" düğmesi gösterir, `{ type: "velora-sailing", event: "close" }` gönderir; burada geri (ya da ana sayfa) gidilir.
- Dışarıda açmak isteyen için `openSailing()` duruyor (yeni sekme / Safari).

## Sıradaki işler
- Gerçek iPhone'da dene: yan çevirince Sailing yatay açılıyor mu, çerçevede oturum kalıyor mu, ses/titreşim.
- İstenirse sporcu/veli ana sayfalarına da Sailing kartı.

## Tasarım
- Gömülü dış sayfalar (Sanal, Sailing) tam ekran, sekme çubuğu yok, dönüş düğmesi gömülü sitenin kendi üst çubuğunda (Sailing) ya da sol üstte (Sanal).
