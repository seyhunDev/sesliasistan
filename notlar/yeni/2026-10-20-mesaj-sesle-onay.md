## Nerede kaldım

- Mesaj gönderme kuralı değişti (Seyhun 2026-10-20, karar kartı). Asistan mesajı artık 3 sn çubukla kendiliğinden göndermiyor. Akış:
  - Asistan "<alıcı> için mesaj: “…” Göndereyim mi?" der. Sesli yanıt açıksa bu cümleyi okur.
  - Sesle istendiyse mikrofon bir kez kendiliğinden açılır.
  - "gönder" ya da "evet" denince mesaj gider, "hayır" denince vazgeçilir. Başka bir değişiklik söylenirse taslak ona göre düzelir.
- Yapay zekanın "yapıyorum, onayını bekliyorum" gibi kendi cümlesi bu adımda kullanılmıyor; cümle hep aynı kalıpta.
- Kod: `src/features/assistant/isler/mesaj.js` (`prepareSend`). Ekran testi `scripts/asistan-ekran-test/adimlar.mjs` içindeki "Ege'ye yaz" adımları.
- iPhone'da denenmedi.

## Sıradaki işler

- Telefonda Seyhun'un gördüğü hata: "FIRESTORE (12.19.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) Failed to delete record from object store". Bu, telefondaki Firestore önbelleği (IndexedDB) hatası; ayrıca incelenecek.

## Asistan

- Mesajlar sesle onaylanır: okunur, mikrofon açılır, "gönder" ile gider. 3 sn çubuk yalnız kayıtlarda kalır. Silme ve para işleri de onay ister.
