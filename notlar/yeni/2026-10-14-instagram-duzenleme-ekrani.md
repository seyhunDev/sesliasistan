## Nerede kaldım

- Instagram gönderi düzenleme ekranı toparlandı (Seyhun: "karmaşık, yazılar bir başlık altında alt başlıklarıyla seçmeli olsun, hepsi opsiyonel, etiket dursun ama boş olsun, yazı boyu ve rengi standart olsun ama değiştirilebilsin, Kaydet belirgin olsun"; onay bekliyor, telefonda denenmedi): Afiş tasarımı değişmedi. Kaydet artık önizlemenin üstünde, tür satırının sağında hep görünür (değişiklik varsa yeşil, yoksa "Kaydedildi"). Dört sekmenin her biri tek kartta açılır satırlar (aynı anda biri açık). Yazı: Yalnız fotoğraf, Başlık, Alt satır, Yer · tarih, Sporcular, Dilek, Etiket, Logo ve kulüp adı; her birinin sağında aç/kapa anahtarı, kapalı olan görselde çıkmaz ama yazısı saklı kalır. Başlık, alt satır, dilekte Boyut (− %100 +, "Standart") ve Renk (Standart + 6 renk); yer · tarihte Renk. Etiket varsayılan kapalı (eski gönderilerde de). Fotoğraf: Fotoğraf, Yerleştir, Gölge. Görünüm: Renk, Boyut, Yazı yeri. Paylaş: büyük paylaş düğmesi, altında Açıklama, Hikâye ve Reels, Kulüpten haberler, Arşivle ya da sil. Gönderide yeni alanlar `hide` (sub, people, wish, tag), `ink` {head, sub, meta, wish}, `wishSize` (`cleanPost`, `INKS`, `inkOf`, postModel.js). postImage.js'teki kullanılmayan eski şablon çizimleri silindi. Örnekler: `/mnt/project-files/instagram/duzenleme-ekrani/`. Testi `test:elle` › "Instagram tasarım" › "yazılar aç/kapa ve standart".

## Sıradaki işler

- Telefonda bir gönderide Yazı sekmesini dene: etiketi kapat/aç, başlık rengini sarı yap, dilek boyunu büyüt, Kaydet'e üstten bas.

## Tasarım

- Instagram düzenleme ekranı: sekme içerikleri tek kartta açılır satırlar, isteğe bağlı yazılar anahtarla kapatılır; Kaydet önizlemenin üstünde (2026-10-14).
