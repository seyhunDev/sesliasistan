## Nerede kaldım

- Fitness › Program ekle sadeleşti (Seyhun 2026-11-27, örnek onaylı: https://claude.ai/artifact/DWy9QwyLD4YFMKQMX2HDt5). Üç yol var: Kendim hazırla, Hazır program, Uzmanla çalış. Yapay zeka ve PDF/metin silinmedi, "⋯ Diğer yollar" altında.
- Hazır programda saat varsayılan "Tam gün" (saat boş). "Saat seç" ile gün gün saat verilir: `fromTemplate(id, start, times)`. ProgramEditor'da her gün "Tam gün · Saat seç", ✕ ile tam güne döner.
- Uzmanla çalış (`UzmanIstek.jsx`, `/api/uzman-istek`, `lib/fitness/uzmanIstek.js`): süre 1/3/6 ay, hedef, ders programı (PDF/foto, en çok 4 MB), "Planlarımı paylaş" (varsayılan kapalı; türler antrenman, yelken, yaris, tatil, yemek).
  - Kayıt orgs/{org}/uzmanIstekleri. Biçim Admin › Uzman antrenörler çalışmasıyla ortak.
  - Yalnız sunucu yazar, kural değişikliği gerekmez. Ders dosyası Storage orgs/{org}/uzmanDers/{id}/; GET ?ders=<id> sunucudan verir.
  - Aynı kişinin açık isteği varken ikincisi açılmaz. Sporcu paylaşımı her an açıp kapatır ya da iptal eder.
  - Ana hesap Program ekle'den, Kimin için'deki sporcu adına açabilir. Sporcunun Fitness sayfasında da "Uzmanla çalış" satırı var.
- Telefonda denenmedi.

## Sıradaki işler

- Admin tarafı (uzman listesi, atama, istekleri görme) Admin çalışmasında. Uzman listesi hazır olunca sporcuya uzman seçimi eklenebilir.
- Uygulamada zaten bir ders programı var (DersCard, /schedule). İstekte dosya yerine o da gönderilebilir.
- Uzman hesabı açılınca paylaşım izni açık türlerdeki planlar gösterilecek; planlar istekte kopyalanmaz.
