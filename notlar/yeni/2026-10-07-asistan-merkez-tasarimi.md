## Nerede kaldım

- Asistan alanı ikinci kez baştan tasarlandı, adı "Merkez" (Seyhun: "tasarım tamamen farklı olsun, popüler uygulamalardaki kullanıcı deneyimi ön planda"; telefonda denenmedi). Koyu yeşil kubbe ve yüzen adalar kalktı. Boştayken altta açık renkli, kenardan kenara bir sekme çubuğu var (Instagram, WhatsApp gibi): Ana sayfa, Takvim, ortada biraz yukarı taşan yuvarlak yeşil asistan düğmesi, Mesajlar, Görevler. Seçili sekme yeşil, diğerleri gri. Asistan düğmesine dokununca konuşma başlar, basılı tutunca yazarak sorulur. Asistan açılınca sekme çubuğunun yerine alttan beyaz bir sayfa gelir (ChatGPT, Gemini gibi): üstte tutamaç ve kapat (×), ortada sohbet balonları (ekranın %45'ine kadar büyür, sonra kayar), en altta Oluştur (+), yazı kutusu ve ses düğmesi. Durum ses düğmesinin renginden anlaşılır (yeşil bekliyor, kırmızı dinliyor, kehribar çalışıyor, mavi konuşuyor). Koyu modda çubuk ve sayfa koyu renk alır. Oluştur (+) artık asistan açıkken ya da yazarken görünür. Kod: `Dome` (TabBar.jsx), `.atabbar`, `.acenter`, `.asheet`, `.asheet-input` (globals.css); kubbenin yeşil zemini ve beyaz yazı değişkenleri silindi. Aşağı çekip kapatma, klavye, kayıt ekranı ve sayfanın alt boşluğu aynı.

## Sıradaki işler

- Merkez tasarımını telefonda dene: sekmeler, ortadaki düğmeye dokun (konuşma) ve basılı tut (yazma), açılan sayfada + menüsü, ×, aşağı çekip kapatma; koyu modda da bak. Oluştur'a boştayken de kolay ulaşmak istersen yeni threade yaz.

## Tasarım

- Asistan alanı "Merkez": açık renkli alt sekme çubuğu, ortada asistan düğmesi; asistan açılınca alttan beyaz sohbet sayfası (2026-10-07).
