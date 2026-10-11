## Nerede kaldım

- Zildeki bildirimler temizlenebiliyor (Seyhun: "görülenleri listeden silebilelim ya da tümü; yeniler dursun; tıklanınca ilgili yere gitsin; günün özetine neden gidilmiyor"; telefonda denenmedi): zil penceresinde BİLDİRİMLER başlığının yanında "Tümünü temizle" (liste boşalır, yapılacaklar kalır); bir bildirimi sola kaydırıp "Sil" (yalnız o kalkar). Silme `users/{uid}.inbox`'tan kalıcıdır (her cihazda), okuma + yazma tek işlemde (`clearInbox`, Inbox.jsx; `inboxDrop`, lib/inbox.js). Okunan bildirim kendiliğinden silinmez, soluk kalır. Günün özeti kaydediliyordu ama adresi "/" olduğu için dokununca hiçbir yere gitmiyordu: sabah/akşam özeti ve rüzgâr uyarısı artık Planlar'ı açar (eski kayıtlar da, etiketten; `inboxLink`), haftalık özet Takvim'i, doğum günü Doğum günleri'ni. Gidecek yeri olmayan bildirime dokununca tam metni pencerede açılır (bildirim metni 200 yerine 400 harf saklanır). Yarış ayrı bildirim göndermiyor; yarış planı hatırlatması plan bildirimi olarak o planı açar. Asistan: "bildirimleri temizle" (`inboxClearAsk`, route `inboxClear`). Kural değişikliği yok. Testleri `test:elle` › "Bildirim kutusu", yönlendirme › inboxClear.

## Sıradaki işler

- Zile dokun: bir bildirimi sola kaydırıp Sil, sonra "Tümünü temizle"; zil sayısı ve "seni bekliyor" şeridi güncelleniyor mu. Yarınki günün özeti bildirimine dokununca Planlar açılmalı.
