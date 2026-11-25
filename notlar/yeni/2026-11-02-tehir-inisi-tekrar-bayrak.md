## Nerede kaldım

- Tehir (AP) yeni mantık: Tehir → "İner" 1 dk / 5 dk / 15 dk / 30 dk / 1 sa sonra ya da Belirsiz + sebep → "Tehir çek". Geri sayımdaysa sayaç durur, yarış programın başına döner.
- AP zamanı gelince kendiliğinden iner (belirsizde ya da erken: "Tehiri indir"). İnince 1 dk sonra uyarı işareti: sıradaki yarışın geri sayımı (seçili süre, ör. 5 dk) kendiliğinden başlar. Kokpitte kart: iniş saati ve kalan, sonra "Tehir indi" ve uyarıya kalan; "Bekle" otomatik başlatmayı durdurur.
- Veri: plan.ap.down (iniş anı, "" belirsiz), plan.warn (uyarı işareti anı), plan.warnBy (geri sayımı başlatacak telefon; o yoksa 4 sn sonra açık olan başka Yayın sayfası başlatır). lib/raceLive.js apRaise, apLower, apDue, warnDue, trHm. Canlı ekran: "Tehir 12:05'de iner, start 12:11", inince "Tehir indi · Uyarı işareti 12:06".
- Genel geri / Abandone sonrası aynı start (aynı sınıf, grup, numara) programın başına bayraksız döner; sayaç yerine resimli bayrak seçimi ("3. yarış tekrar · bayrak"), seçince Başlat, "‹ Geri" bayrağa döner.
- Takip yalnız Yayın sayfası açıkken çalışır. Telefonda denenmedi.

## Sıradaki işler

- Yayın kapalıyken iniş zamanı geçerse canlı ekran hâlâ "iner" yazar; gerekirse sunucu tarafında da indirilebilir.
