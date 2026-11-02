## Nerede kaldım

Yayın sohbetinin (Profesyonel yarış yayını tasarla) ilk adımı: yayın verisinin düzeltmeleri. İnceleme ve yeni tasarım /mnt/project-files/yayin-tasarim/ içinde (inceleme-ve-yeni-duzen.md + görseller).

- Şamandıra dönüşleri ve günün grup listesi HİÇ kaydolmuyordu, çünkü Firestore iç içe diziyi ([[…]]) kabul etmiyor. Yeni biçim: rounds[start].legs = { "0": { s: [yelken], t: [ms] } }, grup listesi groups[gün] = { yelken: grup } (lib/raceRounds.js toStore/cleanEntry, roundsStore.saveGroups; roundScore.cleanGroups eski biçimi de okur).
- İki görevli aynı startın farklı şamandıralarına yazınca birbirinin girdiğini silmez: saveRounds(…, entry, base) yalnız değişen noktaları yazar (entryPatch). Parkur değişirse bütün kayıt yazılır.
- Her numaraya söylendiği anın saati yazılır (tm: [{ yelken: ms }]). Canlı ekranda lidere fark görünür (+0:21, gapAt).
- Ceza kodları OCS, BFD, UFD, DSQ, DNF, RET, DNS (entry.pen). Sesle: "OCS 512", "kara bayrak 88", "512'nin cezası kalksın" (roundSay op pen, api/round-say). Cezalı tekne en altta yer alır, puanı grup sayısı + 1 olur, finişte arkasındakiler bir sıra öne gelir.
- Grup grup yarışta ortak numara (start.grp): Sarı 3, Mavi 3, Sarı 4, Mavi 4 (renumber, nextRaceNo(…, grp), beginRace grp). Yayın'da grup değişince numaralar yenilenir. Program da aynı numarayı gösterir.
- Aynı anda iki yarış: bugünün bitmemiş startları canlı sayılır (liveStarts). Canlı ekranda grup düğmeleri ikisini de gösterir. Yayın'da satırdan "Yarış bitti" ile bitirilir.
- Yayın sayfası dönüşleri canlı dinler (watchRounds).
- Yelken no: 312 ile 1312 artık aynı tekne sayılmaz (sameSail tam eşleşme arar; whoOf adı yalnız tek bir sondan eşleşme varsa bulur).

## Sıradaki işler

- Yeni yayın düzeni (yayin-tasarim görselleri): künye, sağda kaydırılır genel sıralama, şamandıra anı kartı, yarışlar arası ekranı, gün sonu, telefon sekmeleri.
- Yayın özeti belgesi + canlı dinleme (/api/canli'nin 4 sn'lik sorgusu günde yaklaşık 45 bin okuma yapıyor), YouTube kaplaması (OBS), Yayın masası, görevli bağlantıları.
- Arka plan fotoğrafı başka bir siteden (sail-world.com) geliyor: yarışa kendi fotoğrafımız yüklenmeli.

## Asistan

- Dönüş girişinde ceza sesle girilir: "OCS 512", "kara bayrak 88", "512 diskalifiye", "512'nin cezası kalksın".
