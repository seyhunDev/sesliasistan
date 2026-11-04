## Nerede kaldım

- Siteden yarış alma arka planda (Seyhun 2026-11-04 "yüklenirken güzel bir animasyon; orayı kapatsam bile yükleme devam etmeli"): `src/features/athletes/siteTake.js` (modül düzeyinde iş, useSiteTasks). Adımlar ilerleme kartında: Yarış ilanı indiriliyor → Talimat okunuyor → Yarış kaydediliyor → Belgeler N/M (sunucu indirdikçe site kayıtları sayılır, dolan çubuk). Ekrandan çıkınca iş sürer; bitince bildirim "… alındı · Aç". Kart geri dönünce aynı yerden görünür; hata olursa yazı + Tekrar dene.
- Uygulama tamamen kapanırsa: belgeleri zaten sunucu indirir; ama talimat okuma telefonda olduğundan yarış henüz kaydedilmediyse yarım kalır (Tekrar dene).
- Belge işleme yine tek yerde (raceSite.claimDoc). Telefonda denenmedi.

## Sıradaki işler

- İstenirse talimat okuma ve yarış açmayı da sunucuya taşımak (uygulama kapansa da yarış açılır).
