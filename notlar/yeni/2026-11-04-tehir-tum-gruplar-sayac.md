## Nerede kaldım
- Tüm gruplara tehir (Seyhun 2026-11-04 "bütün sınıflara tehir çektim ama sarı grubun geri sayımı devam ediyor"): `postpone` artık start anı gelmemiş bütün startları (`pendingIds`, bu telefonun sayacında olmasa da) programın başına döndürür ve sayacı durdurur. Tek gruba tehir o grubun bütün süren geri sayımlarını döndürür. Başka telefon tehir çektiyse (plan.status "ap" ya da sayaçtaki start silindi) bu telefonun sayacı da durur.
- Tehir inince 1 dk sonraki kendiliğinden geri sayım tek gruba tehirdeki satırları atlar (ilk tehirsiz satır; hepsi tehirdeyse başlamaz).
- "Tehiri indir ile yine tehir penceresi açılıyor": tek gruba tehir çekiliyken alttaki düğme "Tehiri indir · Sarı" olur ve indirir; Bayrak penceresinde üstte "Tehirde · İndir · Sarı".

## Sıradaki işler
- Telefonda denenmedi. Tehir penceresi tek ekran (kaydırmasız) telefon + Mac tasarımı örnek bekliyor.
