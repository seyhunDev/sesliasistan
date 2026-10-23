## Nerede kaldım
- Velora Yemek takip sayfası: uygulama arkadayken sipariş teslim edilip sonra açılınca "Sipariş bulunamadı" çıkıyordu. Sebep: `useOrder` dinleyici hata verince (telefon arkadan gelince bağlantı/önbellek kopması) ya da önbellek boş gelince siparişi "yok" sayıyordu. Artık "bulunamadı" yalnız sunucu "yok" deyince; hata olursa 3 sn sonra yeniden dinler (5 denemeye kadar), uygulama öne gelince de yeniden dinler, eldeki kayıt ekranda kalır.
- Teslim edilmiş ve puanlanmamış sipariş açılınca "Afiyet olsun" ekranı çıkar; dokunulmazsa 10 sn sonra kendiliğinden kapanır (dokununca bekler).
## Sıradaki işler
- Telefonda dene: takipteyken çık, sipariş teslim olsun, uygulamayı aç.
