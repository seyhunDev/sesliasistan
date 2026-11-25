## Nerede kaldım

- Seyhun 2026-11-03 "parkuru görmemiz gerekiyor; tepeden start ve parkur, zoomlayıp uzaklaşmak yönetimden": canlı tekne ekranında örnek trapez parkur (1, 2, 3S/3P kapısı, finiş teknesi + şamandıra, soluk rota). Veri setinde `marks` m1, m2, m3s, m3p, fin1, fin2 (lib/boatPlay.js cleanSet).
- Yakınlık `screen.zoom` 0–100 (yalnız kind boats; varsayılan 100 = Parkur). Yayın › Video'da Tekneler seçiliyken önizleme altında Start · Yakın · Orta · Parkur; ekrandaysa hemen değişir, canlı ekranda 1,2 sn'de yumuşakça kayar (frameMix: ölçek logaritmik, start hattı ortası ekranda kalır). Uzakta yelken numaraları gizli, tekneler küçük.
- Yayında parkur alttaki bilgi şeridinin (~%32) üstüne sığar.
- main'de yaris.mjs'te kalmış çakışma işaretleri (#1067) temizlendi.
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun gerçek koordinatları (komite, pin, orsa şamandırası, 2, 3S/3P, finiş) verecek: örnek veri yerine onlar; ileride Yayın › Parkur'daki işaretli noktalardan.
- Canlı konum akışını (takip/{yarış}/tekne) bu ekrana bağlamak; replay ayrı iş.
