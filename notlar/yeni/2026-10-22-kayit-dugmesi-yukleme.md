## Nerede kaldım

- Tek Kayıt düğmesi (Seyhun onayı, örnek `yaris-tasarim/medya/kayit-*.png`): Süre'deki Fotoğraf/Video kalktı (altta yalnız Rüzgâr). Alt sekmelerin (Süre · Medya · Hava · Sonuçlar) sağında Kayıt: her sekmeden uygulama kamerasını açar, kapanınca o sekmeye döner. Medya'nın üstünde "+ Kayıt", alttaki düğmeler kalktı. Kayıt sayaç yokken de bizim kamerayı açar; iPhone'un kendi kamerası ve "Telefonda N video · X MB" / Telefondan sil kameranın sağ üst ⋯ menüsünde. Antrenman ve yarış aynı.
- İzlerken bitmeyen "Yükleniyor": iPhone sesli kendiliğinden oynatmayı engelleyince video hiç inmiyor, halka dönüp duruyordu. Artık engellenirse halka yok, küçük resim + oynat düğmesi; dokununca iner.
- Yükleme: küçük resim yüklemeyle aynı anda hazırlanır (önce %0'da 10 sn'ye kadar bekliyordu); bitince Firestore sunucu onayı en çok 3 sn beklenir (önbelleğe yazılı, arkada tamamlanır; %100'de takılı kalıyordu). Küçük resimlerde yüzde yazar; Medya üstünde "1 kayıt yükleniyor · %45", bitince kısa "Yüklendi ✓".
- iPhone'da uygulama arka plana atılınca / ekran kilitlenince yükleme durur (PWA arka planda yükleyemez); açılınca kaldığı yerden ya da baştan yeniden dener.
- Tarayıcıda denendi, telefonda denenmedi.

## Sıradaki işler

- Telefonda: Kayıt düğmesi, video aç/oynat, yükleme yüzdesi.
