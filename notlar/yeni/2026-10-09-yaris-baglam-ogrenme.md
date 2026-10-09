## Nerede kaldım

- Asistan yarışı sohbetten tanıyor (Seyhun: "aynı sohbette yarışı algılamalı, başka sohbette adını ya da son yarış derim; uygulamayı eğitiyoruz, sonra yapay zekasız hızlıca halletsin"; telefonda denenmedi): bu sohbette oluşturulan, açılan ya da değişen yarış sohbet bitene kadar hatırlanır (`chainRace`, AssistantSheet; görev listesi başlarken artık sıfırlanmaz, "kapat" ve yeni sohbette sıfırlanır). Gönderide ve yarış işinde yarış şu sırayla bulunur: söylenen ad > "son / geçen / en son yarış" (tarihi geçmiş en yeni yarış) > "sıradaki / yaklaşan yarış" > sohbetin yarışı (cümlede "yarış", "bunun için", "o yarış" geçiyorsa) (`raceRef`, `lastRace`, raceNav.js). "Son yarışı aç" da çalışır (`findRace`). Görev listesi isteğine (`/api/tasks`) sohbetin yarışının adı gider, yapay zeka "yarış görseli", "bunun için" yerine adını yazar.
- Yerelde öğrenme: yapay zekanın çıkardığı her işin kullanıcı sözü (`from`) cihazdaki öğrenme kaydına "plan:<tür>" olarak yazılır (lib/brain, Firestore `learn`'e toplu gider, Ayarlar › Öğrenme'de görünür); kurallar tanımasa da benzer cümlecik artık uygulamanın akışı sayılır (`learnedKind`, `flowOf`). Aynı cümle yeniden söylenirse görev listesi yapay zekaya sorulmadan cihazdaki kopyadan gelir (`cachedPlan`, `rememberPlan`, localStorage `sa-plan-cache`, son 60). Yapay zekaya ulaşılamazsa görev listesi yerelde kurulur (`localPlan`): önceden bütün cümle tek iş gibi gidiyordu ve yalnız ilk tanınan iş (ör. gönderi) yapılıyordu.
- Düzeltmeler: büyük harfle yazılan "Instagram" Türkçe küçültmede "ınstagram" oluyor, gönderi isteği tanınmıyordu (postModel `wantsPost`, nav.js, invWords.js). "Atatürk Kupası ekle" gibi "yarış" kelimesi geçmeyen kupa/trofe/şampiyona adı artık yarış kaydıdır (`wantsRaceText`). Testleri `test:asistan` › "Görev listesi: yerelde öğrenme", "Sohbetteki yarış".

## Sıradaki işler

- Uygulamayı kapatıp yeniden aç (yeni sürüm yüklensin), sonra Seyhun'un cümlesini yeniden söyle: "10 Kasım'dan önceki hafta sonuna Atatürk Kupası ekle. Bunun için Instagram gönderisi hazırla… Bugün Mustafa Kemal antrenmana katıldı, yoklamaya ekle." Üstte üç maddelik liste çıkmalı, sırayla yapılmalı, gönderi Atatürk Kupası'na bağlı açılmalı. Başka bir sohbette "son yarış için gönderi hazırla" de.

## Asistan

- Sohbette oluşturulan/açılan yarış sohbet boyunca "bu yarış"tır; başka sohbette yarış adla, "son yarış" ya da "sıradaki yarış" diye söylenir. Yapay zekanın görev listeleri cihazda öğrenilir; aynı cümle ikinci kez yapay zekasız çalışır (2026-10-09).
