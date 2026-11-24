## Nerede kaldım
- Antrenör hesabı: ana hesap kişi kartında (çalışan türü) "Antrenör" çipini açar; `/api/staff` PATCH `coach` → `users/{uid}.coach`. Antrenörün kendi Yönet'i var (`/bilgi/yonet`), verisi kulübünkinden ayrı: `orgs/k-{uid}` (bilgi, bilgiKanal, bilgiLog, bilgiPusula); açık link ve tekne/ses/iz belgelerinde `org = "k-{uid}"`. Kendi kanalını açar, linki kendi sporcularına gönderir. Antrenörde kulübün yarış pencereleri (Sonuçlar/Gruplar/Program) ve Antrenman kaydı (yoklama, günlük) yok.
- Kural: `firestore.rules` `isCoachSpace`, `bilgiAdmin` (yayınlanmalı).
- Normal kullanıcı (çalışan, aile, diğer; `isPlain`): alt çubuk Ana sayfa · Takvim · Kulüp (/sailing) · İngilizce; Mesajlar menüde. Menüden gizlenenler (silinmedi): Toplantı, Arşiv, Gemiler, Kameralar, Dersler, Antrenman. Ana sayfada kota satırı ve takvimdeki Yönet yok, İngilizce satırı var; antrenörde Yönet satırı. Ayarlar 8 satır.
- Sporcu, öğrenci, veli değişmedi. Ana hesap değişmedi.

## Sıradaki işler
- Telefonda dene: bir çalışana Antrenör işareti ver, onun hesabıyla Yönet › Kanal aç › link › sporcu telefonunda aç; konum, mesaj ve bas-konuş geliyor mu.
- Fiş, Fitness, Alışveriş, Doğum günü normal kullanıcıda kaldı (Seyhun cevaplamadı); istenirse `homeTiles.js` `o.plain` ile gizlenir.

## Asistan
- "Antrenman sayfasını aç" / "geri sayımı aç" (nav.js trainingDay) artık `need: "yonet"`: sporcu yetkisi olan ana hesap ya da antrenör açar.
