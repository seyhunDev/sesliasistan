# Notlar

Telefon ve bilgisayar arasındaki köprü. Her yeni sohbet veya oturum önce bunu okur; iş bitince "Nerede kaldım" güncellenir.
Kalıcı konu bilgisi (tasarım, asistan) thread'lerde değil burada durur.

## Nerede kaldım

- Hazırlanan yarış evrakı bu cihazda saklanır (IndexedDB `sa-race-docs`, `raceFiles.js`); sayfaya dönünce Hazır kartı ve Aç/Mail/Paylaş gelir, "Yenile" ile yeniden hazırlanır. Belgeyi değiştiren bilgi değişince kopya silinir. Firebase'e yazılmaz (PDF'te T.C./veli bilgisi var). Başka cihazda yeniden hazırlanır. Evrak sekmesi: "Hazırlanan evrak" (tümü + her belge ayrı; aç/paylaş) ve "Eklenen evrak" (elle eklenen PDF/fotoğraf, yine cihazda `<yarış>:extra`, bilgi değişince silinmez). Eklenen evrak maile girmiyor (sonraki iş olabilir).
- Yarış evrakını mail: belgeler hazırlanınca alt çubukta "Mail" → "Kime gönderilsin?" (Kendime + kayıtlı adresler, `users/{uid}.mailTo`, yeni adres eklenir/silinir; `src/features/mail/MailTo.jsx`). Yalnız Gmail betiği kurulu ana hesapta. Uygulama PDF'i `orgs/{uid}/outbox`'a bırakır (`outbox.js`, 700 KB'lık parçalar, `to`, `self`), Gmail betiği 5 dakikada bir `gonder()` ile gönderir ve siler. Betik sürümü `mailOutbox` (1 kendine, 2 başka adreslere de); 2'den eskiyse Mail ayarlarından kod + appsscript.json yeniden kopyalanıp `kur` çalıştırılır. Kendine gönderim canlıda çalıştı (2026-10-02).
- Son işler: ders programı düzenleme (çalışan/öğrenci dersini silebilir, tüm programı sil), asistan çubuğu açılıştan sonra alttan yükselir, ana ekran uygulamasında alt boşluk kısaldı.
- Yarış evrakı (Sporcular › bayrak düğmesi, `/athletes/races`): yarış + seçilen sporcular → okul izni yazısı, EK-2 Kafile Onayı, seyahat dilekçesi, sporcu başına EK-3/D Veli İzin Belgesi tek PDF (paylaş/yazdır). Telefonda gerçek sporcularla denenmedi.
- Yarışa not, yapılacaklar listesi (evrak, veli imzası, okullar, GSİM, kayıt formu) ve "Planlara ekle" eklendi. Asistan: "Yarış ekle: …, Çeşme, 7-11 Ekim, Ali ve Ayşe katılacak", "… yarışına Mehmet'i de ekle", "… için not al: …" (`src/features/athletes/assistRace.js`, `/api/race`).
- Kulüp izin yazısı eklendi (Evrak sekmesi, 5. belge): kulüpten sporcunun okuluna, sporcu başına bir sayfa, antetli. Sayı, tarih, izin aralığı, etkinlik adı, yer, imzalayan ayrı düzenlenir; boşsa yarıştan gelir. Sporcu kartına okul no ve sınıf alanı eklendi.
- Yarış talimatı: yarışta "Talimattan oluştur / Talimatı yükle" (PDF, fotoğraf ya da yapıştırılan metin; PDF en çok 4 MB; dosya türü içerikten anlaşılır, uzantısız dosya da seçilir) → `/api/race-notice` (Gemini) ad, tarih, yer, program, son tarihler, ücretler, konaklama, iletişim çıkarır; yarışın `notice` alanında durur, belge saklanmaz. Özet sekmesinde son tarihler (planlara ekle) ve talimat ayrıntıları. Gerçek talimatla canlıda denenmedi.
- Yapılacaklar iki bölüm: "Kayıt ve hazırlık" talimat yüklenince talimattaki işlerden (son tarihli) gelir, hazır standart liste yok; her yarışa elle iş eklenir/silinir (isteğe bağlı son tarih, `todos` alanı, anahtar `m:<iş>`). "Evrak" her yarışta aynı (evrak, veli, okullar, GSİM).
- Kulüp izin yazısında kulüp logosu (`public/club-logo.png`).
- Asistan: yarış adları hafızası (`raceNames.js`, kayıtlı yarışlardan) ses tanımaya ipucu ve yarış adı kutusunda öneri; "katılımcıları" sporcu olarak eklenir, nota yazılmaz; konuşma sonu beklemesi uzadı (kayıt yolu 2,3 sn, kısa cümlede 3 sn; canlı yazı 2 sn).
- Yarışlar sayfası yeniden tasarlandı: liste `RaceList.jsx` (sıradaki yarış kartı, yaklaşan/geçmiş), tek yarış `/athletes/races/[id]` + `RaceEditor.jsx` (Özet / Sporcular / Bilgiler / Evrak sekmeleri). Yeni yarış: `/athletes/races/new`.

## Sıradaki işler

0. Gmail betiğini Mail ayarlarından yeniden kopyala (alıcı ekleme için), `kur`'u çalıştır, evrakı eklenen bir adrese gönderip dene.
1. Asistan Sahnesi 2. adım: sayfada arka plan vurgusu / hayalet taslak.
2. Asistan Sahnesi 3. adım: mesajda hayalet balon.
3. Örnek talimatı (TYF Yelken Ligi ILCA 1. Ayak, Foça) yükleyip okunanları kontrol et; eksik/yanlış alan olursa `/api/race-notice` istemini düzelt.
4. Kulüp izin yazısını ve asistanın yeni bekleme süresini telefonda dene; susma hâlâ erkense `END_SILENCE` (useSpeech.js) artırılır.
5. Yarış evrakını telefonda dene; sporcu kartlarında lisans no, veli T.C., doğum yeri, anne-baba adı, yakınlık, okul ilçe-ili alanlarını doldur. Kafileye antrenör/idareci eklemek istenirse sonraki iş.

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
- Yarış kaydı alanları: note, checks {docs, parents, schools, gsim, "t:<talimat işi>", "m:<elle iş>"}, planAdded, notice {…, tasks}, todos [{title, date}]. İş listesi `stepsOf(r)` (races.js). Yarış tarihi sonradan değişirse plan kendiliğinden güncellenmez.
- Kulüp izin yazısı alanları yarışta: clubNo (sporcu başına artar), clubDate, clubFrom, clubTo, clubEvent, clubPlace, clubSigner, clubTitle. Antet bilgisi `CLUB` (raceDocs.js).
- Sporcu kartındaki ek alanlar: studentNo, studentClass, licenseNo, studentSchool, studentSchoolPlace, studentBirthPlace, studentPhone, motherName, fatherName, parentTc, parentRelation (`DOC_FIELDS`, data.js).

## Mac ↔ telefon

- Telefonda: Claude projesinde iş başına yeni thread aç; iş GitHub'a PR olarak gelir. PR birleşince Mac'te `git pull`.
- Mac'te: her iş için yeni oturum ya da `/clear`. Proje özeti gerekmez, Claude Code kodu kendisi okur.
- Proje özeti (`node scripts/proje-ozeti.mjs`) yalnız repoya erişimi olmayan bir sohbete verilir; kısa sürümü yeter.
