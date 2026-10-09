## Nerede kaldım

- "Ses yazıya çevrilemedi" düzeltmesi (Seyhun bu hatayı aldı; telefonda denenmedi; sunucu günlüğü görülemedi, olası nedenler kapatıldı): (1) Gemini Transcribe uzun konuşmada (sıralı işler) 8 sn'de yetişemeyip kesiliyor ve 30 dakika kapatılıyordu; artık süre sesin uzunluğuyla 8-14 sn, yetişemezse yalnız 3 dakika Whisper'a geçilir. (2) Whisper ipucu (sözlük + kişi + yarış adları) 600 karakterle sınırlı (Groq 224 token'dan uzununu reddediyor). (3) Telefonda çeviri 5xx dönerse bir kez daha denenir (useSpeech). (4) Hata mesajının sonunda hangi servisin neden olmadığı kısaca yazar (ör. "(gtranscribe:hata, groq:400)"); hata sürerse bu parantezdeki yazı yeni threade verilir.
- İş düzenini yapay zeka kuruyor (Seyhun: "yapay zeka uygulamamda sırayla isteklerimi yerine getirebilecek bir düzen hazırlayıp göndermeli"): `/api/tasks` istemi artık söylenme sırasını korumaz; önce yarış/sporcu, sonra sayfada biten işler, sonra plan/mesaj, arama, sayfa, en son Instagram gönderisi; dayanılan iş önce. Uygulama yapay zekanın sırasını değiştirmez; `orderPlan` yalnız yapay zekasız (yerel) listede.
- Beklerken bilgi yazısı: söylenen yazıya geçerken de "Hazırlıyorum" görünür (önceki sürümde boştu), sonra istekten gelen yazılar ("… oluşturuluyor").

## Sıradaki işler

- Uzun bir sıralı cümle söyle ("29 Ekim yarışı oluştur, yarış için görsel hazırla, bugün antrenmana Mustafa katıldı"): yazıya çevrilmeli, "Hazırlıyorum" görünmeli, işler dokunmadan sırayla bitmeli. Hata çıkarsa mesajdaki parantezli yazıyı yeni threade ver.

## Asistan

- Görev listesinin sırasını yapay zeka kurar (uygulama için en kolay düzen); uygulama yalnız yapay zekasız listede aynı kuralı uygular (2026-10-09).
