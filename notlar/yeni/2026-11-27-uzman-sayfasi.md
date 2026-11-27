## Nerede kaldım

- Admin › Uzmanlar › istek detayı: atama artık "seç + onayla" (önerilen uzman seçili gelir, "<ad> ata" düğmesi). Atanan istek "Bekleyen istekler"den çıkar; atanmış istekte "Atanan uzman" kartı, "Uzmanın sayfası" ve "Değiştir".
- Yeni sayfa `/settings/admin/uzman/[id]` (`src/features/admin/UzmanSayfasi.jsx`, yalnız ana hesap): uzmanın Yeni gelenler / Sporcuları / Bitenler listesi; her sporcuda hedef, süre, ders programı dosyası, paylaştığı planlar (3 hafta, `paylasilanPlanlar` lib/uzman.js), o sporcuya hazırlanmış fitness programları; "Program hazırla" (Fitness'teki yapay zeka / boş / PDF / şablon penceresi o sporcu seçili açılır: `/fitness?hazirla=<uid>`), Kabul et, Bitti.
- Admin `?sekme=uzman` ile Uzmanlar sekmesi açılır.
- Telefonda denenmedi. Kurallar değişmedi.

## Sıradaki işler

- Uzmanın kendi hesabıyla girişi (rol "uzman", yalnız kendi sayfası; kurallar hazır: uzmanlar uid, uzmanIstekleri uzmanUid ile okunur).
