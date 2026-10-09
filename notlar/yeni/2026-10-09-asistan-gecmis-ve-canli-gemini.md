## Nerede kaldım

- Asistanın önceki konuşmayı bilmesi (Seyhun: "yapay zekaya her gönderildiğinde önceki sohbeti de göndermemiz gerekiyor ki devamını getirelim; ikinci kez basınca eski mesaj önce görünüyor sonra kayboluyor"; telefonda denenmedi): önceden ana yapay zeka son 6 turu, açık mesaj taslağını ve hafızayı alıyordu; görev listesi isteği (`/api/tasks`) yalnız cümleyi alıyordu; asistan kapatılıp açılınca geçmiş hiç gitmiyordu. Artık ekrandan kalkan konuşma, açık taslak ve hafıza 15 dakika saklanır (`past`, `keepPast`, AssistantSheet; `PAST_MS`, convoContext.js) ve her istekte geçmişin başına eklenir; görev listesine de geçmiş ve taslak gider ("onu da ekle", "saati 11 yap" önceki konuşmaya göre bölünür). Yoklama, günlük, yarış gibi akışların kendi istekleri hâlâ geçmişsiz (görev listesi onlara açık cümle yazar).
- Küreye yeniden basınca ekran temiz başlar (bir soruya cevap beklenmiyorsa; `stageListen`), kutuda önceki söz bir an görünmez (TabBar "sending" kipinde yalnız şimdi söylenen).
- Canlı yazı (dinlerken kutudaki yazı) artık önce Gemini Transcribe ile (SMART kip, kelime listesinde çalışanlar, mesaj kişileri, sporcular, yarış adları; sporcu adları bu cihazda `sa-ath-names`, ek okuma yok), olmazsa Whisper. `LIVE_STT=whisper` ortam değişkeni eski sırayı geri getirir. Parçanın gecikmesi Ayarlar › Asistan süre kaydı'nda "Canlı yazı N parça, ortalama …" satırında (`speechLive`, `liveOf`). Kota: canlı yazı her ~2,5 sn'lik parça için bir Gemini isteği; ses dakikası yaklaşık iki katına çıkar (parçalar + son çeviri).

## Sıradaki işler

- Telefonda dene: asistana bir şey söyle, kapat, 1-2 dakika sonra küreye bas ve "onu da ekle …" ya da "saatini değiştir" de; önceki işi anlamalı. Küreye ikinci kez basınca eski söz kutuda görünmemeli.
- Birkaç sesli komuttan sonra Ayarlar › Asistan süre kaydı'nda "Canlı yazı" gecikmesine bak; 2 sn'yi sık geçiyorsa ya da adlar yine yanlışsa yeni threade yaz (Whisper'a dönülür ya da adlar düzeltme adımı eklenir).
