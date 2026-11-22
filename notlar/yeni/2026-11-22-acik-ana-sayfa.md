## Nerede kaldım

- Ana sayfa açık temaya geçti (Seyhun 2026-11-22 "renk cümbüşü göz yoruyor; Apple beyazı, beyaz ve gri tonlar"; örnek ana-sayfa/sade-2026-11/acik-ana-sayfa.html). `IpadHome` `main.iph.acik`.
- Yapı: globals.css `.acik` (açık renk değişkenleri + `--wx-*` hava/grafik, `--wc0…4` rüzgâr, `--sky-*` gök). `.navy` aynı `--wx-*` değişkenlerini lacivert değerlerle tanımlar; WxPanel (HavaPanel, WindChart, DayCell, Spark, windColor) renkleri bunlardan alır, hava sayfası lacivert kalır.
- `body:has(main.acik)`: sol menü (`--sn-*`, SideNav row) ve alt çubuk açık; logo koyu (VeloraGlyph currentColor).
- Takvim planları rüzgârsız, tek satır (`.iph-pl`: saat · nokta · başlık · yer; telefonda yer gizli), süren plan `.iph-pl-now`. Eski `.iph-pc/.iph-pr/.iph-pw` silindi.
- + Ekle, Tümü, Yoklama, Yönet ortak `btn` düğmeleri.

## Sıradaki işler

- Diğer sayfalar sırayla `acik`'a geçecek (önce Hava sayfası; sonra Takvim). Her sayfa: `<main>`'e `acik`, sabit lacivert renkleri değişkene çevir.
- Sağ sütundaki kartlar (RaceLive koyu kutu, Kulüp özeti) açık temada telefonda denenecek.

## Tasarım

- AÇIK TEMA temel (2026-11-22): `.claude/skills/velora-tasarim/SKILL.md` en üstteki "AÇIK TEMA" bölümü.
