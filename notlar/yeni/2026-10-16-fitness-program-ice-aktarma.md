## Nerede kaldım

- Fitness programı üç yolla hazırlanır (Seyhun: "kendim manuel, yapay zeka ile ya da hazır PDF gönderip eksiksiz program; değişikliği yapay zekaya da yazabilmeliyim"; telefonda ve gerçek Gemini ile denenmedi): Fitness › + › Kimin için sonrası "Yapay zeka (seçimlerle) · PDF / fotoğraf · Metin yapıştır · Hazır program". PDF (en çok 4 MB), fotoğraf ya da yapıştırılan metin `/api/fitness-import`'a (Gemini) gider; her hareket, set, tekrar aralığı, süre, her yan, dinlenme, nefes, tempo, zorluk (RPE/RIR), kolay seçenek, not, bölüm (Hazırlık/Ana/Soğuma), çantaya ağırlık, gün notları, hafta evreleri ve kurallar okunur (`fitImport.js`). Sonuç kaydedilmez, düzenleme ekranında açılır; başlangıç tarihi seçilir.
- Hareketlerde yeni alanlar (`cleanItem`, model.js): `repsTo`, `secTo`, `side`, `bag` (kg), `part`, `breath`, `tempo`, `rpe`, `alt`, `note`; günde `note`; programda `phases` (hafta aralığı, ad, set %, not) ve `rules`. Sporcunun antrenman ekranında ve adım adım ekranda nefes, tempo, çanta, not ve kolay seçenek görünür.
- Düzenleme ekranında "YAPAY ZEKAYLA DEĞİŞTİR" kutusu: yazılan değişiklik tüm programla gider, yalnız istenen değişir (`editProgram`), sonra Kaydet. Elle de her alan düzenlenir, listede olmayan hareket eklenir.
- Hazır program: "Yelken ev kuvveti · 12 hafta" (İlay'ın PDF'i; Salı 17:45 Kuvvet A, Perşembe 17:45 Kuvvet B, Cuma 17:45 isteğe bağlı mikrodoz; evreler ve trafik ışığı kuralları) tek dokunuşla seçili sporcuya açılır (`templates.js`). Çanta ağırlığı PDF'te yok, boş gelir.
- Fitness sayfalarında sesli asistan kapalı (TabBar `noAi`).
- Kural değişikliği yok. Testi `test:elle` › "Fitness: program ayrıntıları ve şablon".

## Sıradaki işler

- Telefonda dene: Fitness › + › bir sporcu › PDF ile İlay programını yükle; hareketler, setler, nefes ve notlar eksiksiz mi. Sonra "Hazır program" ile aynısını aç, çanta kilolarını gir, Kaydet ve sporcuya gönder.
- "Yapay zekayla değiştir"e "perşembeyi 18:30 yap, split squat 4 set olsun" gibi bir istek yaz; yalnız o değişmeli.
- Hareket fotoğraflarını Fitness › Hareketler'den ekle.
- Hafta evreleri (hafif hafta set %) şimdilik bilgi olarak duruyor; istenirse takvimdeki haftaların setleri buna göre kendiliğinden azaltılır.

## Asistan

- Fitness sayfalarında sesli asistan şimdilik yok (Seyhun, 2026-10-16); asistan yeniden yazılınca bakılacak. Fitness'ta değişiklik ekrandaki "Yapay zekayla değiştir" kutusuyla.
