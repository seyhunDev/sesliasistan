## Nerede kaldım

- Ana sayfanın üstü "Sırada" oldu (Seyhun: "antrenman takvimini en üste al, isim bile koymaya gerek yok, altında sırada kısmı"; örnek `/mnt/project-files/ana-sayfa/sirada-takvim-oneri.png` onaylandı; telefonda denenmedi): koyu yeşil Şu an kartı ve alttaki ayrı Antrenman kartı kalktı. Tek kartta üstte başlıksız 7 günlük antrenman şeridi (güne dokununca o günün penceresi, eskisi gibi), altında bugünden sonraki 4 plan: ŞİMDİ (yeşil nokta) / BUGÜN / YARIN / gün adı, saat, başlık; yalnız ilk satırda yer ve rüzgâr. Satıra dokununca plan, yarış planında yarışın sayfası açılır. En altta açık renkli "N şey seni bekliyor" şeridi. Notlar kartı sade: en çok 3 tek satır (yıldız ya da tarih), + düğmesi gölgesiz (`SiradaCard.jsx`, `WeekStrip` HomeSummary.jsx; `upcoming`, homeTiles.js; NowCard.jsx silindi). Firestore'a ek okuma yok. Testi `test:elle` › "sırada listesi".

## Sıradaki işler

- Telefonda ana sayfaya bak: hafta şeridi, Sırada satırları ve notlar örnekteki gibi mi; bir güne ve bir plana dokun.
