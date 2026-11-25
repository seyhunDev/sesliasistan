## Nerede kaldım
- Spor seçimi (Seyhun: "Velora Sailing olsun, kayıtta spor sorulsun; Diğer'de yakında gelecek sporlar; eski kullanıcılara da bir kez göster"; telefonda denenmedi): `src/sports` eklendi. `SportPick` ekranında "Hangi spor?" sorusu var: Sailing veya Diğer. Diğer, seçilemeyen sporların listelendiği "Yakında" ekranını açar (Tenis, Koşu, Yüzme, Bisiklet, Futbol, Kürek). Sailing seçilince tekne dalgada süzülür, ardından "Velora Sailing" yazısı belirir. Arka planda hareketli gece denizi var (`SeaBackdrop`). Kayıt sayfası önce bu ekranı açar, formda "Sailing · Değiştir" görünür. `register(..., sport)` seçimi `users/{uid}.sport` alanına yazar. Spor seçmemiş hesaplar (eski hesaplar, ana hesap dahil) uygulama açılınca `SportGate` ile aynı ekranı bir kez tam ekran görür; seçim alana yazılır. Kurye hesaplarına sorulmaz. Profil belgesi gelmeden ekran çıkmaz.
- Yeni spor bu depoya eklenir. `SPORTS` listesine sporu, `src/sports/<spor>/parts.js` dosyasına da o spora özel bölümleri ekle. Yelkene özel sayfalar bugünkü yerinde (src/features/…) kalır; ileride menü ve ana sayfa `useSport().has("races")` ile hangi bölümün gösterileceğine bakar (henüz bağlanmadı).
- Firestore kurallarında değişiklik gerekmedi.

## Sıradaki işler
0. Telefonda ve iPad'de dene: uygulama açılınca "Hangi spor?" ekranı bir kez çıkmalı, Sailing'e basınca animasyon oynamalı ve ardından ana sayfa gelmeli; uygulama yeniden açılınca ekran bir daha çıkmamalı.
1. Başka spor eklenince menü, ana sayfa ve Tümü düğmeleri `hasPart` ile süzülecek.

## Tasarım
- Spor seçimi (2026-11-12): tam ekran lacivert gece denizi kullanılıyor; dalgalar akar, uzakta bir yelken süzülür. Seçenekler buzlu cam kartlarda duruyor, Sailing elektrik mavisi. Bu ekran, Seyhun istediği için degrade ve hareketli arka plan kuralına istisnadır.
