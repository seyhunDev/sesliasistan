## Nerede kaldım

- Sesli asistan ekran testi eklendi (Seyhun, 2026-10-18: "sesli asistanın işlevleri, yerleri, nerede nasıl gösteriliyor, animasyonları düzgün çalışıyor mu"): `npm run test:asistan-ekran`, `npm run test:hepsi` içinde de 3. katman ("SESLİ ASİSTAN EKRANI"). Dosyalar `scripts/asistan-ekran-test/` (genel testten ayrı klasör).
- Nasıl: Firebase emülatörü (giriş + Firestore, depodaki firestore.rules ile) bu bilgisayarda açılır, sahte ana hesap ve sporcu hesabı yazılır (`tohum.mjs`), uygulama `next dev` ile açılır ve tarayıcı (Playwright) gerçekten giriş yapar. Uygulama emülatöre yalnız `NEXT_PUBLIC_TEST_EMULATOR` varken bağlanır (`src/lib/firebase/clientApp.js`, yayında hiç çalışmaz). Telefonun ses tanıması, sesli okuma ve iPhone ana ekran uygulaması taklit (`taklitler.mjs`); `/api/assistant`, `/api/tasks`, `/api/transcribe`, `/api/tts` tarayıcıda taklit edilir, yapay zekaya hiç istek gitmez; dış adreslere (gerçek Firebase, hava) istek kesilir.
- Java gerekir (Firestore emülatörü); yoksa bu bölüm "atlandı" yazar. firebase-tools ilk açılışta npx ile iner.
- Sınananlar (72 adım): sekme düğmesi, dokun konuş / basılı tut yaz, tam ekran koyu açılış ve kayarak kapanış, halka renkleri (kırmızı/kehribar/mavi/yeşil), görev listesi ✓ ve dolan halka, küçültme ve balon, önceki sohbetler, sesli yanıt ve okuma sonrası mikrofon, "kapat", telefonda cevaplanan sorular (hazır cümle setinden), onaysız kayıt + "Kaydedildi" animasyonu, silme ve mesajda onay, iPhone kayıt yolu (#503), sporcu hesabında / Fitness'ta / yarış multimedyada asistan yok, geniş ekranda sol menü (#504).
- Düzeltilen: yeni sürümden sonraki "Güncellendi" notu tam ekran asistanın yazı kutusunu örtüyordu; asistan açıkken gizlenir (`UpdateNote.jsx`).
- Kalan (test kırmızı): Planlar/Görevler/Notlar/Takvim sayfasında asistana söylenen ilk cümle her zaman yeni kayıt sayılıyor (`assistRoute.js` "prefer"): "dişçi randevusunu sil", "Ege'ye yaz…" yapılmıyor. Asistan kodunun sahibi sohbete bildirildi.
- Rapor: /mnt/project-files/testler/asistan/rapor-2026-10-18.md. Telefonda denenmedi.

## Sıradaki işler

- Tür sayfasındaki ilk cümle sorunu (yukarıda) asistan sohbetinde düzeltilince test yeşile döner.
- Nakit gelir ("kasaya 500 lira gelir yaz") onaysız yazılıyor; para işleri onaylı mı olmalı, Seyhun'a sorulacak.
