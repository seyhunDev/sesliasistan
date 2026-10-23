## Nerede kaldım
- Fitness › Sporcular sekmesi yeni tasarımda (Seyhun 2026-10-23 "A · Koyu", örnek /mnt/project-files/fitness/sporcular-tasarim/ornek.png): sayfa baştan sona koyu (`.fit-dark`), üstte ücretsiz lisanslı Unsplash salon fotoğrafı aşağı doğru koyulaşarak kaybolur (yüklenemezse yalnız koyu zemin).
- Üstte bugünün özeti (kaç sporcu antrenmanda, yaptı/bekliyor/yapmadı, bu hafta çubuğu, Gün gün). Her sporcu bir kart: baş harfler, ad, hedef · kaçıncı hafta, sağda bu haftanın halkası; ortada bugünün ya da kaçırılan günün antrenmanı ve durumu; altta Pzt–Paz gün kutuları. Programı olmayanlar ayrı listede "+ Program".
- Kod: `src/features/fitness/FitnessHome.jsx` (`AthTab`, `AthCard`, `athLine`, `FitPhoto`), CSS `.fit-dark` globals.css sonunda. Telefonda denenmedi.

## Sıradaki işler
- Seyhun telefonda bakınca fotoğrafı ve koyuluğu beğenmezse değiştir. Benim ve Beslenme sekmeleri eski görünümde; istenirse aynı koyu tasarıma geçir.

## Tasarım
- Fitness › Sporcular: baştan sona koyu (#0b1628 → #060d1a), kart #13233d, vurgu #67e8f9, seçili sekme #0ea5c4, yaptı nane #9fe7c6, yapmadı #f3a39a. Süre hiçbir yerde yok.
