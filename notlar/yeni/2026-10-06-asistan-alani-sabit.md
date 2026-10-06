## Nerede kaldım
- Asistan alanı sabit yükseklikte (Seyhun: "iş yazısı gelince küre ve yanındakiler yukarı kalkıyor, baştan tasarla; 2026'ya yakışan, rahat kullanılan"; telefonda denenmedi): kubbe açılınca bir kez yükselir, sonra boyu değişmez. Üç kat: üstte konuşma alanı sabit yükseklikte (görünen ekranın %45'i; yazılar alttan yukarı dolar, fazlası içinde kayar), ortada durum şeridi (h-8, iş yazısı yokken de yeri ayrılı; "Plan hazırlanıyor…" buzlu cam kapsülde, `.dome-chip` globals.css), altta küre satırı (4.75rem). İş yazısı önceden kürenin altına ekleniyor, küreyi ve düğmeleri yukarı itiyordu; dinlerken konuşma alanı farklı boydaydı; yazma satırı küre satırından kısaydı. Artık yazma satırı da 4.75rem. Dokun konuş/dokun gönder, kaydırınca küçülme, renkler ve koyu mod aynı (TabBar.jsx `Dome`).

## Sıradaki işler
0. Asistanı aç, bir iş söyle: "… hazırlanıyor" yazısı çıkınca küre ve yanındaki düğmeler yerinden oynamamalı; cevaplar ve kartlar gelince alanın boyu değişmemeli. Konuşma alanı fazla büyük ya da küçük gelirse yeni threade yaz (%45 değeri TabBar.jsx'te).

## Tasarım
- Asistan açıkken kubbenin boyu sabit: konuşma alanı, durum şeridi, küre satırı; hiçbir yazı ya da durum küreyi oynatmaz (2026-10-06).
