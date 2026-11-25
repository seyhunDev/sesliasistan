## Nerede kaldım
- Sporcu ana hesabın Fitness antrenmanlarını göremiyordu: program ve antrenmanlar sporcunun hesap uid'sine bağlı (`for`, `fit.for`, `people`). Ayarlar › Hesapları temizle hesabı silip yeniden açınca uid değişiyor, eski program eski uid'de kalıyordu. `relinkPrograms` (fitnessData.js): ana hesap Fitness'ı açınca, hesabı artık olmayan sporcunun programı ve tüm antrenmanları (yapılanlar dahil) adı aynı olan tek sporcuya taşınır. Yeni hesabın zaten programı varsa ya da aynı adda iki sporcu varsa dokunulmaz.

## Sıradaki işler
- Antrenörün (normal kullanıcı) kendi sporcularını ekleyip onlara Fitness programı hazırlaması henüz yok (antrenör şimdi sporcu gibi salt okunur Fitness görüyor). Seyhun'un kuralı: sporcu yalnız kendisini ekleyen kişinin programlarını görür. Örnek ve onay bekliyor.
