## Nerede kaldım

- Yayın › Ekran sekmesi evre atamalarıyla yeniden yapıldı (Seyhun 2026-11-04 "yarış öncesi şu video, yarışta şu drone; o sahnede şunu göster, sonra parkuru, rüzgârı; otomatik geçiş neye geçiyor belli değil").
- Evreler kendiliğinden belli olur (lib/raceRounds `evreOf`): Yarış öncesi, Start, Yarışta, Yarış sonrası (gün bitti dahil), Tehir.
- Her evreye görüntü (Ekrandaki, bulanık foto, canlı kaynak, grubun kamerası, tekneler, kayıt) ve gösterilecekler sırası (Görüntü, Süre, Program, Rüzgâr, Parkur, Genel sıralama, Sıradaki yarış) + her birinin süresi (8-30 sn) atanır. Verisi olmayan atlanır.
- Ekran sekmesinin üstünde "Şimdi" kartı: evre · ekrandaki öğe, kaç sn sonra hangisi, evrenin ne zaman geçerli olduğu; "Ekranda tut" ile öğe sabitlenir, Otomatik sıraya döner.
- Veri: `raceLive.courseShow.ev.<evre> = { vid|null, items[], sec }` (yalnız o alan yazılır: raceLiveStore `saveEvre`), `courseShow.pin` (`savePin`). `saveCourseShow` artık ev/pin yazmaz. Eski `courseShow.vid` (sahne videoları) ev yoksa evrelere taşınır; eski `scene` okunmaz.
- /canli: `scPick` → `showPlan` ile öğe, `itemScene` ile mevcut Sc01-Sc06 çizimi (Sc01 `only` ile tek öğe). Sc0x içleri değişmedi.
- Telefonda denenmedi.

## Sıradaki işler

- Canlı rozetinin altında starttan beri geçen süre, sınıf · grup, rüzgâr; rozetin yanındaki saat kalkacak (Seyhun 2026-11-04).

## Tasarım

- Ekran sekmesi: önizleme, Şimdi kartı (Ekranda tut çipleri), Evreler listesi (kapak + evre + görüntü + öğe sırası, ekrandaki kırmızı ŞİMDİ), dokununca evre penceresi (Görüntü, Gösterilecekler: Yukarı / Çıkar / + Ekle, Her biri N sn).
