## Nerede kaldım

- Yayın'da "Ayrı aç" ve ⋯ menüsündeki "Ekranı aç" artık "Ekrana aç": canlı ekran (/canli/<id>) Safari'ye değil uygulamanın içinde açılır (`openInApp`, src/features/liveScreen/InAppBack.jsx). "Örnek yarışı aç" da uygulama içinde. "Linki kopyala" aynı.
- Uygulamadan açılınca /canli sol üstte geri düğmesi (ortak BackButton) çıkar; iPhone/iPad uygulamasında sol kenardan sağa kaydırınca Yayın'a döner. Linkle (Safari, TV) açılan ekranda düğme yok. Üst sayaç kartı düğmenin yanından başlar (liveScreen.css `html[data-inapp]`).
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda: Ekrana aç → kaydırarak geri, Mac/iPad'de geri düğmesi.
