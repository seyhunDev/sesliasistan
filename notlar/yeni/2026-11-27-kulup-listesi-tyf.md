## Nerede kaldım

- Kulüp sorusunda liste boş çıkıyordu (clubs koleksiyonu boştu; Dikili yalnız Admin › Kulüpler açılınca ekleniyordu). Artık hazır liste kodda: Dikili + TYF Yelken Ligi online kayıtlarındaki 73 kulüp (`src/lib/clubsTyf.js`, kaynak project-files/tyf-kulupler). Veritabanında kayıt olmasa da görünür; Admin'de düzenlenen kulüp `clubs/{id}` ile üstüne yazılır.
- "Kulübün?" ekranı Sahne tasarımında (koyu, limon, ince çizgili liste, adlar iki satıra kadar, belirgin "Kulüpsüz devam et"); liste okunamazsa hazır liste görünür ve "Liste açılamadı · Tekrar dene" yazar.
- Kulüp kaydında "Federasyon kulüp no" (tfId) alanı var. Admin › Kulüpler › "Listeyi içeri al": satır satır `no; ad; il; ilçe` ya da JSON; listede olan kulübün adı ezilmez, yalnız no ve boş il/ilçe dolar. Sonuçlardan önerilerde "Hepsini ekle".
- Yeni kullanıcıya: ana sayfadaki Hesaplar para kutusu ve "Güncellendi · #PR" notu artık yalnız Velora ana hesabında.

## Sıradaki işler

- TYF'nin resmi kulüp numaraları bulunursa "Listeyi içeri al" ile girilecek.
- Yalnız hazır listede olan (veritabanı kaydı olmayan) kulübü Admin'den silmek bir şey değiştirmez; gerekirse "gizle" eklenir.

## Nerede kaldım (2)

- Yeni kullanıcı denetimi (yerel emülatörde uçtan uca): kayıt, tanıtım, kulüp sorusu, plan ekleme, sporcu ekleme, sporcuya hesap açma, sporcu girişi çalışıyor. Düzeltilenler: normal kullanıcının Ayarlar'ında Durum (uygulamanın harcamaları) ve Geliştirici bölümü yok (yalnız Velora ana hesabı); boş sporcu listesinde "Henüz sporcu yok"; sporcu ekleme yazılarında "kulüp" yerine "sporcu listen".
- Kulüp no alanı "GSB kulüp no" (TYF portalı, biçim 01-01-00118); Listeyi içeri al bu biçimi ve JSON'da `gsb` alanını tanır.

## Nerede kaldım (3)

- Hazır kulüp listesi federasyon portalıyla tamamlandı: 73 lig kulübü + portaldaki GSB numaralı 192 kulüp = 265 kulüp (+ Dikili, GSB 35-01-01304). Her kayıtta GSB kulüp no (tfId), il numaranın ilk iki hanesinden. Ferdi, il temsilciliği ve okul kayıtları alınmadı. GSB no tek değil (32-01-00056 iki kulüpte), anahtar sayılmaz.
