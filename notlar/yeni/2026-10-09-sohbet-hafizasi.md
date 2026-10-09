## Nerede kaldım

- Asistanda ortak sohbet hafızası ve tek bekleyen soru (inceleme adım 4; telefonda denenmedi): (1) Sohbette az önce konuşulan yarış, kişi, sporcu, gönderi ve kayıt tek yerde tutulur (`memo`, `remember`, `memoFor`, `memoBlock`, convoContext.js) ve ana yapay zekaya (`/api/assistant`) ve görev listesi planlayıcısına (`/api/tasks`) "SOHBETTE AZ ÖNCE KONUŞULANLAR" olarak gider. Böylece "Ayşe'yi kişilere ekle" sonrası "ona mesaj at", yarış açıldıktan sonra "o yarış için…", sporcu eklendikten sonra "onu arşive al" anlaşılır (sporcu göndermesi yerelde de çözülür, `isPronoun`). Sohbet kapanınca sıfırlanır. (2) Asistanın bekleyen soruları (yarış seçimi, mesaj alıcısı, onay, kişi, günlük tarihi, fatura, sporcu adı, yarış takibi, etkinlik, envanter silme) artık tek kurala bağlı: yeni bir soru sorulunca öncekiler kapanır, sohbet kapanınca hepsi kapanır (`waitFor`, `ASK_EMPTY`, `asksToClear`). Önceden eski bir soru açık kalıp sonraki cümle yanlışlıkla ona cevap sayılabiliyordu. Kural değişikliği yok. Testleri `test:asistan` › "Sohbet hafızası (tek yer)", "Tek bekleyen soru".

## Sıradaki işler

- Asistana "Ali Kaya'yı sporcu olarak ekle" de, ardından "onu arşive al" de; Ali Kaya arşive alınmalı. Bir yarışı açtırıp "ona Ayşe'yi de ekle" ve "bunun için gönderi hazırla" de.

## Asistan

- Sohbetteki göndermeler ("o", "onu", "bunun için") tek sohbet hafızasından çözülür; asistan aynı anda yalnız bir soru bekler, yeni soru eskisini kapatır (2026-10-09).
