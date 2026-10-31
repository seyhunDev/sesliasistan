## Nerede kaldım

- Anında açılış (Seyhun 2026-10-31: "loading olmasın, uygulama direkt açılsın, değişiklik varsa alalım"): oturum profili ve ana veriler (planlar, görevler, notlar, fişler, doğum günleri, dersler) telefonda kopya olarak tutulur (`src/lib/warmStart.js`, `sa-warm-me` + `sa-warm-data`; 4000 karakterden uzun yazılar ve 2,5 MB üstü kopya yazılmaz). İkinci açılıştan itibaren:
  - Kök düzendeki satır içi betik kopya varsa `html[data-warm]` koyar, açılış ekranı (BootSplash) ilk karede hiç çizilmez; giriş animasyonu ve 0,9 sn en az süre yok.
  - AuthProvider kopyadaki profille Firebase oturumunu beklemeden açar (useLayoutEffect, boyamadan önce); oturum gelince aynı kişiyse sessizce yerine geçer, oturum yoksa kopya silinir ve giriş ekranına gider. `authFetch` oturum gelmeden giden isteği `auth.authStateReady()` ile bekletir.
  - DataProvider kopyayla `ready` açılır, Firestore dinleyicileri arkada tazeler; planların parçaları kopyadan başlar (biri önce gelince diğerleri bir an silinmez).
  - Açılıştan sonraki 20 sn içinde gelen liste kopyadan farklıysa en üstte ince akan cyan çizgi (`SyncLine`, `lib/syncLine.js`) 1,2 sn görünür; kendi yazmaların (hasPendingWrites) sayılmaz.
  - Kopya yalnız her liste en az bir kez gelince, veri değişince 1,5 sn sonra ve uygulama arkaya geçerken yazılır. Çıkışta (`logout`) silinir.
  - İlk girişte, başka hesapta ya da kopya bozuksa eski açılış ekranı çalışır (`Splash` `data-warm`'ı kaldırır).
- Test: `npm run test:cevrimdisi` içinde "Anında açılış" grubu (ikinci açılışta açılış ekranı görünmez, değişiklik yokken çizgi çıkmaz, sunucuda değişiklik varken çizgi çıkar ve yeni başlık gelir). Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: uygulamayı kapatıp aç, açılış ekranı çıkmamalı; başka cihazdan bir görev değiştirip aç, üstte ince çizgi görünmeli.
- Sayfaların kendi yükleniyor göstergeleri (hava, yarış, medya vb.) bu işin dışında; gerekirse sayfa sayfa önbellekle açılabilir.
