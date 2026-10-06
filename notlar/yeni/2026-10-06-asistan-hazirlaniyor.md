## Nerede kaldım
- Asistan "Tamam" yerine ne yaptığını söylüyor ve hazırlarken gösteriyor (Seyhun: "tamam değil de tamam şunu yapıyorum desin, hazırlanırken bir loading ya da güzel bir animasyon"; telefonda denenmedi): ön cevap artık işi söyler: "Tamam, planı hazırlıyorum." (çakışan plan / rüzgâr bilgisi yine eklenir), "Tamam, görevi hazırlıyorum.", "Tamam, notu alıyorum.", "Tamam, mesajı hazırlıyorum.", "Tamam, sırayla yapıyorum: mesaj, takvim ve not.", türü belli değilse "Tamam, hazırlıyorum." (precue.js `DOING`). Yapay zeka çalışırken ön cevabın altında dönen ince halka ve üstünden ışık geçen yazı: "Plan hazırlanıyor…", "Mesaj hazırlanıyor…", "Bakıyorum…" (`work`, precue.js `WORK`; AssistantSheet; globals.css `.work-ring`, `.work-text`); kubbedeki sahnede de görünür, tam panelde yanında Vazgeç. Sonuç ("Ekledim: …") eskisi gibi uygulamadan. Testleri `test:asistan` › "Ön cevap", "Kısa ön cevap", "Sıralı işler (ön cevap)".

## Asistan
- Ön cevap ne yapıldığını kısaca söyler ("Tamam, planı hazırlıyorum."), ayrıntıyı sonuç cümlesi verir; beklerken "… hazırlanıyor" yazısı görünür (Seyhun'un isteği, 2026-10-06; önceki yalnız "Tamam." kararının yerine).

## Sıradaki işler
0. Asistana "yarın 10'da antrenman ekle" de: "Tamam, planı hazırlıyorum." demeli, altında "Plan hazırlanıyor…" dönerek görünmeli, sonra "Ekledim…". Cümleler uzun ya da tekrar gibi gelirse yeni threade yaz.
