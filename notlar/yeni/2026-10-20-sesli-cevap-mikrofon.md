## Nerede kaldım

- Hata (Seyhun, 2026-10-20): sesli cevaptan sonra mikrofon yeniden açılınca ses alınmıyor ("ses duyulamadı"), asistan kapatılıp açılsa da düzelmiyor.
- Olası neden: sunucu sesi (Google TTS) çalındıktan sonra ses öğesinin kaynağı dolu kalıyordu; iPhone ses oturumu "çalma" kipinde kalıp mikrofona ses vermiyor (sessiz sesin açılışında da aynı sebeple kaynak boşaltılıyordu).
- Düzeltme: okuma bitince, durdurulunca ve hata olunca ses öğesi boşaltılıyor (`TtsProvider.jsx` release).
- Telefonda denenmedi; masaüstü tarayıcıda bu sorun görünmediği için bulutta doğrulanamadı.

## Sıradaki işler

- Seyhun: sesli yanıt açıkken birkaç soru sorup mikrofonun her seferinde ses aldığına (yeşil nokta) bak. Hâlâ olursa: Ayarlar › Sesli yanıt'ta ses seçimi cihaz sesi mi Google sesi mi, onu yaz.
