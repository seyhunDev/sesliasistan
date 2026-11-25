## Nerede kaldım

- İngilizce › Kalıplar › Hatırla "basınca tıkanıyor" düzeltildi (`src/features/words/useEnMic.js`, `ChunkStudy.jsx`). Bulutta Chromium'da sahte mikrofonla yeniden üretildi: eski kodda iPhone'daki gibi kayıt durma olayı (onstop) gelmeyince düğme sonsuza dek "dinliyor"da kalıyordu; kayıt boş gelince "Ses duyulmadı"; açılırken ya da dururken ikinci dokunuş kaydı boş gönderiyordu.
- Yeni mikrofon: durum off · opening · rec · stopping; açılırken/dururken dokunuş yok sayılır; okunan İngilizce mikrofondan önce susar (`stopEn`) ve iPhone için kısa bekleme (`settleWait`); mikrofon açılamazsa bir kez yeniden; 1,8 sn ses yoksa bir kez yeniden açılır; kayıt boşsa ham sesten WAV; durma en çok 2,5 sn bekler.
- Hatırla ekranı: "Bas ve konuş" · "Mikrofon açılıyor…" · "Dinliyorum · bitince bas" (halka sesle büyür) · "Bakıyorum…" · doğru / yanlışta "Sen: …" + doğrusu + "Tekrar söyle". Resim hazır değilse Türkçesi görünür (önceden boş gri kutu).
- Konuş (WordTalk) aynı mikrofonu kullanır; açılırken bırakınca kayıt açık kalır, ikinci dokunuş gönderir.
- Telefonda denenmedi.

## Sıradaki işler

- İngilizce sayfasına özel yeni tasarım (telefon + iPad, dikey + yatay): örnekler gösterildi, Seyhun'un seçimi bekleniyor.
