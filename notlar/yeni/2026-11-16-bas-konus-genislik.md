## Nerede kaldım
- Bilgi Yönet bas konuş düğmeleri (Seyhun: "bastığımda genişliği küçülüyor, sabit kalsın, yeşil yansın, telsiz gibi tık hissi"; telefonda denenmedi): `TalkChip` (BilgiAdmin.jsx) ad, sayaç ve en geniş sayaç ("20 sn") aynı hücrede üst üste, düğme genişliği hiç değişmez (ölçek de kaldırıldı). Kayıtta yeşil (`--talk`), 3 px içe basılı kalır, iç gölge + yeşil dalga halkası; bırakınca yukarı çıkar ve basma gibi "medium" titreşim (eskiden gönderirken "light"). Gönderildi ✓ yine yeşil. `.bzy-dock .bzy-to` iç boşluğu halka kesilmesin diye büyütüldü. Tarayıcıda genişlik ölçüldü: normal / kayıt / ✓ hepsi aynı (telefon yatay, iPad).

## Sıradaki işler
0. Telefonda ve iPad'de Bilgi › Yönet'te kişiye ve Hepsi'ye basılı tutup dene: genişlik sabit mi, yeşil mi, bırakınca tık hissi var mı.
