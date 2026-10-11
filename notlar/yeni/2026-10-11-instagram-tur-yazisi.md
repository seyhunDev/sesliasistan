## Nerede kaldım

- Instagram'da tür yazısı isteğe bağlı oldu ve sonuçlardan gönderi açılabiliyor (Seyhun: "Instagram görseli hazırla butonu olsun; posterde yarış sonucu, antrenman gibi başlıklar opsiyonel olsun, kapalı tutalım"; telefonda denenmedi).
  - Görseldeki tür etiketi (YARIŞ SONUCU, ANTRENMAN, YARIŞ…) artık varsayılan kapalı. Kayıtlı eski gönderiler de kapalı açılır.
  - Gönderi ekranında Yazı › Diğer yazılar ve ayarlar › "Tür yazısı" anahtarıyla açılır (`noTag`, `cleanPost`). Çizimde `drawPost` etiketi boşaltır; Afiş, Klasik ve Modern'in hepsinde geçerli.
  - Asistan: "etiketi kaldır", "yarış sonucu yazısı olmasın", "etiketi geri getir" (`sizeAsk`). "Yarış duyurusu yap" etiketi açar (`designFrom`).
  - Yarış › Sporcular › SONUÇLAR'da sıra yazılmış sporcu varsa "Instagram görseli hazırla" düğmesi çıkar. Gönderi yarış sonucu türünde, sporcular ve sonuçlarıyla açılır (`postFromRace` `kind: "sonuc"`).
  - Sonuçta ilk üçe giren sporcu varsa (genel, Junior/Bambino ya da kızlar sırasında) gönderi dereceyle açılır: üstte "ÜÇÜNCÜLÜK" (birden çok sporcuda "DERECELERİMİZ"), başlık "Tebrikler Ece Yılmaz", alt satır "Sporcumuz Ece Yılmaz, Foça'da Optimist Junior sıralamasında üçüncü oldu.", dilek "Seninle gurur duyuyoruz!" (`podiumOf`, raceResults.js; `podiums`, `podiumTag`, `locative`, postModel.js; yapay zeka bu başlığı ve dereceyi değiştirmez, /api/post-caption). Derece yoksa eskisi gibi "Emeğinize Sağlık", tür yazısı kapalı.
  - Örnekler: `/mnt/project-files/instagram/tur-yazisi-kapali.png`, `/mnt/project-files/instagram/sonuc-derece.png`.
  - Kural değişikliği yok.
  - Testleri `test:elle` › "Instagram tasarım" › "tür yazısı kapalı", "sonuçtan gönderi", "sonuçta derece".

## Sıradaki işler

- Sonucu olan bir yarışta "Instagram görseli hazırla"ya bas. Gönderi tür yazısı olmadan açılmalı; Yazı ayarlarından açınca "YARIŞ SONUCU" gelmeli.
