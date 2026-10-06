## Nerede kaldım

- Ana sayfa › ÖZET'te yükleniyor görünümü (Seyhun: "uygulama ilk girişte verileri alırken ana sayfadaki özet kısmında modern bir loading yapalım"; telefonda denenmedi): okuması süren kartın (Banka, Fatura, Aidat, Sıradaki yarış) yerinde aynı boyda yanıp sönen iskelet kart durur (simge + ad, büyük sayı, açıklama çizgileri; mevcut `.shimmer`, renkleri temadan, karanlık modda da uyumlu). Bilgi gelince kart yumuşakça belirir (`fade-in`); yalnız iskeletle başlayan kartlar belirir, diğerleri olduğu gibi. Önbellekte bilgi varsa (aidat özeti cihazda, faturalar/yarışlar bellekte, banka mailleri Firestore önbelleğinde) iskelet çıkmaz. En çok 8 sn beklenir, sonra kart boş hâliyle çizilir (`WAIT`, `Skeleton`, HomeSummary.jsx; `loading` useMoney ve useRaceHome'da). Firestore'a ek okuma yok. Kural değişikliği yok.

## Sıradaki işler

- Ana sayfa iskeletini dene: uygulamayı kapatıp aç; özet kartlarının yerinde kısa süre yanıp sönen kutular, sonra kartlar belirmeli. Karanlık modda da bak. Kart bir anda kayıyorsa ya da iskelet hiç gitmiyorsa yeni threade yaz.
