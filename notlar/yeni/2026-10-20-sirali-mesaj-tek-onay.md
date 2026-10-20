## Nerede kaldım

- Sıralı mesajlar tek onayla gidiyor (Seyhun 2026-10-20: "ikisinin birlikte izin alıp ikisini birlikte gönderebilir"):
  - Görev listesinde art arda gelen mesaj işleri tek işte birleşir (`src/lib/chainMessages.js`, `startPlan`).
  - Yapay zekanın döndürdüğü birden çok mesaj (sends) tek kartta gösterilir: "2 mesaj hazır. 1. …: “…” 2. …: “…” Hepsini göndereyim mi?" (`prepareBatch` in `isler/mesaj.js`).
  - "gönder" ya da "Hepsini gönder" ile hepsi sırayla gider; sonuç tek cümle: "İkisini de gönderdim."
  - WhatsApp'lı ya da alıcısı bulunamayan mesaj varsa eskisi gibi tek tek sorulur.
- "Hemen ilgileniyorum." cümlesi artık hiç söylenmiyor (cevap.js, yapayZeka.js).
- Testler: asistan.mjs "Sıralı mesajlar: tek onay" 5/5, ekran testi 92/92.
- iPhone'da denenmedi.

## Asistan

- Art arda mesajlar tek kartta ve tek onayla gider. Beklerken hazır cümle ("ilgileniyorum") söylenmez.
