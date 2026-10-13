## Nerede kaldım

- Sporcunun antrenman ekranı yenilendi (Seyhun: "nasıl geçti başlamadan sorulmasın, bütün hareketleri tamamlamadan bitirilemesin; ne çalışılacak, ne kadar, tahmini süre ve güzel bir Antrenmana başla düğmesi; değiştiremezsin yazısına gerek yok"; telefonda denenmedi): sporcu fitness planını açınca genel plan kartı ve "… verdi · değiştiremezsin" yazısı yok. Üstte koyu yeşil kart: zaman (ve yer), antrenmanın adı, kas grupları, ≈ dakika / hareket / set, başladıysa ilerleme çubuğu, büyük beyaz "Antrenmana başla" ("Kaldığın yerden devam et"). Altında "BU ANTRENMANDA" listesi: sıra, hareket, set × tekrar; dokununca nasıl yapılır, fotoğraf/video ve setler açılır. "Nasıl geçti?" ve "Antrenmanı bitir" yalnız bütün setler yapılınca görünür (adım adım ekranda bitirmeyen sporcu buradan bitirir). Adım adım ekranda set atlanırsa sonda "N set kaldı · Kalan setlere dön", sesle "antrenmanı bitir" de kalan set varsa bitirmez. En altta küçük "Bugün yapamayacağım" (atlandı). Tahmini süre plan süresi yoksa hareketlerden (`estMinutes`, kas grupları `groupsOf`, model.js). Ana hesabın kendi fitness planı da aynı görünüm (genel kartı kalır). Testi `test:elle` › "Fitness antrenman ekranı".

## Sıradaki işler

- Sporcu hesabıyla bir antrenmanı aç: üst kart, liste, "Antrenmana başla"; bir seti atlayıp sona gel, "Kalan setlere dön" çıkmalı; hepsini bitirince "Nasıl geçti?" görünmeli.
