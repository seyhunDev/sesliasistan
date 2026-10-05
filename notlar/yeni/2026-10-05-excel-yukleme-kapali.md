## Nerede kaldım

- Banka defterine Excel yükleme kapatıldı (Seyhun: "kullanmayacağız uygulamada, artık günlük mailleri takip ediyoruz"; telefonda denenmedi): Hesaplar › Banka defteri'nde "Banka Excel'i yükle" düğmesi ve Aidatlar › ayar › "Banka Excel'i" görünmüyor; kartta "Banka hareketleri günlük hesap özeti maillerinden ekleniyor." (daha önce yüklenen Excel varsa tarih aralığıyla) yazar. Kod silinmedi: `EXCEL_UPLOAD = false` (LedgerCard.jsx), true yapılınca ikisi de geri gelir; `/api/bank-analyze` duruyor ama çağrılmıyor. Önceden yüklenen Excel hareketleri defterde kalır, dosya satırından silinebilir; "Baştan kur" defteri yalnız maillerden yeniden kurar (yüklenen Excel'ler de silinir). Gelen ödemeler'deki "Excel'ini yükle" ipucu kaldırıldı.

## Sıradaki işler

- Hesaplar sayfasında Excel düğmesinin görünmediğini, günlük maillerden gelen hareketlerin Son hareketler ve Özet'e eklendiğini kontrol et.
