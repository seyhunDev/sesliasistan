## Nerede kaldım

- Instagram: profil ızgarasında yazı kesilmesi (Seyhun: "ana ekranda tam oturmuyor, yazılar kenarlardan kayboluyor"; telefonda denenmedi): nedeni Instagram'ın profil ızgarasının her gönderiyi ortadan 3:4 dikey kesmesi. Kare (1080×1080) gönderide sağdan ve soldan 135'er px görünmez, Dikey 4:5'te (1080×1350) yalnız 34'er px. Kare gönderide yazı ve logo artık ortadaki 810 px'te kalır (`safeOf("square")` l/r 66, postImage.js tüm şablonlarda `safeL`). Yeni gönderiler Dikey 4:5 açılır (`freshPost` format portrait; kayıtlı gönderinin boyutu kalır). Önizlemede Kare seçiliyken profilde görünmeyecek kenarlar gri ve kesik çizgiyle gösterilir ("Profilde gri kenarlar görünmez", PostEditor.jsx). Örnek: `/mnt/project-files/instagram/profil-izgara.png`. Testi `test:elle` › "Instagram hikâye" › "profil ızgarası".

## Sıradaki işler

0. Profil ızgarasını dene: yeni gönderi Dikey açılmalı; paylaş, profilinde yazılar kenardan kesilmeden görünüyor mu bak. Kare'ye geçince önizlemede gri kenarlar çıkmalı, yazı onların içinde kalmalı. Eski kare gönderileri yeniden paylaşacaksan Dikey'e çevir.
