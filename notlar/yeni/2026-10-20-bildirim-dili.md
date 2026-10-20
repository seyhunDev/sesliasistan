## Nerede kaldım

- Bildirim metinleri günlük dille (Seyhun: "robot gibi yazıyoruz, direkt planı söyleyelim, kısa olsun, Aç düğmesi olsun"; telefonda denenmedi):
  - Her bildirim tek kısa cümle, başlıkta; gövde boş. "·" zincirleri ve "Seyhun ekledi" yok. Kimin eklediği yalnız ana hesaba giden "Ali yeni görev ekledi: …" bildiriminde yazar.
  - Örnekler: "Bugün 16:00'da Antrenman var (Liman)", "Yeni görevin var: Motor yağını al (yarına kadar)", "1 saat sonra Antrenman var (Liman)", "Antrenman değişti: yarın 11:00'de (İskele)", "Bugün 16:00'daki Antrenman iptal edildi (rüzgâr)", "Ali yaptı: Motor yağını al", "Elif fiş ekledi, ödeme bekliyor: …", "Ali (Ekip): mesaj", "Bugünkü antrenmanın yoklamasını almadın", "Mete bugünkü antrenmana gelmedi", aidat, fatura, kart harcaması, rüzgâr (tek plan) da cümle.
  - Saat eki okunuşa göre (`atTime`: 16:00'da, 11:00'de, 10:15'te, 09:40'ta) src/lib/notifyText.js.
  - Özetler (sabah/akşam/haftalık), çok planlı rüzgâr uyarısı ve mail özeti liste olduğu için başlık + satırlar olarak kaldı.
  - "Aç" düğmesi public/sw.js'de (actions). iPhone ana ekran uygulaması bildirim düğmesi göstermez; bilgisayar ve Android tarayıcısında görünür.
  - Deneme bildirimlerinde "· Deneme" eki kalktı, örnek adlar gerçekçi (Antrenman, Motor yağını al).
  - Zil listesinde başlık 2 satıra kadar görünür (Inbox.jsx).

## Sıradaki işler

0. Telefonda Ayarlar › Testler › Bildirim testi ile metinlere bak. Seyhun'un "From" dediği bildirim hangisi, sorulacak.
