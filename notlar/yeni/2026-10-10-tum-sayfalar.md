## Nerede kaldım

- Ana sayfa › Tümü penceresi düğme sayfası oldu (Seyhun: "tümü sayfası özelliklerimizin butonlarının olduğu sayfa, butonları güzel sıralı gösterelim, ana sayfada ekli olanları farklı gösterelim; sade, temiz"; örnek `/mnt/project-files/ana-sayfa/tum-sayfalar-dugmeler.png` onaylandı; telefonda denenmedi): üstte açık yeşil kutuda "ANA SAYFADA 7/7" (ana sayfadaki kısayollar), altında "DİĞER SAYFALAR" Günlük, Kulüp, Yönetim, Sosyal başlıklarıyla 4 sütun düğme (ana sayfadakiler burada tekrar etmez). Düğmeler ana sayfadakiyle aynı. Sağ üstte "Düzenle": ana sayfadakilerde kırmızı −, diğerlerinde yeşil +, dokununca çıkar/ekler, "Bitti" kapatır. Bir önceki sürümdeki (#278) arama ve açıklamalı satırlar kaldırıldı. Kural değişikliği yok, ek okuma yok (`HomeActions.jsx`). Testi `test:elle` › "tüm sayfalar: düğme sayfası".

## Sıradaki işler

- Telefonda Tümü'yü aç: Düzenle › bir sayfaya + (ana sayfa kutusuna geçmeli), bir kısayola − (aşağıya inmeli), Bitti.

## Tasarım

- Tümü penceresi düğme sayfası: ana sayfadakiler üstte ayrı kutuda, diğerleri grup grup düğme; düzenleme köşedeki −/+ ile (2026-10-10).
