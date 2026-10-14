## Nerede kaldım

- Mesajlar'da klavye ile yazma kutusu arasındaki boşluk (Seyhun: "klavyeyle arada boşluk kalıyor; mesajlar hafif animasyonlu belirsin"; telefonda denenmedi): ana ekran uygulamasında iPhone klavye açılınca `innerHeight`'ı da küçültüyor, uygulama klavyeyi "kapalı" sanıp ev çizgisi payını (~26 px) yazma kutusunun altında bırakıyordu. Artık klavyesiz tam yükseklik saklanır, yazma alanı seçiliyken ekran kısaldıysa klavye açık sayılır, pay kalkar (`fit`, `full`, ChatView.jsx). Klavyenin üstündeki iPhone'un ok/Bitti çubuğu web uygulamasından kaldırılamaz.
- Yeni gelen ve gönderilen mesaj hafifçe aşağıdan belirir (0,26 sn; açılışta ve önceki mesajlar yüklenirken yok; "Hareketi azalt" açıksa yalnız solma). `msg-in` (globals.css), `seen` (ChatView.jsx).

## Sıradaki işler

- Telefonda bir sohbette yazma kutusuna dokun: kutu klavyeye yapışık olmalı. Boşluk sürerse ekran görüntüsüyle yaz.
