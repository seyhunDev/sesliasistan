## Nerede kaldım

- Ana sayfa › Tümü › "Kısayolları düzenle" çalışmıyordu (Seyhun: "ekle çıkar yapamıyorum, değiştirme yapamıyorum"; telefonda denenmedi): seçim `users/{uid}.homeLinks`'e yazılıyordu ama uygulamanın profil nesnesi (AuthProvider) bu alanı taşımıyordu, ana sayfa hep varsayılan 7 kısayolu gösteriyordu; çıkarılan geri geliyor, yenisi "en çok 7" diye eklenemiyordu. Artık profil `homeLinks`'i okur. Aynı nedenle zildeki bildirimler (`inbox`, `inboxSeen`) de hiç görünmüyordu; ikisi de profile eklendi (bildirimler ana sayfa görülünce okundu yazılır, simgedeki sayı sıfırlanır). Kural değişikliği yok. Testi `test:elle` › "kısayollar: düzenleme".

## Sıradaki işler

- Kısayolu dene: Tümü › Kısayolları düzenle › bir kısayola dokun (işaret kalkar), Fitness'a dokun (işaret gelir), Bitti; ana sayfada Fitness görünmeli. Zile dokun, son bildirimler listede görünüyor mu bak.
