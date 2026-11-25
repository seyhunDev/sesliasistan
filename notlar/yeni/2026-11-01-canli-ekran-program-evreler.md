# Günün programı ve canlı ekran evreleri (2026-11-01)

## Nerede kaldım
- `raceLive.plan` (lib/raceLive.js `cleanPlan`): day, at (ilk start "11:00"), order [{cls, grp}], status "" | "ap" (ertelendi) | "none" (bugün yarış yok) | "done" (gün bitti), next {day, at} (yarının ilk startı), showAt (ekranın yeni güne geçeceği saat, varsayılan 06:00). `savePlan` (raceLiveStore), /api/canli `plan` döndürür.
- Yayın sayfası › Program bölümü: İlk start (Bugün / Yarın + saat), start sırası (üstteki Sınıf · Grup seçimi "Sıraya ekle" ile eklenir, Çıkar), "Start ertelendi", "Bugün yarış yok", "Günü bitir" (sonra Yarın ilk start ve Ekran yeni güne geçer saatleri).
- Canlı ekran evresi (`livePhase`): bekleme (sayaç yok, bugün start yok): ilk start'a geri sayım (saat:dk:sn), yarış adı · yer, tekne / sınıf / grup sayısı, start sırası, erteleme ya da "Bugün yarış yok"; yanında ekrandaki yayın (deneme için YouTube) ve genel sıralama. Yarış: sayaç başlayınca ya da bugün start kaydı olunca bugünkü üç sütun, sayacın altında "Sıradaki start" şeridi. Gün özeti (Günü bitir): kaç yarış yapıldı, her yarışın birincisi, rüzgâr grafiği (kn, saat), yarın ilk start; sağda genel sıralama. Ertesi gün showAt'te (06:00) yeni günün bekleme ekranı.
- Zemin: üstte açık deniz mavisi, altta koyu lacivert; arkada soluk parkur (şamandıra, kesik rota, start hattı).
- YouTube: ytId watch / youtu.be / live / embed / shorts bağlantılarını tanır; Ekranda › Canlı yayın satırına yapıştırıp Göster.
- Ekran görüntüleri `project-files/samandira-donus/yayin2/bekleme-*.png`, `ozet-*.png`.

## Sıradaki işler
- Telefonda denenmedi; gerçek yarış gününde evre geçişleri (bekleme → yarış → özet → yeni gün) izlenmeli.
