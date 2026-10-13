## Nerede kaldım

- Sporcu antrenmanını değiştiremiyor (Seyhun: "sporcu planı görüyor ama set ekleme, setin dakikası, tekrarları, hiçbir şey değiştirememeli"; telefonda denenmedi): kendisine hazırlanan fitness antrenmanında sporcu/öğrenci artık yalnız setleri işaretler, "Nasıl geçti?", not, Atladım ve Antrenmanı bitir. Set listesinde değerler yazı olarak durur ("Değer yaz" yok), "+ Set" yok, süre (dk) kutusu yok ("+ Not ekle"); adım adım ekranda tekrar/süre/kilo − / + düğmeleri yok, yalnız değer görünür (`lock`, FitWorkout.jsx; `Adjust` onChange yoksa, FitGuided.jsx). Ana hesap eskisi gibi düzenler. Firestore kuralı zaten sporcunun yalnız sonucu (`fit.res`) yazmasına izin veriyor, program değiştirilemez; kural değişikliği yok.

## Sıradaki işler

- Sporcu hesabıyla bir antrenmanı aç: değerlere dokunulamamalı, "+ Set" ve − / + görünmemeli; setleri işaretleyip bitirmek çalışmalı.
