## Nerede kaldım

- Asistan dosyası bölündü, 3. adım (son): `AssistantSheet.jsx` artık yalnız ekran (~380 satır: sohbet, kartlar, onay düğmeleri). Durum, dinleme, açılış ve sohbetin bütün beyni `src/features/assistant/useAssistant.js` kancasında (~830 satır); işler `isler/`, yönlendirme/yapay zeka/görev listesi/cevap `beyin/` altında. Başlangıçta 3.682 satırlık tek dosyaydı. Davranış değişmedi: `test:hizli` 2000/2000, `test:hepsi --yzsiz` ilk çalıştırmayla birebir, derleme geçti, lint hata sayısı aynı (3). Telefonda denenmedi. Kural değişikliği yok.

## Sıradaki işler

- Telefonda asistanı her zamanki gibi kullan (sesli komut, plan, mesaj kartı Gönder/Vazgeç, görev listesi); önceden çalışıp şimdi çalışmayan bir şey olursa yeni threade yaz.
- Yeni asistan işi `isler/<iş>.js`'e, yönlendirme `beyin/yonlendirme.js`'e, ekran değişikliği `AssistantSheet.jsx`'e.
