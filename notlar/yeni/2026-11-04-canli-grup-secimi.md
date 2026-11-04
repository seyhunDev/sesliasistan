## Nerede kaldım
- Canlıya hangi grup + görüntünün grubu + start sırası (Seyhun 2026-11-04: "canlı yayına hangi grubun yarışının alınacağını yönetebilmeliyiz"; "drone'a sen mavi grup demişimdir, canlıda mavi grubun yayını olduğu görünmeli"; "sarı, mavi, kırmızı diye sıralamak istiyorum"; telefonda denenmedi):
  - Yayın › Süre "Ekranda" kartının altında grup şeridi: Otomatik + bugün süren (yarışta, geri sayımda) ve biten yarışlar. Seçilen `raceLive.onAir.sid`, canlıda büyük; süren diğer gruplar sol altta küçük satır (`ScOthers`, biten kalkar). Satırdaki ▶ ve "Ekrana al" kalktı (tek yer şerit). `BroadcastPage.jsx` `airPick`.
  - /canli: Canlı rozetinin yanında görüntünün grubu ("Mavi grup", renk noktası) yalnız start dizisinde ve yarışta, video varken. Canlı yayın = ekrandaki yarışın grubu; drone/kaynak = Kameralar'da bağlandığı grup (`lib/raceCams.js` `videoGroup`, `LiveScreen.jsx` `ScTop grp`, `sahne.css .sc-lgrp`).
  - Kurulum (Sınıflar ve gruplar) 2. adımda "Start sırası" listesi: seçim sırasıyla gelir, "Öne al" ile değişir (sınıfın ilk grubunda bütün sınıf öne geçer). Kaydedince bekleyen startlar da yeni sıraya dizilir (`lib/raceLive.js` `setsUp`, `orderBySets`). Sınıflar artık sabit listedeki sıraya değil seçim sırasına göre.
  - Test: yaris.mjs "Canlıda grup ve start sırası"; eski "Ekrana al"/▶ denetimleri şeride çevrildi (yaris-ekran-test senaryolar.mjs da).

## Sıradaki işler
0. Telefonda: iki grup başlat, şeritten Mavi'yi seç → canlıda Mavi büyük, Sarı sol altta satır; Kameralar'da Drone 1'i Mavi'ye bağla, Video'da drone'u ekrana al → Canlı yanında "Mavi grup". Kurulumda Kırmızı'yı "Öne al" → Süre'de bekleyenler yeni sırada.
1. Tek gruba tehir (plan.ap gün yerine grup), Yayın'da aynı anda iki kişi çalışınca birbirinin kaydını silmemesi (starts/plan alan alan yazma).
