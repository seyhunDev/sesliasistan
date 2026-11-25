## Nerede kaldım
- Yayın › Parkur alt kısmı sadeleşti: "Hangi grup hangi kartta" (her grup bir satır, yanında kart seçimi A | B…; yalnız birden çok kart ve grup varsa), Konumlar tek satır 6 küçük kutu (✓ girildi, — girilmedi, sapma varsa °), ölçümlerden yalnız son ölçüm (Tümü ile hepsi).
- Ayrı "Konuş" (useSpeech + onCourseSay) kalktı. İş çubuğunda ana asistanın bas-konuş düğmesi (VoiceLight, AskOrb). Parkur açıkken BroadcastPage `setCourseView({ id, day, get, apply })` verir; asistan `isler/yarisMedya.js courseCmd` önce `courseVoice` ile okur (rota, kart türü, rüzgâr/eksen/hat, göreli cümle, gerekirse parkur yapay zekâsı) ve `v.apply` ile yazar. Sorular (courseAsk) ve parkurla ilgisiz cümleler eski yoldan.
- Yeni sesli iş: grubun kartı ("Bronz B kartında", "Altın A parkurunda", "sarı grup kart B") → `groupCardOf` (courseVoice.js), plan.sets'teki gruba course.by yazılır.

## Sıradaki işler
- Telefonda denenmedi; asistan penceresi Yayın sayfasında açılıyor mu, bas-konuş bırakınca gönderiyor mu bakılmalı.
