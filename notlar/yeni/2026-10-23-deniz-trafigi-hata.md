## Nerede kaldım

- Canlıda Deniz trafiği sürekli "yükleniyor"da kaldı (AISSTREAM_KEY ekli). Sebep görünmüyordu: telefon yalnız gemi listesi gelirse ekranı güncelliyordu. Artık hata olursa sayfa "Gemi verisi alınamadı" ve sebebini (ör. "aisstream: Api Key Is Not Valid", "kapandı 1008", "sunucu 500") yazar; ana sayfa kartı da "Veri alınamadı" der (yalnız anahtar yoksa gizli).
- Bağlantı `src/lib/server/aisStream.js`'e taşındı; işlev Node 22 değilse `ws` paketiyle bağlanır (paket eklendi). Hiç mesaj gelmeden kapanma hata sayılır. Yerel sahte sunucuyla test: elle "Deniz trafiği: aisstream bağlantısı".

## Sıradaki işler

- Seyhun sayfayı açınca yazan sebebe göre düzeltmek (anahtar geçersizse aisstream'den yenisi; kapsam yoksa 0 gemi).
