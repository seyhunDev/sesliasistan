# Yeni notlar

Her iş (thread, PR) NOTLAR.md'ye doğrudan yazmaz; bu klasöre kendi dosyasını ekler. Böylece paralel PR'lar NOTLAR.md'de çakışmaz.

- Dosya adı: `YYYY-AA-GG-kisa-konu.md` (ör. `2026-10-04-ozel-gun.md`), her iş için yeni bir dosya.
- İçerik: NOTLAR.md'deki başlıklarla aynı bölümler, hepsi isteğe bağlı (kalıcı karar varsa `## Asistan` ya da `## Tasarım` bölümü de yazılır):

```
## Nerede kaldım
- Konu (Seyhun: "…"; telefonda denenmedi): ne yapıldı, dosyalar, testler.

## Sıradaki işler
0. Telefonda ne denenecek.
```

Mac'te `npm run gonder` (ya da `npm run notlar`) bu dosyaları NOTLAR.md'nin ilgili bölümlerinin en üstüne taşır ve siler. Taşınana kadar bu dosyalar da NOTLAR.md'nin parçası sayılır, okunur.
