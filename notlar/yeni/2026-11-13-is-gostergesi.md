## Nerede kaldım

- Tek iş göstergesi (Seyhun 2026-11-12 "arka planda çalışıyor, göstermemiz lazım", 2026-11-13 "Yap"; örnek https://claude.ai/artifact/83osfDaPSdcwkcMHu8aej1): üstte lacivert hap `src/components/ui/JobPill.jsx`, depo `src/lib/jobs.js` (startJob, jobStep, jobDone, jobFail, jobClose, runJob). Kısa bildirim (`useToast`) de aynı hapta; toast ayrı bir şey olarak kalmadı. CSS globals.css "İş göstergesi" (.jb-*).
- Bağlı işler: TFF'den yarış ekleme (`siteTake.js` set → iş; 4 adım, belgeler got/total), sonuç yükleme (`resultsImport.importResults` → bütün ekranlar ve siteden gelen sonuçlar), evrak hazırlama (`RaceEditor` make). Düğmelerdeki "Sonuçlar okunuyor…", "Hazırlanıyor…", "Ekleniyor…" yazıları kalktı (düğme yalnız kapalı).
- Telefonda denenmedi.

## Sıradaki işler

- Kalan işleri bağla: talimat okuma, ses adları (NamesSheet), bütçe, Yayın program/yarışçı listesi, video yükleme, fiş/fatura/banka okuma, ders programı, envanter, Instagram (tespit tablosu örnek sayfada).
- Sunucuda süren TFF belge işleri (race-site-background) için Firestore'dan "busy" belgeleri göstergeye yansıt.

## Tasarım

- Uzun süren her iş `lib/jobs.js` ile göstergeye yazılır; düğmeye "…okunuyor" yazısı konmaz. Bitmiş iş 4 sn kalır (tek zamanlayıcı depoda). İç içe ToastProvider'da (canlı ekran) işler yalnız dıştaki hapta.
