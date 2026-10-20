## Nerede kaldım

- Asistan motoru 2. adım (süre sınırları) yapıldı (`src/lib/ai/budget.js`).
  - Asistan ucu toplam ~9,5 sn içinde biter. İlk parça ~4 sn'de gelmezse kalan süreyle yedek model denenir; süre kalmadıysa zaman aşımı döner.
  - İş listesi ucu 9 sn içinde biter.
  - Telefon asistanı 14 sn, iş listesini 12 sn bekler (önceden 25 ve 18 sn).
  - Bağlantı kopması ya da hızlı ağ hatasında telefon bir kez sessizce yeniden dener. Kota, zaman aşımı, anlaşılamayan yanıtta denemez; cevabın bir kısmı okunduysa da denemez.
  - Süre kaydında yeniden deneme `retry` olarak görünür.
- Netlify sınırı daha uzunsa `AI_BUDGET_MS` ortam değişkeni ile uzatılır (5-25 sn).
- Puanlı çalışma haritası: /mnt/project-files/asistan/calisma-haritasi.md

## Sıradaki işler

- Küçük veri özeti ve kısa yanıt sınırı.
- Doğal cevap kalıpları (eksik bilgiyi teklif eden cümleler).
- Hızlı kalıplar ölçme (Firestore kuralı).
- Fatura, harcama, okunmamış mesaj soruları telefonda.

## Asistan

- Doğal konuşma kararı: işi yapan kod sonucu bildiği için cümle yerelde, değişkenli kurulur. Yapay zekaya ikinci kez cümle yazdırılmaz (her komuta 1,5-3 sn ve kota eklerdi).

## Tasarım

- Plan eklerken ön bilgi (Seyhun, 20 Ekim): bugünse saati geçmiş planlar, yapılmış ve iptal planlar "bir plan daha var" diye söylenmez. Cümle: "Bilgin olsun, bugün “X” (18:00) planın da var. İstersen “planları aç” de." Birden çoksa sayı söylenir. Aynı saatte (±90 dk) plan varsa: "Bilgin olsun, o saatlerde “X” planın da var."
