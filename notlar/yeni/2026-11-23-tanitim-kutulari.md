## Nerede kaldım

- Ana sayfadaki "Bilgi ekranı" kutusunun adı artık "Tekne Ekranı", alt satırı "Start sayacı · pusula · parkur · antrenör sesi" (Seyhun 2026-11-23, örnek B; /mnt/project-files/tanitim-kutulari/ornek.html, artifact ASzMThRMExENA6qcHM9RPW). Üstte geri sayan sayaç + sallanan pusula önizlemesi, altta Aç / Yönet (Yönet yalnız ana hesap). Sayfaların kendisi (/bilgi, /bilgi/yonet) ve asistan sözleri değişmedi.
- Velora Sailing kutusu animasyonlu (örnek A "açık deniz"): Sailing senaryolarındaki gibi üstten görünüş; start hattı, hakem botu, pin, orsa şamandırası, layline'lar; üç tekne start → tramola → şamandıra → pupa, sol üstte adım adı, mavi tekne "sen". Dokununca /sailing.
- Ortak parça `src/components/ui/IntroTile.jsx` (üstte önizleme, altta ad + tek satır; düğme varsa altta). Animasyonlar `src/features/intro` (sailScene.js hesap, SailingPreview.jsx, TeknePreview.jsx, useLoop.js: yalnız kutu ekrandayken ve sekme açıkken oynar, hareketi azalt açıksa durağan). CSS globals.css `.it*` (koyu görünüm için deniz koyu). Eski LinkTile ve `.lt` kaldırıldı.
- Tekne rotaları çarpışmasın diye lag'ler (0, 1.2, 2 sn) denendi: en yakın iki tekne 35 birim (gövde 23).

## Sıradaki işler

- Telefonda ve iPad'de bak: animasyon akıcı mı, kutu boyları sütunda iyi mi.
- İstenirse sayfa başlıklarında ve sol menüde de "Bilgi ekranı" yerine "Tekne Ekranı".

## Tasarım

- Tanıtım kutuları tek ortak parça IntroTile: üstte canlı önizleme (ne işe yaradığını gösterir), altta ad + ne olduğunu söyleyen tek satır. Animasyon ekranda değilken durur.
