## Nerede kaldım

- Yarış › Özet, Evrak gibi gruplu tek liste oldu (Seyhun: "Özet sekmesinde de aynı tekrarlar olmasın, evrak sekmesine benzer bir düzen"; örnek onaylandı `/mnt/project-files/yaris-tasarim/ozet-tek-liste-1.png`; telefonda denenmedi): ayrı HAZIRLIK ve YAPILACAKLAR listeleri kalktı. Gruplar: Kayıt · Talimat (talimat işleri, "Son tarihleri planlara ekle"), Sporcu, Evrak (durum + Velilere imzalat, Okullara ver, GSİM'e ver), Yolculuk (durum + yurt dışı işleri), Bütçe, Diğer işler (elle eklenenler + "İş ekle"). Grubun başında durum satırı (dokununca o sekme, sıradaki adım vurgulu), altında işleri; sağda "2/4" ya da "tamam/eksik". "Evrakları hazırla" işi ayrıca görünmez (Evrak durum satırı aynı şey). İşlemler'deki "Son tarihler" düğmesi Kayıt · Talimat grubuna taşındı. Not, İşlemler, Talimat bilgileri, Yarışı sil aynı (RaceEditor.jsx `groups`, `headRow`, `taskRow`). Kural değişikliği yok.

## Sıradaki işler

- Telefonda bir yarışın Özet'ine bak: gruplar doğru mu, bir işi yapıldı işaretle, × ile çıkar, Diğer işler'e iş ekle.

## Tasarım

- Yarış Özet ve Evrak aynı düzende: grup başlığı, grubun başında durum, altında o konunun işleri; aynı iş iki yerde görünmez.
