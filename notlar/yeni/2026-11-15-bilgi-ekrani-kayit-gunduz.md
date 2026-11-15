## Nerede kaldım

- Bilgi ekranı gündüz beyaz zemin + siyah kalın yazı, güneş batınca lacivert (Seyhun 2026-11-15 kart: "Gündüz beyaz, akşam lacivert"). `BilgiScreen.jsx` isNight: Dikili gün batımı (`lib/attRemind.js` sunsetHM), doğuş güneş öğlesine (zaman denklemiyle) göre simetrik. Renkler `.bz` CSS değişkenleri (`--bz-*`), gündüz `.bz-day`.
- Mesaj günlüğü: her mesaj ve bas-konuş `orgs/{org}/bilgiLog` { kind msg|ses, text, dur, at, label, state, course } ("ne zaman, ne için"). Yönetimde "Gönderilenler" (son 30, açılınca bir kez okunur). Ses kaydının kendisi saklanmaz, yalnız süresi.
- Pusula kaydı: ekran açıkken saniyede bir [sn, yön, yatış (gamma), baş-kıç (beta)] (derece, tam sayı), 60 örnekte bir tek belge `orgs/{org}/bilgiPusula` { uid, name, at, pts (düz dizi, 4'lü), n }. Saatte ~60 yazma, okuma yok. Yönetimde "Pusula kayıtları": kişi başı oturum (3 dk boşluk ayırır), süre, ölçüm sayısı, en çok yatış.
- firestore.rules: `bilgiPusula` sporcu/çalışan yalnız kendi uid'iyle ekler (pts ≤ 400). Seyhun konsoldan yayınlamalı.
- Telefonda denenmedi.

## Sıradaki işler

- Pusula kaydından kafaya açma / orsalama açısı çizelgesi (oturuma dokununca yön eğrisi, tack anları, ortalama yön).
- Telefonun teknede nasıl durduğuna göre yatış/baş-kıç ekseni (dikey/yatay montaj) netleşmeli.

## Tasarım

- Bilgi ekranı gündüz beyaz zemin, siyah kalın yazı, mavi yalnız şimdi/geçen işaretlerinde, şamandıra turuncu; akşam lacivert.
