## Nerede kaldım
- Asistan dokun konuş + ortada olaylar (Seyhun 2026-11-06: "basılı tut yerine tıklamalı, arka fon blur, alttan bir şey açılmasın, ortada olaylar, önceki hafif blurlaşıp kaybolsun"; örnek /mnt/project-files/asistan/tiklamali onaylandı; telefonda denenmedi). `TabBar.jsx` `usePress` artık tıklama: boşta dokun dinle, dinlerken dokun gönder (düğmede beyaz ↑), iş sürerken dokun durdur (kare), boştayken basılı tut yaz. Asistan açılınca tam ekran bulanık zemin (`.afull` tam boy, `afull-sm` ve `.adim` kalktı), sağ üstte ×. Söylenen söz ortada (`Said`, dalga + süre); sohbette yalnız son iki olay, önceki `aprevout` ile bulanıklaşıp kaybolur (globals "DOKUN KONUŞ"). `Thread.jsx` kapsayıcısı `athread`, kullanıcı satırı `data-role="user"`. Ekran testi (`test:asistan-ekran`) dokunuşa uyarlandı.

## Sıradaki işler
0. Telefonda ve iPad'de dene: dokun konuş, dokun gönder, iş sürerken durdur, cevap ortada, önceki söz kayboluyor mu.

## Asistan
- Dokun konuş (2026-11-06): asistan düğmesi basılı tutulmaz; dokun başlar, tekrar dokun gönderir. Alttan pencere yok, bulanık tam ekran, olaylar ortada.
