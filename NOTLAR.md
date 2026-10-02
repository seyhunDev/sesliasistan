# Notlar

Telefon ve bilgisayar arasındaki köprü. Her yeni sohbet veya oturum önce bunu okur; iş bitince "Nerede kaldım" güncellenir.
Kalıcı konu bilgisi (tasarım, asistan) thread'lerde değil burada durur.

## Nerede kaldım

- Doğal seslendirme (cihazda, sunucusuz): okuma iPhone'un kendi sesiyle; en iyi Türkçe ses kendiliğinden seçilir (Premium > Gelişmiş > Kompakt, voiceURI'den; Eddy/Flo gibi eğlence sesleri seçilmez). Metin okunmadan Türkçe okunuşa çevrilir (14:30 → "on dört otuz", ₺/TL → lira, 7-11 Ekim → "7 ile 11 Ekim", kt → knot, °C → derece, emoji/işaret silinir) ve kısa parçalar halinde aralıksız okunur (`src/lib/speech/speakText.js`, `TtsProvider.jsx`). Ayarlar › Sesli yanıt açıkken: ses seçimi, hız (Yavaş/Normal/Hızlı), "Dene"; ses Premium değilse indirme yolu yazar. Ses ve hız cihazda saklanır (`sa_tts_voice`, `sa_tts_rate`). Mac (Safari/Chrome) için de geçerli: Chrome'daki internetten okuyan "Google Türkçe" sesi kendiliğinden seçilmez (cihazdaki Yelda önce), indirme ipucu Mac'te Sistem Ayarları yolunu gösterir. Telefonda ve Mac'te denenmedi.
- Ana sayfada Yarışlar düğmesi (sayfa düğmelerinin başında, yaklaşan yarış sayısıyla): yalnız sporcu yetkisi olanlarda ve yalnız Ayarlar › "Yarışlar ana sayfada" açılınca (`users/{uid}.races` "on"/"off"; `raceHome.js`, `RacesRow`). Kendiliğinden görünmez, ana sayfada kart yok (Seyhun'un seçimi). Tanıtım slaytlarına "Yarışlar" eklendi (v6, `INTRO_V` 6, yalnız sporcu yetkisi olanlara): ne yapılabildiğini anlatır, "Ana sayfaya ekle" düğmeyi açar; eski kullanıcılara bir kez "YENİ" olarak çıkar. Slaytı görmeyecek kişilerde `introV` sessizce 6 olur. Telefonda denenmedi.
- Yarış puanlamasında tekne sınıfı (Optimist, ILCA, Laser) ve ayak numarası sayılır; ses tanıma bozukları eşlenir ("optimus" → optimist, "ilka" → ilca; `ALIAS`, raceNav.js). "Yarış aranıyor" adımı arama bitince kaybolur (hata işareti çıkmaz).
- Asistan açıkken sayfaların alttaki düğme çubuğu (`data-pagebar`: yarış evrak çubuğu, bütçe, sporcular, kişiler) gizlenir; asistan arkasında kalmaz (globals.css). Yarış seçenekleri sorulduğunda "git", "evet aç", "tamam" ilk seçeneği açar; yapay zekanın ilk adayı yerel puanın da birincisiyse sormadan açılır.
- Yarış bulma sırası (`openRace`, AssistantSheet): kesin ad eşleşmesi → bulanık puanlama (`rankRaces`, yabancı/bozuk adlar: "daz ur", "halkidi") → yapay zeka (`/api/race` mode find) → seçenek kartları (adaylar, hiç anlaşılmazsa tarihi en yakın 3 yarış). Sonraki cümle "ikincisi", "sonuncu", "Foça olan" seçer (`pickChoice`). Telefonda denenmedi.
- Asistan tek yarışı açar: "D'Azur yarışına git", "Foça yarışını aç", "sıradaki yarışı göster" adı/ilçeyi kayıtlı yarışlarla eşleştirir, birden çok uyarsa en yakın tarihliyi açar (`raceNav.js`). Yarış sayfasındayken ad söylemeden "Mehmet'i de ekle", "not al: …", "bütçeye otel … ekle" o yarışa yazılır (`current`, `/api/race`), sayfa kendiliğinden güncellenir (`sa-race-saved` olayı, RaceEditor). Yarışla ilgisiz cümle her zamanki yoldan sorulur. Telefonda denenmedi.
- Asistan sayfa açınca ("yarışlar sayfasına git") artık kapanmaz: "Yarışlar sayfasını açtım." der, gösterir ve kullanıcı kapatana kadar açık kalır; her sayfada geçerli (`leave`, AssistantSheet.jsx). Sayfa adı "Yarış evrakı" yerine "Yarışlar" (nav.js). Telefonda denenmedi.
- Yarış bütçesi (yarışta "Bütçe" sekmesi, `BudgetView.jsx`, hesap `budget.js`): kalemler kategori, tutar, birim (sporcu başı / kişi başı antrenör dahil / ortak), adet-gece, "kulüp karşılar". Toplam, sporcu başı ödeme, kulüp payı otomatik; sporcu ödemeleri Ödendi/Bekliyor. Yarışın `budget` alanında kaydedilir. Yapay zekayla doldurma (`/api/race-budget`), talimattaki ücret/otelleri ekleme, sesli "… bütçesine otel kişi başı 3500 4 gece ekle" (`/api/race` op budget). PDF çıktı `budgetDoc.js`. Canlıda denenmedi.
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

0. iPhone'da Yelda Premium'u indir (Ayarlar › Erişilebilirlik › Seslendirilen İçerik › Sesler › Türkçe › Yelda), uygulamayı kapatıp aç; Ayarlar › Sesli yanıt'ta "Yelda · Premium" görünüyor mu ve "Dene" doğal mı bak. Görünmüyorsa Safari bu sesi web'e açmıyordur; Gelişmiş'i dene. Mac'te de aynısı: Sistem Ayarları › Erişilebilirlik › Seslendirilen İçerik › Sistem sesi › Sesleri Yönet › Türkçe › Yelda (Premium). Yanlış okunan kelime olursa `speechText` (speakText.js) kuralına eklenir.
0. Tanıtımdaki Yarışlar slaytını (Ayarlar › Tanıtımı yeniden göster) ve Ayarlar › "Yarışlar ana sayfada"yı açıp ana sayfadaki Yarışlar düğmesini telefonda dene.
0. Yarış bütçesini telefonda dene: elle kalem, yapay zekayla, sesle; PDF çıktısını kontrol et. İstenirse: sporcuya özel fark (ör. kendi gelen), bütçeyi mailleme.
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

- Sayfa ya da sohbet açma asistanı kapatmaz; asistan yalnız kullanıcı kapatınca (ya da "bitir/kapat" deyince) kapanır.
- Yapay zeka öncelikli. Kullanıcı susunca `src/lib/precue.js` anında kısa ön cevap ve taslak verir; yapay zeka cevabı akış halinde gelir ve ön cevabı tekrar etmez.
- Yerel kurallar: `src/lib/assistantLocal.js`, `src/lib/ai/rules.js` (testleri `npm test`).
- "Kaydettim" yalnız yazma onaylandıktan sonra söylenir.
- Seslendirme cihazda (Web Speech). Gemini sunucu sesi (`/api/tts`) yavaş olduğu için kapalı (`serverOk` false). Siri sesleri web'e açık değil; en iyisi indirilen Yelda Premium. Okunuş kuralları ve ses sıralaması `src/lib/speech/speakText.js` (testleri `npm test`, "Sesli okunuş", "Ses seçimi").

## Yarış evrakı

- Belgeler `src/features/athletes/raceDocs.js` (pdf-lib, düzen kulübün örnek evraklarıyla birebir; yazı tipi `public/fonts` Liberation = Times/Arial ölçülü). Yarışlar `orgs/{orgId}/races`'te yalnız yarış bilgisi + sporcu kimlikleri; kişisel bilgiler sporcu kartından (kulüp projesi) okunur, kopyalanmaz.
- Yarış kaydı alanları: budget {staff, nights, items [{id, cat, title, amount, unit athlete|person|shared, qty, club}], paid {sporcuId: true}}, note, checks {docs, parents, schools, gsim, "t:<talimat işi>", "m:<elle iş>"}, planAdded, notice {…, tasks}, todos [{title, date}]. İş listesi `stepsOf(r)` (races.js). Yarış tarihi sonradan değişirse plan kendiliğinden güncellenmez.
- Kulüp izin yazısı alanları yarışta: clubNo (sporcu başına artar), clubDate, clubFrom, clubTo, clubEvent, clubPlace, clubSigner, clubTitle. Antet bilgisi `CLUB` (raceDocs.js).
- Sporcu kartındaki ek alanlar: studentNo, studentClass, licenseNo, studentSchool, studentSchoolPlace, studentBirthPlace, studentPhone, motherName, fatherName, parentTc, parentRelation (`DOC_FIELDS`, data.js).

## Mac ↔ telefon

- Telefonda: Claude projesinde iş başına yeni thread aç; iş GitHub'a PR olarak gelir. PR birleşince Mac'te `git pull`.
- Mac'te: her iş için yeni oturum ya da `/clear`. Proje özeti gerekmez, Claude Code kodu kendisi okur.
- Proje özeti (`node scripts/proje-ozeti.mjs`) yalnız repoya erişimi olmayan bir sohbete verilir; kısa sürümü yeter.
