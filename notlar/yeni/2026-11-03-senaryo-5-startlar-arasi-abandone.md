# Canlı ekran senaryo 5: startlar arası ve abandone (2026-11-03)

## Nerede kaldım

- Seyhun'un senaryo senaryo yeniden tasarımında 5. adım: yarış bitti ama sıradaki start henüz sayılmıyor (startlar arası) ve abandone / genel geri.
- İkisi de tehirle (senaryo 3) aynı düzende: videosuz WaitHero (solda durum, Program; ortada parkur sahnesi; sağda rüzgâr), videolu SidePanel alt bandı.
  - Startlar arası (`FinBlock`): "Bitti · Sarı grup · 10:55" etiketi, büyük yarış adı, ilk üç tekne (standings), "Sıradaki · 4. yarış · Sarı grup", "Uyarı işareti bekleniyor".
  - Abandone / genel geri (`VoidBlock`): N / 1. tekrar bayrağı + "Abandone · Sarı grup · 10:50", büyük yarış adı, "Yarış sayılmadı, yeniden start verilecek", uyarı işareti bekleniyor. Tehir (void "Tehir") ise "Start ertelendi".
- LiveScreen: `between` (phase race, sel bitti ya da void, süren yarış yok, near değil, sayaç yok) → `hero`/`side` bekleme düzeni; sıralama paneli, tekne haritası, çipler ve alt şerit kapalı.
- Düzeltme: `voidFlag("İptal")` büyük İ yüzünden N bayrağını bulamıyordu.
- Genel geri ilk 30 dk start geri sayımı ekranında (SeqHero "fs", #1060); sonra bu ekranda VoidBlock ile görünür.
- Ekran görüntüleri: yayin-tasarim/senaryo/5-uygulandi-*.png (örnekler 5-*.png).

## Sıradaki işler

- Senaryo 6 (gün bitti) ve 7 (yarıştan önceki günler): önce örnek.
- Telefonda denenmedi.
