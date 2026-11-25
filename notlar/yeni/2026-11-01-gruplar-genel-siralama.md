## Nerede kaldım
- Grup grup yarış ve geçici genel sıralama (Seyhun 2026-11-01; telefonda denenmedi): dönüş ekranında startın grubu seçilir (Mavi, Sarı, Yeşil, Pembe, Altın, Gümüş, Bronz) ya da söylenir ("sarı grup"); kayıt `rounds[startId].grp`. Günün grup listesi kayıt listesi ekranından aynı düğmeyle eklenir (satırlarında grup yazan liste → `entries/list groups[gün]`); varsa numaralar o grupla denetlenir, yoksa grup o startta okunan teknelerdir.
- Puan (`src/lib/roundScore.js` provisional): her yarışta grup içi finiş sırası; yarış bitince (start fin) finiş yapmayan grup sayısı+1 (DNF/DNC); toplam az olan önde, eşitlikte en çok birincisi…, sonra son yarış. Discard yok, resmî PDF'e karışmaz.
- Herkese açık ekran: sıralama kartında grup adı ve aynı yarışın diğer grupları; altında "Genel sıralama" (Geçici · N yarış; Genel/Kızlar/Junior; kulüp, doğum yılı, Y1 Y2… grup renkli). Resmî sonuç PDF'inde net puan varsa ondan "Resmî". `/api/canli` artık kayıt listesini (ad, kulüp, sınıf, doğum yılı, cinsiyet) ve grupları da verir.
- Kayıt listesi okuması doğum yılı, cinsiyet, kategori ve grubu da okur. Yarışın ⋯ › Canlı ekran satırı ana hesapta yarıştan önce de görünür.
- Örnekler /mnt/project-files/samandira-donus/canli-gruplar-genis.png, -telefon.png. Testler yaris.mjs "Gruplar ve genel sıralama", "Gruplar: sesle ve kayıt".

## Sıradaki işler
0. Telefonda: kayıt listesi PDF'i, günün grup listesi, Sesle gir › grup seç › dönüşler; /canli sayfasında genel sıralama.
1. "Kulübüm" süzgeci (genel sıralamada yalnız bizim sporcular) henüz yok.
