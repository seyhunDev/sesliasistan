## Nerede kaldım

- Fatura, harcama ve okunmamış mesaj soruları artık telefonda cevaplanıyor (`src/lib/infoAsk.js`, `isler/sorular.js` infoAskCmd).
  - "Ödenmemiş faturalar neler": sayı, toplam ve en büyük 3 fatura. Yalnız ana hesapta; fatura listesi yüklenmediyse soru yapay zekaya gidiyor.
  - "Bu ay ne kadar harcadık": kulüp fişlerinin toplamı ve en çok harcanan 3 kategori. Aralıklar: geçen ay, bu hafta, bugün, dün. "Kişisel" ya da "harcadım" denince kişisel fişler sayılıyor.
  - "Okunmamış mesajım var mı", "kim mesaj atmış": okunmamış sohbetler ve sayıları; tek sohbetse son mesaj da söyleniyor. Arşivdekiler sayılmıyor.
- Ön cevap düzeltmesi: "planlar" ve "not aldım" soru cümlesinde artık ekleme sanılmıyor. Örnek: "bu ay hangi planlar var?" için önceden "planı hazırlıyorum" deniyordu.

## Sıradaki işler

- Hızlı kalıp ölçüm verisi gelince "hazır" türleri yapay zekasız çalıştırmak.
- Diğer işlerde de eksik bilgi teklifi: görevde son tarih, mesajda alıcı.
