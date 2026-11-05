## Nerede kaldım
- Uygulama içi /canli sayacı telefonun kendi sayacından (training/Countdown "sa-sayac", own = Yayın yolu) okur, saat sunucuya çevrilir; buluttaki sayaç 5 sn'den yeniyse (başka cihaz) o geçerli. Saat 250 ms'de bir. Herkese açık linkte hep buluttaki (useLocalTimer).
- Start penceresi: geri sayım sürerken bekleyen gruplar gizli (aynı grup "Sırada" diye ikinci kez çıkmıyordu); bekleyenlerde "Sırada" yerine "N. yarış".
- Yarıştaki gruba dokununca: süre ya da finiş penceresi, İlk finiş / −5 dk / +5 dk, Bitir, Abandone (lib/raceLive openWin, moveWin, finishRace; useRaceFlow save, voidNow; Yayın › Süre ile aynı kayıt).
- Finiş penceresinin kendiliğinden bitmesi ve DNF yazımı hâlâ Yayın sayfası açıkken çalışıyor (BroadcastPage winTick); pencere bittiyse okumada bitmiş sayılır.
- Telefonda denenmedi.

## Sıradaki işler
- winTick'i (ilk finişte pencere açma, süre bitince Bitir, DNF) ortak bir yere alıp canlı ekranda da çalıştırmak.
