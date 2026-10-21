## Nerede kaldım

- Instagram gönderisi yarışa bağlanıyor. "Atatürk Kupası oluştur… Instagram görseli hazırla" gibi, adı söylenmeyen gönderi istekleri ("Instagram görseli hazırla", "bunun için afiş yap") sohbetin az önce oluşturulan ya da açılan yarışına, yoksa açık yarış sayfasına bağlanıyor (`postRaceOf`, `postGeneric`). Önceden yarış adı geçmeyince gönderi yarışsız hazırlanıyordu.
- "Atatürk Kupası'nın görselini aç / gönderisini göster" yarışın kayıtlı gönderisini açıyor (`wantsPostOpen`, yol `postOpen`, `openPost`). Sohbette görselin küçüğü ve "Gönderiyi aç" düğmesi çıkıyor. Gönderi yoksa "kayıtlı gönderi yok" diyor; yarış söylenmezse Gönderiler sayfası açılıyor.
- Konuşma raporları: asistan her kapanınca o konuşmanın raporu sunucuya kaydediliyor (`/api/assist-log`, Firestore `asstReports/{uid}/list`, yalnız sunucu okur ve yazar, kural değişikliği yok). İnternet yoksa telefonda bekliyor, sonraki kapanışta gidiyor.
- Ayarlar › Testler › Asistan raporu sayfasının altında "Kayıtlı konuşmalar" tarih tarih listeleniyor; dokununca o konuşmanın raporu açılıyor (Paylaş / Kopyala).
- Telefonda denenmedi.

## Sıradaki işler

- Kayıtlı raporlar öğrenmede kullanılacak (Seyhun istedi). Örneğin yapay zekanın düzelttiği sözler ve yanlış yönlendirmeler raporlardan çıkarılıp öğrenmeye beslenebilir.

## Asistan

- Her asistan konuşmasının raporu sunucuda saklanır (asstReports, en çok 60 KB/konuşma).
