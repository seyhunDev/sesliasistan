## Nerede kaldım
- Tehir tek yol (Seyhun 2026-11-04 "teyir alanlar farklı çalışıyor; her şekilde karada mı denizde mi seçebilmeliyim; deniz bir dakika, karada en az bir saat"). Tehir çekilen yerler: Yayın › Süre › Bayrak (AP, AP üzeri H, saatli 1-9 sa, AP üzeri A), geri sayımdaki kırmızı "Tehir" (Süre kartında ve alt çubukta), İptal › Tehir (VoidSheet). Hepsi artık aynı Tehir penceresini açar (`openAp`, Bayraktan `apFromFlag`): İner, Yer (Denizde / Karada), İnince, Sebep. Bayrak yalnız ön seçim yapar (AP/H → Karada, AP 3 → 3 saat, iniş saati hesaplı). AP üzeri A (bugün yarış yok) doğrudan çekilir ve tehir çekiliyken de Bayrak'ta görünür.
- İndirme tek yol `lowerAp`: "Tehiri indir", inişi gelince kendiliğinden, eski tehir işaretinin İndir'i (`lowerSig` artık tehiri de indirir). `apLower`: İnince "kendiliğinden" seçiliyse denizde 1 dk, karada 60 dk sonra uyarı işareti ve geri sayım kendiliğinden (`apGap`); "Ben başlatırım" seçiliyse geri sayım elle. Eskiden karada hep elle idi, artık seçilebilir (60 dk).
- Tehirin bayrağı artık `plan.sig`'e yazılmaz; `plan.ap.hours` + `plan.ap.land`'den `apSigId` (AP / AP/H / AP3). Böylece #1174'teki "tehir indi ama işaret ekranda kaldı" hatası kökten kalkar; eski kayıtlardaki işaret tehir çekilince, düzeltilince ve inince silinir.
- Yer her zaman yazar: `apText` / `apPlace` "Rüzgâr yok · Denizde" ya da "· Karada" (Yayın tehir kartı, canlı ekran rozeti ScAp, ApBlock).
- Test yaris.mjs "tehir: her yerden tek pencere…"; eski kaynak testleri yeni koda göre güncellendi.

## Sıradaki işler
- Telefonda/TV'de denenmedi. Karada tehir inince canlı ekran 60 dk "Tehir indi · Start yakında" gösterir; istenirse "Uyarı işareti en erken 13:05" gibi yazı.
- Tek gruba tehir, "Canlıya hangi grup" sohbetinde (bu tehir mantığının üstüne).
- Sesle tehir çekme/indirme yok (ana asistan).

## Asistan
- Tehir kuralı: denizde AP inince 1 dk sonra uyarı işareti; karada (AP üzeri H) inince en az 60 dk sonra. Her tehirde yer seçilir.
