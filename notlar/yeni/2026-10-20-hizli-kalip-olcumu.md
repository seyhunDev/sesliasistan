## Nerede kaldım

- Hızlı kalıpların 1. aşaması (ölçme) yapıldı (`src/lib/brain/patternMeter.js`).
  - Yapay zekaya giden her istekte telefonun kendi tahmini (öğrenilenler + kurallar, `brainCommand`) yapay zekanın sonucuyla karşılaştırılıyor. Davranış değişmiyor, yalnız sayılıyor.
  - "Aynı" sayılması için iş türü ve kayıt alanları (tür, gün, saat, başlık) ya da açılan sayfa aynı olmalı.
  - Sayılar cihazda (localStorage) tutuluyor; Firestore okuma, yazma ya da kural değişikliği yok.
  - Ayarlar › Öğrenme › "Hızlı kalıp ölçümü": iş türü başına aynı/toplam ve "hazır" işareti (en az 10 istek, %90 aynı). Kopyala son 20 karşılaştırmayı da verir. "Öğrenilenleri sıfırla" ölçümü de siler.

## Sıradaki işler

- Seyhun birkaç gün kullanınca Kopyala çıktısını gönderecek.
- "Hazır" türler (örneğin sayfa açma, saatli plan) yapay zekasız yapılacak. Bu 2. aşama; geri alma ve puanlamayla korunacak.
- Kalıpların cihazlar arası paylaşımı gerekirse Firestore belgesi ve kuralı o zaman eklenecek.
