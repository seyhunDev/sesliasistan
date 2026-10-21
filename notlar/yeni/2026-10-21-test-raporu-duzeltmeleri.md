## Nerede kaldım

- Testler › Asistan › Örnek cümleler: yapay zekaya örnek kişi ve alıcı listesi de gidiyor (`PROBE_CONTEXT`, lib/aiProbe.js). Önceden liste boş gittiği için "Ali'ye yaz", "sporculara söyle", "Ali'ye hatırlat" sohbet sanılıp ✗ oluyordu; uygulamanın kendisinde liste her zaman gidiyor.
- "Instagram'ı aç" yine Instagram sayfasını açar; gönderi açmak için görsel / gönderi / afiş / post sözü gerekir (#656 sonrası hata, postModel wantsPostOpen).
- Yoklama soruları ("dün kimler geldi", "Ali geldi mi") ve "kaç sporcumuz var" telefonda gerçek veriden cevaplanıyor (#568, #571; yapay zeka bu veriyi görmüyor). Testin beklentisi düzeltildi.
- Gerçek yapay zekayla burada denenemedi (anahtar yok); telefonda Testler'i yeniden çalıştırmak gerekiyor.

## Sıradaki işler

- Seyhun Testler'i yeniden çalıştırsın; Örnek cümleler hâlâ ✗ verirse öğrenme kaydının (#661) cevabı etkileyip etkilemediğine bak.
