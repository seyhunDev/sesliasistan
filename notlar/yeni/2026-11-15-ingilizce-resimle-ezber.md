## Nerede kaldım

- İngilizce › Kalıplar'a resimle ezber eklendi (Seyhun 2026-11-15: "insan harfleri değil şekilleri ezberler… portakal: yuvarlak, turuncu → orange"; örnek /mnt/project-files/ingilizce-kelime/sekil/ornek.html "Yap" ile onaylandı. İlk öneri olan yapboz/blok şekilleri istenmedi).
- Her kalıbın sabit sahnesi `src/lib/englishPics.js` (PICS, PIC_STYLE: düz vektör, yazısız). Resmi `/api/english-pic` Gemini görsel modeliyle (GEMINI_IMAGE_MODEL) kare çizer; telefon 512 px JPEG'e küçültüp `orgs/{org}/englishPic/{kalıp id}` belgesine yazar (`features/words/chunkPics.js`). Kural değişmedi (ana hesap orgs altını yazar). Sayaç Instagram'dan ayrı: `usage/engpic_{uid}`, günde 60 (ENGLISH_PIC_DAY).
- Kalıp açılınca resmi yoksa ana hesapta kendiliğinden çizilir. ⋯ › Resimler: 37 kare, "Eksikleri çiz" sırayla çizer, kareye dokununca büyür, "Yeniden çiz" / "Çalış".
- Yeni adım Hatırla (Kur'dan sonra, Konuş'tan önce): yalnız resim (resim yoksa Türkçesi), mikrofona dokun, söyle, tekrar dokun; `/api/word` `hear` yazıya döker ve beklenen cümleyle karşılaştırır. Yanlış ya da Göster → kalıp yarın yeniden. Sonuç artık Hatırla'dan sonra kaydedilir.
- Telefonda denenmedi; resimler henüz çizilmedi (canlıda ilk açılışta ya da ⋯ › Resimler › Eksikleri çiz).

## Sıradaki işler

- Telefonda dene: ⋯ › Resimler › Eksikleri çiz (37 resim, ~1,5 $), resimleri gözden geçir, beğenilmeyeni yeniden çiz.
- Hatırla'da mikrofonla deneme.
- İstenirse: kelimelere (Kelimelerim) de resim, bildikçe resmin seyrek gelmesi, iPhone widget'ında günün kalıbının resmi.

## Asistan

- İngilizce kalıp çalışması 5 adım: Dinle · Değiştir · Kur · Hatırla · Konuş. Resimler yalnız ana hesapta çizilir ve görünür.
