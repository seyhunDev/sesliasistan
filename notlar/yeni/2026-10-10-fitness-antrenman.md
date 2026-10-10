## Nerede kaldım

- Fitness, 1. aşama antrenman (Seyhun: "yapay zekayla program hazırlansın, düzenleyebileyim, planlara eklensin, hangi antrenman yapıldı yapılmadı takip edeyim, fitness uygulamasına yakın olsun"; "Önce antrenman" seçildi, beslenme 2. aşama; telefonda ve gerçek Gemini ile denenmedi): yeni sayfa `/fitness` (yalnız ana hesap, çalışan görmez), ana sayfa İşlemler › Günlük'te "Fitness". Plan: `/mnt/project-files/fitness/plan.md`.
- Program hazırla: günler (Pzt…Paz), Sabah/Öğle/Akşam + saat, 4/6/8/12 hafta, 30-90 dk, başlangıç, profil (hedef, seviye, yer, ekipman, boy/kilo/yaş, kaçınılacak) → "Yapay zekayla hazırla" (`/api/fitness`, Gemini; hareketler yalnız ~98 hareketlik katalogdan, `src/lib/fitness/exercises.js`) ya da "Kendim hazırlayacağım". Önizlemede her şey düzenlenir (gün adı, gün, saat, süre, hareket ekle/çıkar/sırala, set, tekrar/saniye/dakika, kilo, dinlenme); "Kaydet ve planlara ekle" her antrenmanı ayrı plan olarak takvime yazar (kategori Fitness, turuncu).
- Kayıt: profil `users/{uid}.fit`; program `orgs/{org}/fitPrograms/{id}` (tek etkin program, 3 dk bellekte); antrenman = plan, `fit {prog, di, w, name, items, res}`. Sonuç `res {st done|skip, min, feel, note, ex[{sets[{reps, kg, sec, min, ok}]}]}`. Program değişince yalnız bugünden sonraki yapılmamış planlar yeniden yazılır, yapılanlara dokunulmaz.
- Antrenman ekranı: Fitness planını açınca setler tek tek işaretlenir (tekrar, kilo), işaretleyince dinlenme sayacı; süre, Zor/İyi/Kolay, not, "Atladım", "Antrenmanı bitir". Bir hareketin tüm setleri yapılınca sonraki hedef kendiliğinden artar (+2,5 kg ya da +1 tekrar ya da +5 sn; `targetFor`).
- Takip (ek okuma yok, cihazdaki planlardan): bu hafta yapılan/planlanan, 7 gün şeridi, hafta serisi, dakika, kaçırılan; bugünün antrenmanı; Gelişim (hareket başına en iyi ve artış); bu ay yapılan, devam %, süre, toplam kaldırılan kilo; geçmiş.
- Asistan: "pazartesi çarşamba cuma sabah 7'de 4 haftalık fitness programı hazırla", "çarşambayı bacak günü yap", "programı planlara ekle", "takvimden kaldır", "bugünkü antrenmanı yaptım", "bugün 3 set 12 squat 40 kilo yaptım", "bugün spor yapamadım", "bu hafta kaç antrenman yaptım". Yelken antrenman günlüğü ile karışmaz (Fitness sayfasında ya da açık fitness planında söylenen fitness'a gider; `wantsFitness`, `fitFirst`). Ayarlar › Kullanım'da "Fitness" sayacı. Kural değişikliği yok, yeni ortam değişkeni yok. Testleri `test:elle` › "Fitness", yönlendirme testleri.
- Örnek ekranlar: `/mnt/project-files/fitness/anasayfa.png`, `onizleme.png`, `antrenman.png`, `yeni-program.png`.

## Sıradaki işler

0. Fitness'ı telefonda dene: Fitness › + › günleri seç › Yapay zekayla hazırla; program mantıklı mı, bir hareketi değiştir, "Kaydet ve planlara ekle", Planlar'da antrenmanlar görünüyor mu. Bugünkü antrenmanı aç, setleri işaretle, bitir; Fitness sayfasında "yapıldı" ve gelişim görünüyor mu. Asistana "bugün 3 set 12 squat 40 kilo yaptım" de. Yanlış anlaşılan cümleyi yeni threade ver.
- 2. aşama beslenme: öğün kaydı (sesle/fotoğrafla), kalori ve protein hedefi, yapay zeka ile beslenme önerisi.
- İstenirse: vücut ölçüleri ve kilo grafiği, hareket videoları/çizimleri, antrenman hatırlatma bildirimi.

## Asistan

- Fitness programı ve antrenman kaydı ana asistanla; Fitness sayfasında ayrı yapay zeka kutusu yok. Fitness planları yelken antrenman günlüğüne sayılmaz (`isTraining`).
