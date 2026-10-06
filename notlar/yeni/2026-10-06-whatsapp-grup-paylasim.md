## Nerede kaldım

- WhatsApp grubuna paylaşım menüsüyle (Seyhun: "telefon numarasında mesaj hazır geliyor ama grupta WhatsApp açılıyor, öyle kalıyor; Sporcular grubuna gitsin"; telefonda denenmedi): WhatsApp'ın gruba metinle açılan bağlantısı yok (wa.me yalnız telefon numarasına çalışır, grup davet bağlantısı metin almaz, Business API gruba yazamaz). Asistan kartındaki yeşil WhatsApp düğmesi, "Gönder + WhatsApp" ve "WhatsApp grubuna da gönder" artık WhatsApp'ın sohbet seçimini değil telefonun paylaşım menüsünü açar: üstteki son sohbetlerde WhatsApp'taki Sporcular grubu çıkar, tek dokunuşla metin gruba hazır gelir, Gönder'e basılır. Metin panoya da kopyalanır. Paylaşım desteklenmezse (Mac Chrome) eski yol (wa.me/?text=). Plan iptalindeki WhatsApp düğmesi de aynı (`shareText`, cancelPlan.js). Testleri `test:asistan` › "Mesaj ve WhatsApp".

## Sıradaki işler

- Asistana "Perşembe 9.30 antrenman, sporculara ve WhatsApp grubuna gönder" de, "Gönder + WhatsApp"a bas; paylaşım menüsünün üstünde WhatsApp Sporcular grubu görünüyor mu, dokununca metin hazır geliyor mu. Grup üstte görünmüyorsa WhatsApp simgesine dokun, grubu ara; bir kez gönderince sonraki seferlerde üstte çıkar.
