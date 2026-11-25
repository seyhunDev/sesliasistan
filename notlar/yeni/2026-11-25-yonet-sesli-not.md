## Nerede kaldım

- Yönet › sporcu adına basılı tut › "Sesli not": antrenör kaydeder (en çok 60 sn, Yeniden çek), Gönder ile o sporcuya ve güne kaydedilir; hemen çalınmaz.
- Veri: `bilgi/n-{id}` (ses), liste `bilgi/notlar-{dev}` (son 20; id, süre, gün), ikisi de `bilgiAcik` aynasına yazılır (`sendNot`, `useNotlar`, `notSes` bilgiStore.js). Kural değişmedi.
- Sporcu ekranı (BilgiScreen `Notlar`): "Notların" düğmesi, listede gün ve süre, dokununca çalar.
- Telefonda denenmedi.

## Sıradaki işler

- Videolara sonradan etiket ekleme/değiştirme (şimdilik yalnız çekimden hemen sonra).
- Sporcunun notları sporcu ana sayfasında (Velora sporcu hesabı) da görünsün mü sorulabilir.
