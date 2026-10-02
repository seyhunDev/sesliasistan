# Notlar

Telefon ve bilgisayar arasındaki köprü. Her yeni sohbet veya oturum önce bunu okur; iş bitince "Nerede kaldım" güncellenir.
Kalıcı konu bilgisi (tasarım, asistan) thread'lerde değil burada durur.

## Nerede kaldım

- Son işler: ders programı düzenleme (çalışan/öğrenci dersini silebilir, tüm programı sil), asistan çubuğu açılıştan sonra alttan yükselir, ana ekran uygulamasında alt boşluk kısaldı.
- Yarış evrakı (Sporcular › bayrak düğmesi, `/athletes/races`): yarış + seçilen sporcular → okul izni yazısı, EK-2 Kafile Onayı, seyahat dilekçesi, sporcu başına EK-3/D Veli İzin Belgesi tek PDF (paylaş/yazdır). Telefonda gerçek sporcularla denenmedi.
- Yarışa not, yapılacaklar listesi (evrak, veli imzası, okullar, GSİM, kayıt formu) ve "Planlara ekle" eklendi. Asistan: "Yarış ekle: …, Çeşme, 7-11 Ekim, Ali ve Ayşe katılacak", "… yarışına Mehmet'i de ekle", "… için not al: …" (`src/features/athletes/assistRace.js`, `/api/race`).
- Kulüp izin yazısı eklendi (Evrak sekmesi, 5. belge): kulüpten sporcunun okuluna, sporcu başına bir sayfa, antetli. Sayı, tarih, izin aralığı, etkinlik adı, yer, imzalayan ayrı düzenlenir; boşsa yarıştan gelir. Sporcu kartına okul no ve sınıf alanı eklendi.
- Asistan: yarış adları hafızası (`raceNames.js`, kayıtlı yarışlardan) ses tanımaya ipucu ve yarış adı kutusunda öneri; "katılımcıları" sporcu olarak eklenir, nota yazılmaz; konuşma sonu beklemesi uzadı (kayıt yolu 2,3 sn, kısa cümlede 3 sn; canlı yazı 2 sn).
- Yarışlar sayfası yeniden tasarlandı: liste `RaceList.jsx` (sıradaki yarış kartı, yaklaşan/geçmiş), tek yarış `/athletes/races/[id]` + `RaceEditor.jsx` (Özet / Sporcular / Bilgiler / Evrak sekmeleri). Yeni yarış: `/athletes/races/new`.

## Sıradaki işler

1. Asistan Sahnesi 2. adım: sayfada arka plan vurgusu / hayalet taslak.
2. Asistan Sahnesi 3. adım: mesajda hayalet balon.
3. Kulüp izin yazısını ve asistanın yeni bekleme süresini telefonda dene; susma hâlâ erkense `END_SILENCE` (useSpeech.js) artırılır.
4. Yarış evrakını telefonda dene; sporcu kartlarında lisans no, veli T.C., doğum yeri, anne-baba adı, yakınlık, okul ilçe-ili alanlarını doldur. Kafileye antrenör/idareci eklemek istenirse sonraki iş.

## Tasarım

- Yeşil "Ufuk" tasarımı: tek asistan görünümü, standart alt çubuk (`src/features/home/TabBar.jsx`), yeni logo ve açılış (`src/components/ui/AppLogo.jsx`, `Splash.jsx`).
- Asistan çubuğu her sayfada aynı; küre iPhone'da yuvarlak kalmalı. Durumlar yazıyla değil küre animasyonuyla gösterilir.
- Sade: hazır öneri/kısayol düğmeleri, selam ve gün özeti asistan sahnesinden kaldırıldı; geri eklenmez.
- iPhone PWA'da güvenli alan (alt pay) ve klavye davranışı hassas; değişiklikten sonra telefonda dene.

## Asistan

- Yapay zeka öncelikli. Kullanıcı susunca `src/lib/precue.js` anında kısa ön cevap ve taslak verir; yapay zeka cevabı akış halinde gelir ve ön cevabı tekrar etmez.
- Yerel kurallar: `src/lib/assistantLocal.js`, `src/lib/ai/rules.js` (testleri `npm test`).
- "Kaydettim" yalnız yazma onaylandıktan sonra söylenir.

## Yarış evrakı

- Belgeler `src/features/athletes/raceDocs.js` (pdf-lib, düzen kulübün örnek evraklarıyla birebir; yazı tipi `public/fonts` Liberation = Times/Arial ölçülü). Yarışlar `orgs/{orgId}/races`'te yalnız yarış bilgisi + sporcu kimlikleri; kişisel bilgiler sporcu kartından (kulüp projesi) okunur, kopyalanmaz.
- Yarış kaydı alanları: note, checks {docs, parents, schools, gsim, entry}, planAdded. Yarış tarihi sonradan değişirse plan kendiliğinden güncellenmez.
- Kulüp izin yazısı alanları yarışta: clubNo (sporcu başına artar), clubDate, clubFrom, clubTo, clubEvent, clubPlace, clubSigner, clubTitle. Antet bilgisi `CLUB` (raceDocs.js).
- Sporcu kartındaki ek alanlar: studentNo, studentClass, licenseNo, studentSchool, studentSchoolPlace, studentBirthPlace, studentPhone, motherName, fatherName, parentTc, parentRelation (`DOC_FIELDS`, data.js).

## Mac ↔ telefon

- Telefonda: Claude projesinde iş başına yeni thread aç; iş GitHub'a PR olarak gelir. PR birleşince Mac'te `git pull`.
- Mac'te: her iş için yeni oturum ya da `/clear`. Proje özeti gerekmez, Claude Code kodu kendisi okur.
- Proje özeti (`node scripts/proje-ozeti.mjs`) yalnız repoya erişimi olmayan bir sohbete verilir; kısa sürümü yeter.
