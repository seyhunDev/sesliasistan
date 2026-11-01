## Nerede kaldım

- İngilizce sayfasına "Konuş" eklendi (Seyhun 2026-11-01: "yapay zeka ile karşılıklı diyalog… ipucu… sesli de yazarak da… her kelimede en az 5 karşılıklı… sesli şey açıksa yapay zekayı da seslendirelim"; örnek /mnt/project-files/ingilizce-kelime/konusma/ornek.png onaylandı). Kelime ekranının altı: Geç · Sına · Konuş (tekrar noktaları kalktı).
- Konuşma (src/features/words/WordTalk.jsx): 5 tur. Yapay zeka soru ya da günlük cümle söyler (kelime geçer), altında Türkçesi; "İpucu" örnek cevabı ve Türkçesini açar. Cevap yazıyla ya da sayfanın mikrofonuyla (basılı tut-bırak gönderir; kısa dokunuş kaydı açar, ikinci dokunuş gönderir). Hatalı cevabın altında "Daha doğru: …", doğruysa ✓ Güzel. 5 cevaptan sonra kapanış cümlesi, Bitir · Sına.
- Sunucu: /api/word `talk: true` (turns), sesli cevapta multipart (data + audio): Gemini aynı çağrıda kaydı İngilizce yazıya döker (heard), düzeltir (fix), sıradaki cümleyi (next) ve ipucunu (hint) verir. /api/transcribe Türkçe olduğu için kullanılmadı.
- Ses: Sesli yanıt (Ayarlar) açıksa yapay zekanın cümlesi kendiliğinden İngilizce okunur (sayEn: Google en-US, yoksa telefonun sesi); konuşma ekranındaki hoparlörle o ekranda kapatılır. primeEn: dokunuşta iPhone ses öğesini açar.
- Mikrofon: src/features/words/useEnMic.js (MediaRecorder, en çok 30 sn).
- Ana asistan düğmesi (alt çubuktaki küre) bu ekrana bağlanmadı: asistanın mikrofonu Türkçe yazıya döker, İngilizce cevabı bozar. Cevap sayfanın kendi mikrofonundan verilir.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: mikrofon izni, kayıt (iPhone audio/mp4), yapay zekanın sesi.
- İstenirse: konuşma ekranı açıkken alt çubuktaki asistan küresi İngilizce kaydı bu ekrana göndersin (asistan motoru başlığıyla birlikte).
