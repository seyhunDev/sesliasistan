## Nerede kaldım
- Admin › Uzmanlar (Seyhun 2026-11-27 "yap", örnek project-files/admin-sayfasi/uzmanlar.html; telefonda denenmedi): Admin'e dördüncü sekme. Üstte bekleyen sporcu istekleri, branş süzgeci, branş branş uzmanlar, "+ Uzman" penceresi (ad, branş + yeni branş, uzmanlık + yeni etiket, sporlar, yaş, şehir, en çok sporcu, online, pasif, telefon, e-posta, not; düzenle/sil). Uzman detayı (Sporcu / Boş yer / Bekleyen, uzmanlık, kime, giriş hesabı, sporcuları). İstek detayı (branş, spor, süre, hedef, ders programı dosyası `/api/uzman-istek?orgId=&ders=`, paylaşım, durum) ve puanlı "Önerilen uzmanlar" (dokununca atanır), Başladı / Bitti / Reddet / Yeniden aç. "Örnek veri ekle / sil" (5 uzman, 2 istek, ornek: true).
  - Kod: `src/lib/uzman.js` (BRANSLAR, SPORLAR, YASLAR, branslar(ayar), uzmanPuan, oneriler, uzmanTemizle, örnek veri), `src/features/admin/Uzmanlar.jsx`. Veri: `orgs/{org}/uzmanlar`, `orgs/{org}/uzmanIstekleri` (sporcu tarafı Fitness çalışması `/api/uzman-istek` ile sunucudan yazar; alanlar sporcuUid, sporcuAd, by, brans, spor, yas, sehir, uzmanId, uzmanUid, sure, hedef, ders, paylas {acik, turler}, durum bekliyor|atandi|kabul|ret|bitti|iptal), ana hesabın eklediği branşlar `orgs/{org}/ayar/uzmanlik`.
  - Eşleştirme (100): branş şart; spor 30 ("Hepsi" 15), yaş 25 (bilinmiyorsa 12; 12 yaş ve altına çocukla çalışmayan uzman önerilmez), aynı şehir 20 / yalnız online 15, hedef uzmanlıkla örtüşüyor 15, boş yer 10 (dolu -40).
  - firestore.rules: ileride uzman girişi için `uzmanlar` (uid) ve `uzmanIstekleri` (uzmanUid) yalnız okuma. Konsoldan yayınlanmalı (uygulama yayınlamadan da çalışır).
  - Test: `npm run test:elle` "Uzman antrenörler" 10/10.

## Sıradaki işler
0. Telefonda: Örnek veri ekle, isteğe dokun, öner/ata, + Uzman ile gerçek uzman ekle, örnek veriyi sil.
1. Uzmanın kendi girişi (role "uzman", uzman.uid), sporcu tarafında uzman seçimi (Fitness çalışmasına haber verildi), uzman puanlaması/ücret/müsait günler.
