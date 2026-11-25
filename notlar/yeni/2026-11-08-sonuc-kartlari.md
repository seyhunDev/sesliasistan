## Nerede kaldım
- Sonuç görünümü yenilendi (örnek 2 onaylı, /mnt/project-files/sonuc-tasarim/ornek2-telefon.png): tek ortak parça `src/features/athletes/ResultCards.jsx`, biçim globals.css `.rs-*`. Yarış sayfasının üstü (RaceDayTop) ve Takip › Sonuçlar (RaceTrack) aynı kartları gösterir.
- Kartta: renk grubu sol çizgisi, büyük sıra /kişi sayısı, ad, grup etiketi (fl, yoksa grp), kategori/kızlar sırası, ↑↓ değişim, NET puan; altında yarış yarış kareler (atılan yarış kesik çerçeve, ceza kırmızı, en iyi yarış grup renginde). Kareler `resultSheet.raceCells`.
- NET için sonuç satırına `pts` eklendi (rankOurs + cleanResults). Eski sonuçlarda fl/r/pts yok; sonuç yeniden yüklenince gelir.

## Sıradaki işler
- Seyhun'dan örnek geçici sonuç PDF'i gelince sütun adları (rh) ve atılan/ceza biçimi gerçek dosyayla denenecek.

## Tasarım
- Sporcu sonucu her yerde ResultCards ile gösterilir; ayrı satır tasarımı yapılmaz.
