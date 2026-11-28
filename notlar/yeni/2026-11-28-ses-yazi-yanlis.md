## Nerede kaldım
- Yönet: giden sesli mesaj (PTT, kalıp değil) gönderildikten sonra bir kez `/api/transcribe` ile yazıya çevrilir (`bilgiStore.sesYazi`). Yazı yalnız Yönet'te görünür: konuş düğmesinin üstünde 2 dk boyunca satır ("Yazıya çevriliyor…" / cümle / "Yazıya çevrilemedi") ve Gönderilenler listesinde. Sporcu ekranına gitmez.
- Satırdaki "Yanlış" düğmesi `bilgiStore.yaziHata` ile `bilgiLog`'a `kind: "yazi-hata"` kaydı yazar: ses (base64 `data`, ~900 KB'a kadar), `type`, `dur`, `yazi`, `to`, `ref` (asıl kayıt), `durum: "yeni"`. Asıl ses kaydına `hata: true` işlenir. Yazı ayrıca asıl kayda `yazi` olarak yazılır, gün kaydı PDF'inde görünür.
- Kural değişikliği yok (bilgiLog zaten antrenör alanında okunur/yazılır). Telefonda denenmedi.

## Sıradaki işler
- Admin'de "Yanlış çeviriler" listesi (durum yeni → düzeltildi), düzeltilmiş yazıyla yapay zeka ipucu/sözlük geliştirme.
- "Görüldü" şu an sporcunun mesajı ALMASINA göre; çalmaya göre takip önerildi.
