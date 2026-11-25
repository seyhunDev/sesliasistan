## Nerede kaldım
- Aynı anda iki kişi Yayın'da (Seyhun 2026-11-04 "iki telefonun birbirini ezmesi"; telefonda denenmedi): `starts` ve `plan.order` bütün liste yazılıyordu, son yazan öbürünün değişikliğini silerdi. Şimdi yazmadan önce sunucudaki liste okunur (runTransaction, 4 sn sınır) ve yalnız bu telefonun değiştirdikleri uygulanır: `lib/raceLive.js` mergeStarts (kimlikle: benim değiştirdiğim/eklediğim/sildiğim, öbürünün yenisi kalır) ve mergeOrder (satır çıkar/ekle). Son görülen liste `raceLiveStore.noteLive` (useLiveSync dinlerken). İnternet yokken eskisi gibi bütün liste yazılır (o risk sürer).
- Yayın programı (tehir, bekleyen startlar, bayrak…) artık öbür telefona da canlı gelir (eskiden sayfa yeniden açılana kadar gelmiyordu): `BroadcastPage.jsx` live.plan izleme; kendi değişikliğinden sonraki 3 sn'de gelen eski kayıt atlanır (`markLocal`/`sinceLocal`).
- Test yaris.mjs "Aynı anda iki telefon".

## Sıradaki işler
0. İki telefonla Yayın: biri Sarı'yı bitirirken öbürü Kırmızı'yı başlatsın; ikisi de kalmalı. Birinde tehir çekilince öbüründe de görünmeli.
