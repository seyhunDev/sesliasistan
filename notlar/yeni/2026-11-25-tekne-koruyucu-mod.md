## Nerede kaldım

- Tekne ekranı Koruyucu mod (Seyhun 2026-11-25, örnek https://claude.ai/artifact/ABEg2JCSW8kZM12JbMbCck onaylandı): telefon kılıfla tekneye
  takılınca kenarlar kapanıyor. Katılma kartında "Koruyucu mod: Kapalı · Az · Orta · Çok" (≈2/4/6 mm; `.bz-kor-s/m/l` --bz-g 0.75/1.5/2.5rem),
  seçim bu telefonda `localStorage` "sa-bilgi-koruyucu". Açıkken `.bz` ana kutusu dört kenardan içeri alınır (güvenli alan ile boşluğun büyüğü),
  içeride güvenli alan yeniden eklenmez (bilgi.css'te `env(safe-area-inset-*)` yerine `--bz-st/sr/sb/sl`, koruyucu modda 0). `transform` ile
  içerideki fixed katmanlar (ceza uyarısı, notlar) da kutuya sığar. Dışta `BilgiKenar` (sayfa düzeyinde, /bilgi ve /ekran/[key]) siyah şerit,
  dokunuşları yutar. Ekran açıkken düğme yok (yanlışlıkla değişmesin): Çıkış, sonra yeniden Katıl. Telefonda denenmedi.
- iPhone alttan kaydırma çizgisi ve üstten açılan menüler uygulamadan kapatılamaz.

## Sıradaki işler

- Denizde denedikten sonra boşluk miktarlarını ayarla (gerekirse kenar başına ayrı ayar).

## Tasarım

- Sporcu Tekne ekranında yeni kenara yapışan öğe eklerken `env(safe-area-inset-*)` değil `var(--bz-st/sr/sb/sl)` kullan, yoksa koruyucu modda kenar boşluğu iki kez eklenir.
