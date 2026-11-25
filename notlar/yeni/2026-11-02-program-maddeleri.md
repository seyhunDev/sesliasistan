## Nerede kaldım

- Programı ekle (yapay zekâ) artık her günün bütün maddelerini okur (`items`: saat + Türkçe kısa ad; antrenör toplantısı, ilk start, son start saati, ödül töreni). `plan.agenda` = { gün: [{ at, text }] } (`cleanAgenda`, lib/raceProgram.js); Yayını sıfırla korur.
- Canlı ekran Program (`agendaView`): yarış öncesi bütün program gün gün; yarış günü o günün maddeleri, saati geçen soluk "Yapıldı", sıradaki vurgulu. Bekleme vitrininde, videolu gösterimde ve sol şeritte (turuncu bayrakta sıradaki startlar kalır). Program yüklenmediyse eskisi gibi günün startları.
- Yayın › Program'da seçili günün maddeleri listelenir. Yarış talimatı yüklemesinden ayrı (Seyhun: ileride birleşebilir).
- Gerçek PDF ile yapay zekâ denenmedi (bulutta anahtar yok); telefonda denenmedi.

## Sıradaki işler

- Seyhun gerçek program PDF'iyle denesin; maddeler yanlış okunursa istem düzeltilir. Maddeleri elle düzeltme yok (istenirse eklenir).
