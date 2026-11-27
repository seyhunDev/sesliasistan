## Nerede kaldım

- Kulüp sorusunda liste boş çıkıyordu (clubs koleksiyonu boştu; Dikili yalnız Admin › Kulüpler açılınca ekleniyordu). Artık hazır liste kodda: Dikili + TYF Yelken Ligi online kayıtlarındaki 73 kulüp (`src/lib/clubsTyf.js`, kaynak project-files/tyf-kulupler). Veritabanında kayıt olmasa da görünür; Admin'de düzenlenen kulüp `clubs/{id}` ile üstüne yazılır.
- "Kulübün?" ekranı Sahne tasarımında (koyu, limon, ince çizgili liste, adlar iki satıra kadar, belirgin "Kulüpsüz devam et"); liste okunamazsa hazır liste görünür ve "Liste açılamadı · Tekrar dene" yazar.
- Kulüp kaydında "Federasyon kulüp no" (tfId) alanı var. Admin › Kulüpler › "Listeyi içeri al": satır satır `no; ad; il; ilçe` ya da JSON; listede olan kulübün adı ezilmez, yalnız no ve boş il/ilçe dolar. Sonuçlardan önerilerde "Hepsini ekle".
- Yeni kullanıcıya: ana sayfadaki Hesaplar para kutusu ve "Güncellendi · #PR" notu artık yalnız Velora ana hesabında.

## Sıradaki işler

- TYF'nin resmi kulüp numaraları bulunursa "Listeyi içeri al" ile girilecek.
- Yalnız hazır listede olan (veritabanı kaydı olmayan) kulübü Admin'den silmek bir şey değiştirmez; gerekirse "gizle" eklenir.
