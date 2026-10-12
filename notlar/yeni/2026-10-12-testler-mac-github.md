## Nerede kaldım

- Mac'teki tam test de sonucu GitHub'a gönderir (Seyhun: "yerele indirmeyelim"): `npm run test:hepsi` bitince sonuç depodaki `test-sonuclari` dalına yazılır (`son.txt` + `gecmis/<zaman>-<commit>-mac.txt`), ~/Downloads'a dosya inmez. Gönderim geçici bir git dizininden yapılır, Mac'teki çalışma klasörüne ve dallara dokunmaz (`uploadResult`, scripts/tam-test/yukle.mjs). Gönderilemezse (internet, yetki) eskisi gibi ~/Downloads'a yazılır. `--yuklemeden` yalnız dosya yazar. GitHub'daki "Testler" iş akışı aynı dala yazmaya devam eder.

## Sıradaki işler

- Mac'te `git pull` sonra `npm run test:hepsi`: sonunda "Sonuç GitHub'a gönderildi" yazmalı. Gerçek yapay zeka bölümü Mac'teki .env.local anahtarıyla çalışır.
