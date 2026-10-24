## Nerede kaldım

- Notlar yeni tasarımda (Seyhun: "notlar sayfasını yeni tasarıma göre tekrar yap, güzel bir not uygulamasına çevir, çabucak değişiklik yapılabilsin, sade; az kullanılanlar ayarlar içinde"; onaylanan örnek `/mnt/project-files/notlar-sayfasi/yeni-tasarim.png`; telefonda denenmedi):
  - Liste (`/notes`): lacivert üstte geri, "Notlar", not sayısı, "+ Not"; arama kutusu ve Tümü / Sabitli / Bana verilen (yalnız varsa) lacivertte. Altta Sabitli ve Notlar listeleri (en son değişen önce); satırda solda notun rengi, başlık, ilk satır (başkası verdiyse adı), sağda kısa tarih (Bugün, Dün, Pzt, 17 Eki). Sola kaydırma (Yapıldı / Sabitle / Sil) aynı. En altta "Arşiv ›".
  - Not sayfası (`/notes/[id]`, yeni): not tam sayfa; başlık büyük, altında "Sen yazdın · dün 18:40", altında geniş yazı alanı. Kaydet yok: alandan çıkınca, sayfadan ayrılınca, uygulama arka plana geçince kaydedilir (her tuşta değil; sorumlulara giden "değişti" bildirimi çoğalmasın diye). "+ Not" `/notes/new` açar, ilk yazıyla not oluşur (adres `/notes/<id>` olur). Altta sabit: Yapıldı (Arşiv'e, listeye döner), Sabitle/Sabitli, Paylaş, ⋯. Arşivdeki notta "Notlara al". ⋯ "Not ayarları": Renk (renksiz, camgöbeği, yeşil, sarı, kırmızı, mavi; yeni alan `color`: "", cyan, green, amber, red, blue), Sorumlu (ana hesap, çalışan varsa), Kopyala, Arşiv, Notu sil (5 sn geri al).
  - Çalışana başkasının verdiği not listeden eski ekranda (Tamamladım) açılır; doğrudan adresle açılırsa yalnız okunur.
  - Plan/görev ekranları, asistanın "Düzenle"si ve ana sayfa kartları eski not ekranını açmaya devam ediyor (ana sayfa kartını ana sayfa thread'i `/notes/<id>`'ye çevirecek).
  - `src/app/(app)/notes/page.jsx`, `notes/[id]/page.jsx`, `NOTE_COLORS`, `noteColor`, `noteWhen` (`src/lib/noteState.js`). Kural değişikliği yok, Firestore'a ek okuma yok. Testi `test:asistan` › "Not yapıldı (arşiv)" › "not rengi", "not tarihi".

## Sıradaki işler

- Notları telefonda dene: "+ Not" ile yaz, geri çık (not listede olmalı); bir notu açıp değiştir, geri çık; ⋯ › Renk seç (listede soldaki çizgi o renk olmalı), Sorumlu, Notu sil. Klavye açıkken alt düğmeler gizleniyor, kapanınca geri geliyor mu bak.

## Tasarım

- Notlar (2026-10-23): liste lacivert kokpit + sade liste; not tam sayfa ve kendiliğinden kaydedilir; az kullanılanlar (renk, sorumlu, kopyala, arşiv, sil) ⋯ "Not ayarları" penceresinde.
