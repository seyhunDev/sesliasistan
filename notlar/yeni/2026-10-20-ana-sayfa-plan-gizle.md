## Nerede kaldım

- Ana sayfa listesinde plan gizleme (Seyhun 2026-10-20: "her plan ayrı, hem de toplu: yalnız 10 gün kalanları göster"):
  - Yarın ve Sırada satırlarının sağ üstünde gizle düğmesi (göz) → HideSheet: 10 gün / 20 gün / − N + gün kala; planın `homeDays` alanı. Gizliyse "Hep göster".
  - Sırada başlığının sağında toplu ayar ("Tümü" ya da "10 gün kala") → users.homeDays: yalnız N gün kalan planlar listede.
  - Planın kendi ayarı toplu ayardan önce gelir (homeHidden). Gizlenen plan takvimde hep görünür. Altta "N plan gizli" (dokununca toplu ayar) · Takvim ›.
  - Test elle.mjs "listede gizlenen plan". Telefonda denenmedi.
