## Nerede kaldım

- "Mikrofon bulunamadı" düzeltmesi (Seyhun: "mikrofon bulunamadı uyarısı veriyor"; telefonda denenmedi): uyarı, iPhone mikrofonu açamayınca çıkar (izin reddi değil). Önceki sürüm ses oturumunu `transient` kipe çekiyordu; o kip açık kalınca kapatma düzeltmesinden (PR #148) sonra kayıt kipine dönülmüyordu. Artık mikrofon açılmadan önce takılı kalan oturum `auto`ya döner (`micReset`, audioSession.js) ve mikrofon açılamazsa oturum sıfırlanıp 0,3 sn sonra bir kez daha denenir (useSpeech `startServer`). Testi `test:ses` › "Ses oturumu".

## Sıradaki işler

- Yayından sonra uygulamayı ana ekrandan tamamen kapat (yukarı kaydır), yeniden aç, asistanı dene. Hâlâ "Mikrofon bulunamadı" derse iPhone'u yeniden başlat ve Ayarlar › Safari › Mikrofon'un "İzin Ver" olduğuna bak; sürerse yeni threade yaz.
