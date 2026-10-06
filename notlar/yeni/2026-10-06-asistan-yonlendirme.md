## Nerede kaldım
- Asistan yönlendirme düzeltmeleri ve yönlendirme testi (Seyhun: "sistemin haritasını çıkaralım, asistan hangi görevleri yapamıyor, hangilerini yanlış yapabilir; asistan hatalarından başla"; telefonda denenmedi). Denetim: `/mnt/project-files/sistem-haritasi/` (harita, 35 iş tablosu, bulgular B1-B13, eğitim durumu). Cümle yapay zekaya gitmeden önce ~20 yerel sorudan geçiyor (AssistantSheet `run`); bazıları başka işin cümlesini yutuyordu (31 karışma cümlesinden 17'si). Düzeltilenler:
  - B1 yoklama: soru ("antrenmana Ali geldi mi", "dün kimler geldi?") ve ileriye dönük cümle ("yarın 17:00 antrenman var, gelmedi derse") yoklama sayılmaz (`wantsAttendance`, access.js).
  - B2/B3/B6 mesaj: cümle birine mesajla başlıyorsa ("Ali'ye yaz, faturayı ödedim", "ekibe yaz, kamp planı yapıyoruz", "Ayşe'ye söyle ders programını göndersin", "Ali'ye söyle teşekkürler") kapatma, günlük, etkinlik, envanter, gönderi, ders programı, doğum günü, fatura, yoklama ve yarış akışlarına girmez; ana yapay zeka mesajı hazırlar (`messageFirst`, steps.js). "Emre gelmedi, velisine haber ver" mesajla başlamadığı için eskisi gibi önce yoklama. Fatura soruya da girmez (`isQuestion`). "Ali'ye teşekkürler de" artık kapatmaz (`isEnd`).
  - "yarın 10'da Foça yarışı için toplantı ekle" yarış kaydı değil, plan (`wantsRaceText`, raceNav.js; saf kural buraya taşındı, testlenir).
  - B4 "Not al: Ali'nin doğum günü …" nottur, doğum günü kaydı açılmaz.
  - B5 "motor yağı görevini yeniden aç" görevi yeniden açar (yapay zeka), Görevler sayfasını açmaz (`localNavigate`).
  - B7 "antrenman" denmeden anlatılan antrenman ("dün 14 knot poyrazda start çalıştık, 2 saat sürdü") günlüğe gider: geçmiş zaman + rüzgâr (knot/yön) + konu (`wantsLog`).
  - B8 soru tanıma Türkçe harfle biten kelimelerde çalışmıyordu ("kaç görev var", "haftayı özetle"; `\b`), taslak varken soru taslağa ekleniyordu (`QUESTION` → `isQuestion`).
  - B9 ön cevap: "notlara ekle …" artık "notu alıyorum" der (önce "görevi hazırlıyorum"); "en son eklediğim not neydi" soru ("eklediğim" ekleme değil); "ayarları değiştirsin diye yaz" mesaj ("ayarları" "ayarla" sanılıyordu); "rüzgar ne durumda" soru (precue.js).
  - B10 "balığa gideceğiz ne lazım" etkinlik (ğ'li yazım, eventWords.js).
  - B11 gerçek yapay zeka testi (`test:yz`): "iptal et" artık iptal (op cancel) bekler, "sil" ayrı; tekrarlayan plan, görevi yeniden açma, not yapıldı, sıralı mesaj + plan, açık not, istenmeden not olmaması eklendi (20 → 27 cümle).
  - B12 yapay zekaya giden veri özetinde gerçek fiş toplamlarının başlığı "(örnek veri)" yazıyordu, kaldırıldı; fiş toplamları uzun yıl listesinden önce (özet 12.000 karakterde kesilince düşmesin; digest.js).
  - Yeni test grubu `test:asistan` › "Yönlendirme: …" (`scripts/asistan-test/yerel/yonlendirme.mjs`): run() sırası birebir taklit edilir, 35 işin her biri için 2-11 cümle, 31 karışma cümlesi, çalışan hesabı; yapay zekaya gidenlerde ön cevabın doğru işi söylediği de sınanır. run() sırası değişirse bu dosya da güncellenir. 1351/1351 geçti, derleme geçti. Kural değişikliği yok.

## Sıradaki işler
0. Asistan yönlendirmesini telefonda dene: "Ali'ye yaz, faturayı ödedim" (mesaj kartı gelmeli, fatura değişmemeli), "antrenmana Ali geldi mi" (yoklama yazılmamalı), "motor yağı görevini yeniden aç", "not al: Ali'nin doğum günü 5 Haziran", "dün 14 knot poyrazda start çalıştık". Yanlış işe giden cümleyi yeni threade ver, `yonlendirme.mjs`'e eklenir.
0. Mac'te `npm run test:yz` çalıştır (27 cümle gerçek Gemini'ye gider); hatalı çıkanı yeni threade ver.
