## Nerede kaldım

- Plan, görev ve notlardaki mesajlaşma kaldırıldı (Seyhun: "görev, plan, notlarda mesajlaşmayı kaldıralım, ayrı mesaj sistemimiz var"; telefonda denenmedi). Kaldırılanlar: kayıt ekranının altındaki mesaj listesi ve yazma kutusu (AddSheet), çalışanın atanan kayıttaki "Ana hesaba mesaj yaz" kutusu (Assigned.jsx), kayda mesaj yazma (`addReply`, DataProvider), kayıt mesajı bildirimi (`/api/notify` "reply" artık bir şey göndermez; `replyText` silindi), "Senin için" listesindeki "Mesaj: plan/görev/not konuşmaları" satırları (ForYou), Notlar listesindeki okunmamış mesaj noktası, asistanın "Bu kaydın konuşması" alıcısı (`RECORD_TO`, mesaj.js, useAssistant, yapay zeka istemi). Kayıt ekranında asistana "Ali'ye bununla ilgili yaz" denince mesaj Mesajlar'dan Ali'ye gider; alıcı söylenmezse asistan kime yazacağını sorar. Firestore'daki eski mesajlar (`replies`) silinmedi, yalnız görünmüyor. "Tamamladım" ve görüldü/iletildi durumu aynı. Mesajlar sayfasına dokunulmadı. Kural değişikliği yok.

## Sıradaki işler

- Telefonda bir planı, görevi ve notu aç: altta mesaj kutusu olmamalı. Çalışan hesabıyla atanan bir görevi aç: yalnız "Tamamladım" kalmalı.
