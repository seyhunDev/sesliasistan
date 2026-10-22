## Nerede kaldım
- Giriş ekranı açılış animasyonu (Seyhun: "yukarıdan aşağı bir kayma oluyor… popüler uygulamalar gibi animasyonlu geçiş"; telefonda denenmedi). Eski kayma: `(auth)` düzeni `data-boot-enter` ile alttan kayarak geliyordu, kaldırıldı. Yeni: açılış ekranının logosu giriş ekranındaki logonun yerine uçup küçülür (`BootSplash.jsx` `flyTo`, hedef `[data-boot-target]`, `.boot[data-fly]`), zemin ve yazılar solar; sonra Velora yazısı ve form sırayla belirir (`.auth-rise`). Açılış ekranı yoksa (çıkış yapınca) logo büyüyerek gelir (`.auth-pop`). Adım değişince form yandan kayar (ileri sağdan, geri soldan; `.auth-step`). Giriş logosu açılıştakiyle aynı çizim (`GlowMark`, beyaz ışık + hale). Hareket azaltma açıksa yalnız solma.

## Sıradaki işler
0. Telefonda: uygulamayı kapatıp aç (oturum kapalıyken) — logo yerine akıcı uçuyor mu; giriş yapılıysa ana sayfa eskisi gibi mi.
