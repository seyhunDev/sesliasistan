## Nerede kaldım

- Admin › Uzmanlar sadeleşti (örnek project-files/admin-sayfasi/uzman-bolumu.html, Seyhun "yap"): üstte "Uzman bekleyen sporcular" (atanmamış istekler, "Ata"), altında uzmanlar; satırda kaç sporcusu ve bu hafta yüzde kaç yapıldığı. Uzman yeşil, sporcu mavi (avatar + UZMAN/SPORCU etiketi).
- Uzmana dokununca doğrudan uzmanın sayfası (`UzmanSayfasi.jsx`): Sporcu / Bu hafta yapıldı / Geride kalan; Yeni gelen sporcular, Sporcuları (program, hafta n/toplam, bu hafta yaptı/plan çubuğu), Bitenler, Uzman bilgileri + Uzmanı düzenle (UzmanForm). Eski ara "uzman detayı" ekranı kaldırıldı.
- Sporcuya dokununca: program, haftanın 7 günü (yaptı yeşil, yapmadı kırmızı, bugün çerçeveli), son 5 antrenman (süre, not), sporcunun gönderdikleri (hedef, paylaştığı planlar, ders programı); Kabul et / Program hazırla / Bitir.
- Takip saf işlevleri `lib/uzman.js` `sporcuTakip`, `uzmanOzet` (planlar useData().fitOthers; test elle.mjs "Uzman: sporcu takibi").
- Telefonda denenmedi. Kurallar değişmedi.

## Sıradaki işler

- Uzmanın kendi girişi (rol "uzman", yalnız kendi sayfası).
