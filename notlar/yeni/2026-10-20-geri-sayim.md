## Nerede kaldım

- Asistan motoru 3a (Seyhun, 2026-10-20; örnek /mnt/project-files/asistan/motor-ornek/ornek.png): hazırlanan kayıt (plan, görev, not) ve uygulama içi mesaj kartta 3 sn bekler, altında mor çizgi dolar; dolunca kendiliğinden kaydedilir / gönderilir. Kayıt kartında Kaydet (hemen) · Düzenle · ✕ (iptal); mesaj kartında Gönder (hemen) · Vazgeç, başlık "Mesaj · gönderiliyor". Mesaj metni elle düzeltilirse sayım durur, Gönder'e basılır. Kullanıcı o an konuşuyorsa beklenir. Asistan kapanırken sayım sürüyorsa iş yapılır (kapatmak vazgeçmek değil).
- Kod: `useAssistant.js` (AUTO_MS, auto, armSave, flushAuto), `isler/kayit.js` (hazır taslak armSave), `isler/mesaj.js` (pending.auto), `beyin/cevap.js` (finish → flushAuto), `AssistantSheet.jsx` (AutoLine), `globals.css` (@keyframes autofill). Ekran testi senaryoları güncellendi (`scripts/asistan-ekran-test/adimlar.mjs`).
- WhatsApp'a gidecek mesajlar (dokunuş gerekir), silme ve para işleri eskisi gibi onay ister (Seyhun seçti).
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: "yarın 10'da antrenman ekle" → kart 3 sn çizgiyle, sonra Kaydedildi; "Ali'ye yaz yarın erken gelsin" → 3 sn sonra Gönderdim; çizgi dolmadan ✕ / Vazgeç.
- Değiştirme/tamamlama işleri hâlâ hemen yapılıyor (geri alınabilir); istenirse onlara da çizgi eklenir.

## Asistan

- Oluşturma ve uygulama içi mesaj: 3 sn geri sayımla kendiliğinden (kartta çizgi, iptal/hemen düğmesi). Silme, para ve WhatsApp onaylı. Bu, "mesaj gönderme onay ister" kuralının yerini aldı.
