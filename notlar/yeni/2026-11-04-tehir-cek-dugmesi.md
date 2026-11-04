## Nerede kaldım
- Tehir sayacı (Seyhun 2026-11-04 "iptal butonundaki tehir düzgün; diğerlerinde tehir yapıyorum, süre geri saymaya devam ediyor"): asıl sebep Tehir penceresindeki "Tehir çek" düğmesiydi. `onClick={postpone}` tıklama olayını `postpone`'un ilk değişkenine veriyordu; pencerede seçilen grup, Karada/Denizde, iniş, sebep, "inince" ve saatli tehir yok sayılıyordu. #1196'dan önce bu yüzden `a.live` boş kalıp sayaç durmuyordu. İptal › Tehir'de sayaç zaten İptal'de durduğu için o yol çalışıyordu.
- Düzeltme: düğme `postpone(ap)` çağırır; `postpone` tıklama olayı gelirse pencerenin seçimini alır. Tek gruba tehirde sayaçtaki start o grubun bekleyen startlarındaysa (grup adı okunamasa da) sayaç durur.
- Bütün yollar artık aynı: Bayrak › AP / AP üzeri H / saatli, geri sayım kartındaki Tehir, alttaki Tehir, İptal › Tehir → Tehir penceresi → postpone (tüm gruplar: her grubun süren geri sayımı durur, startlar programa döner; tek grup: o grubun). Başka telefon tehir çekince bu telefonun sayacı da durur (#1196). /canli sayacı belgedeki sayaçtan ve startlardan okur; sayaç duruşu belgeye yazılır.
- Test: `test:yaris` "Tehir çek düğmesi pencerenin seçimini gönderir, sayaç her yoldan durur".

## Sıradaki işler
- Telefonda denenmedi. Sayacı tutan telefon Yayın sayfasında değilken (başka sayfa açık) başka telefondan çekilen tehir o telefonun sayacını, sayfa açılana kadar durdurmaz.
