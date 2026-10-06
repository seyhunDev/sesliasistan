## Nerede kaldım

- Arka plan sesi yeniden açıldı, kaydı bozmadan (Seyhun: "mikrofonu durdurduğumda YouTube neden devam etmiyor, birçok uygulamada böyle"; telefonda denenmedi): ilk deneme (PR #140) mikrofon açılmadan önce iPhone ses oturumunu "play-and-record" yapıyor ve kapanınca "transient"te bırakıyordu; kayıt boş geldi, mikrofon açılamadı, PR #148 ile kapatılmıştı. Yeni düzen (`audioSession.js`, `SESSION_SWITCH = true`): mikrofon açılırken kip her zaman "auto"ya döner (kayıt kipini iPhone kendisi seçer, eskisi gibi); bütün mikrofonlar kapandıktan 300 ms sonra kip 600 ms için "transient" olur (iOS oturumu bırakır, diğer uygulamalara devam edebilirsin der), sonra yine "auto". Bu arada mikrofon açılırsa bırakma iptal edilir. Kip yazılamazsa "auto"da kalır. PR #150'nin "takılı oturumu sıfırla, bir kez daha dene" düzeltmesi korunuyor. Sorun çıkarsa `SESSION_SWITCH = false`. Testleri `test:ses` › "Ses oturumu (arka plan sesi)".

## Sıradaki işler

0. Arka plan sesini dikkatle dene: önce asistanla 2-3 kez sesli komut ver, yazının doğru geldiğini gör (ilk denemede "Ses alınamadı" çıkmıştı). Sonra YouTube çalarken asistana konuş, gönder; mikrofon kapanınca YouTube devam etmeli. "Ses alınamadı" ya da "Mikrofon bulunamadı" çıkarsa hemen yeni threade yaz, `SESSION_SWITCH` kapatılır. YouTube devam etmiyorsa iOS sürümünü ve sesin YouTube uygulamasından mı Safari'den mi geldiğini yaz.
