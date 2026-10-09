## Nerede kaldım

- Asistan yönlendirmesi tek tabloda (inceleme adım 5; telefonda denenmedi): söylenen cümlenin hangi işe gideceği artık `run()` içindeki ~35 sıralı "bu mu?" denetiminde değil, saf bir işlevde: `routesOf(s, bağlam)` cümle için sıralı aday işleri verir (günlük, etkinlik, envanter, gönderi, yarış açma, kişi, sayfa, ders programı, doğum günü, geri al, fatura, ödeme sorusu, son eklenen işler, alışveriş, alıcı sorusu cevabı, yoklama, yarış, tür sayfası, yerel komut, ana yapay zeka; src/lib/assistRoute.js). AssistantSheet adayları sırayla dener; bir iş "benim değil" derse (ör. "ekmek aldım" listede yoksa) sonrakine geçer. Bekleyen sorular (yarış, kişi, onay, taslak, kart) eskisi gibi adaylardan önce çözülür. Davranış değişmedi. Testler artık uygulamanın kendi tablosunu sınıyor (önceden `yonlendirme.mjs` run()'ı elle taklit ediyordu; ikisi ayrışabiliyordu). Yeni: "Konuşma testleri" (birkaç adımlık konuşmalar: alıcı sorusu ve cevabı, "Hangi fatura?" ve cevabı, sporcu ekle sonra "onu arşive al", "Başka isteğin var mı?" sorusuna "yok", soru başka bir istekle kapanır, taslakla ve taslaksız "kaydet", yarış açıp sayfa değiştirme). Kural değişikliği yok.

## Sıradaki işler

- Asistanı her zamanki gibi kullan (sayfa açma, plan, mesaj, yoklama, fatura, alışveriş); önceden doğru giden bir cümle artık yanlış yere gidiyorsa cümleyi yeni threade yaz.
- Yeni bir asistan işi eklenirken: tanıma `routesOf`'a (assistRoute.js) aday olarak, işi AssistantSheet `go` içine; testi `yonlendirme.mjs`'e.

## Asistan

- Yönlendirme tek tabloda: `routesOf` (src/lib/assistRoute.js) aday işleri sırayla verir, uygulama ve testler aynı işlevi kullanır (2026-10-09).
