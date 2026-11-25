## Nerede kaldım

- Aynı anda birkaç grup (ör. Sarı ve Mavi yarışta, Kırmızı geri sayımda) için Yayın › Süre ve canlı ekran düzenlendi (Seyhun 2026-11-04). Araştırma raporu: proje dosyaları `coklu-grup/rapor.md`.
- Yarış numarası grubun kendi sırası (`lib/raceLive.js renumber`): her grubun n'inci geçerli startı n. yarış. Eski "son açılan yarışı paylaş" kuralı Sarı 3'e geçince Kırmızı'nın 2'sini 3 yapıyordu.
- Süre satırı "Sarı · 2. yarış". Başlamış yarışa dokununca sınıf / grup / bayrak değişmez; kısa yollar: geri sayımda −1 dk · Eşitle · +1 dk · İptal; yarışta Ekrana al · Dönüşler · Bayrak (yalnız o yarış: abandone N, rota, geri çağırma) · Abandone; bitince Ekrana al · Dönüşler.
- Dönüşler, Ceza, Sesle gir: grup şeridinden seçilen yarış (`selId`), yoksa yarışta olan en son başlayan grup (geri sayımdaki değil).
- Sesle dönüş: "Sarı birinci şamandıra 12 34" Sarı'nın süren yarışına geçip yazar; grubu belli yarış başka grubun adıyla yeniden adlanmaz.
- Canlı ekran (sahne düzeni): start dizisinde ve yarışta sağ üst sütunda yarışın kartının altında diğer grupların küçük satırları (`ScOthers`, `.sc-og`): grup · yarış, son şamandıra ya da Start, süre. Telefon dikeyde gizli.
- Telefonda denenmedi.

## Sıradaki işler

- Start sırası seçimi (Seyhun 2026-11-04): önce hangi sınıf start eder (Optimist, ILCA…), sınıfın içinde grup sırası (Sarı, Mavi, Kırmızı). plan.order zaten sıralı liste; seçim ekranı yapılacak.
- Tek gruba tehir (şimdi tehir bütün güne): plan.ap'a grup alanı, canlıda yalnız o grubun satırında AP.
- İki telefon / internetsiz telefon `starts` ve `plan`'ı bütün yazıyor; start başına alan alan yazma.
