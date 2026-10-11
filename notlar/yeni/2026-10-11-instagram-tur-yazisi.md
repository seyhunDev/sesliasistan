## Nerede kaldım

- Instagram'da tür yazısı isteğe bağlı oldu ve sonuçlardan gönderi açılabiliyor (Seyhun: "Instagram görseli hazırla butonu olsun; posterde yarış sonucu, antrenman gibi başlıklar opsiyonel olsun, kapalı tutalım"; telefonda denenmedi).
  - Görseldeki tür etiketi (YARIŞ SONUCU, ANTRENMAN, YARIŞ…) artık varsayılan kapalı. Kayıtlı eski gönderiler de kapalı açılır.
  - Gönderi ekranında Yazı › Diğer yazılar ve ayarlar › "Tür yazısı" anahtarıyla açılır (`noTag`, `cleanPost`). Çizimde `drawPost` etiketi boşaltır; Afiş, Klasik ve Modern'in hepsinde geçerli.
  - Asistan: "etiketi kaldır", "yarış sonucu yazısı olmasın", "etiketi geri getir" (`sizeAsk`). "Yarış duyurusu yap" etiketi açar (`designFrom`).
  - Yarış › Sporcular › SONUÇLAR'da sıra yazılmış sporcu varsa "Instagram görseli hazırla" düğmesi çıkar. Gönderi yarış sonucu türünde, sporcular ve sonuçlarıyla açılır (`postFromRace` `kind: "sonuc"`).
  - Örnek: `/mnt/project-files/instagram/tur-yazisi-kapali.png`.
  - Kural değişikliği yok.
  - Testleri `test:elle` › "Instagram tasarım" › "tür yazısı kapalı", "sonuçtan gönderi".

## Sıradaki işler

- Sonucu olan bir yarışta "Instagram görseli hazırla"ya bas. Gönderi tür yazısı olmadan açılmalı; Yazı ayarlarından açınca "YARIŞ SONUCU" gelmeli.
