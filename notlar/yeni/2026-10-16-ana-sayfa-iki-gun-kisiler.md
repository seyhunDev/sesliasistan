## Nerede kaldım

- Ana sayfa takvimi iki gün, doğum günü rozeti, kişi şeridi (Seyhun: "takvimde bugün ve yarın, en fazla iki gün; yarın yoksa en yakın gün; altında sırada seni bekleyenler; zilin yanında pastalı yuvarlakta doğum günü sayısı; ana sayfada Instagram gibi yuvarlak kişiler"; telefonda denenmedi):
  - Takvim kartı: hafta şeridi yerine "Bugün" ve planı olan en yakın gün ("Yarın" ya da "Cmt 18 Eki"), her birinde saat (yoksa "Tüm gün") ve başlık. Gün başlığına dokununca o günün penceresi (yoklama, fitness; `DayPick`). Altında "Sırada seni bekleyenler": sonraki 4 plan (gün yazılı) ve "N şey seni bekliyor" (`twoDays`, `dayHead`, homeTiles.js; SiradaCard.jsx).
  - Zilin solunda, bugün doğum günü varsa pastalı yuvarlak rozet ve sayı; tek kişide dokununca kişinin sayfası, birden çokta liste (`BirthdayBadge`, PeopleStrip.jsx).
  - Ana sayfanın en üstünde yuvarlak kişi şeridi: Kişiler'deki herkes (silinenler hariç), baş harf ve ilk ad; bugün doğum günü olan önde ve yeşil halkalı (`storyPeople`, `PeopleStrip`).
  - Kişi sayfası ayrı işte yapılıyor (rota `/people/p/[uid]` olacak). Şimdilik sporcu kartı (`/athletes/<id>`) ya da Kişiler'deki grubu açılır; değişiklik tek yerde: `personHref` (homeTiles.js).
  - Kural değişikliği yok, ek okuma yok. Testleri `test:elle` › "takvim iki gün", "kişi şeridi".

## Sıradaki işler

- Kişi sayfası (`/people/p/[uid]`) birleşince `personHref`'i ona çevir.
- Telefonda ana sayfaya bak: iki gün doğru mu, kişi şeridi kaydırılıyor mu, doğum günü olan gün rozet çıkıyor mu.
