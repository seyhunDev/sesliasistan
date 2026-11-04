## Nerede kaldım

- Yayın'a elle yükleme yerine siteden gelen belgeler (Seyhun 2026-11-04 "sporculara PDF, Excel yüklüyorum ya, artık gerek kalmasın"). Durum:
  - Sporcu listesi ve renk listeleri zaten sunucuda `raceLive/{yarış}/entries/list`'e yazılıyordu (#1118); Yayın › Sporcu, gruplar ve dönüşler aynı belgeyi okur, ek iş yok.
  - YENİ: yarış talimatı, ek talimat, program belgesi Yayın programına da yazılır (`raceLive/{yarış}.plan` daily, times, off, agenda). Okuyucu Yayın › Program'daki ile aynı: `src/lib/ai/raceProgramAi.js` (/api/race-program da onu kullanır). Talimat bütün programı yazar, ek talimat yalnız geçen günleri değiştirir (`sitePlan`, lib/siteDocs.js). "Geri al" planı da döndürür.
  - Sonuç PDF'leri yarış sayfası açılınca telefonda işlenir (sporcularımız ayrı projede); canlı ekran sonuçları dönüşlerden alır.
- Telefonda ve gerçek PDF'le denenmedi.

## Sıradaki işler

- Yayın › Program'daki "Programı ekle" ve Kayıt listesi yükleme düğmeleri kalsın mı (yedek olarak), Seyhun'a sor.
