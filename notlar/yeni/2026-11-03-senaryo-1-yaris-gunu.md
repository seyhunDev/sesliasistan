# Senaryo 1: yarış günü, start'a 1 saatten fazla (2026-11-03)

Seyhun: "en baştan senaryo adımlarıyla ilerleyerek tasarımları düzelterek gidelim". Adımlar: 1 yarış günü >1 sa; 2 <1 sa / turuncu / geri sayım; 3 tehir; 4 yarış sürerken; 5 iki start arası / abandone; 6 gün bitti; 7 yarışa günler var. Her adımda videosuz + videolu örnek, onay, kod.

## Nerede kaldım

- 1. adım onaylandı ve kodlandı (örnekler yayin-tasarim/senaryo/1-videosuz.png, 1-videolu.png):
  - Videosuz (`WaitHero` → `.lv-hold3`, `data-cols`): solda geri sayım + sıradaki yarış + program; ortada parkur büyük (`CourseCol`: altında Eksen · Start hattı · Ölçüm saati); sağda rüzgâr (`WindCol`: şimdiki rüzgâr, gün boyunca 08–18 saat saat; geçen saatler ölçülen mavi, start saati vurgulu). Sağ üstte "Yarış günü · Pzt 3 Kas · yer" (`.lv-topr`).
  - Videolu (`SidePanel` → `.lv-side.lv-band`): altta bulanık bant, dört blok: geri sayım + yarış (+ start dizisinde bayraklar), Program (3 bekleyen madde), Parkur (rota daireleri, eksen, start hattı), Rüzgâr (şimdi + 6 saat hücre).
  - Eksik bilgi kuralı: olmayan blok çizilmez, kalanlar genişler; "Yok" kutusu yok. Tahmin varsa ölçüm yokken "tahmin" yazar.
  - Yarışa günler varken eski H düzeni (solda gün sayısı + program, sağda parkur / beklenen rüzgâr) duruyor; 7. adımda ele alınacak.
- Yükleme: `useStored` (useSyncExternalStore) ile önbellek ve listeden gelen ad; etki içinde setState yok (lint).

## Sıradaki işler

- 2. adım örneği: start'a 1 saatten az, turuncu bayrak, geri sayım (büyük sayaç, bayraklar, start hattı avantajı).
- Örnek G (parkur sahnesi sade) onayı; yama /mnt/project-files/yayin-tasarim/oncesi-yeni/ornek-g.patch.
- Telefonda denenmedi.
