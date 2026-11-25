## Nerede kaldım
- Kim hangi bildirimi alır (Seyhun: "sporcuya sadece fitness ile yani antrenmanı ile ilgili bildirim gelmeli... herkes kendi yaptığı ve takip ettiği şeylerin bildirimlerini alıyor olmalı"; telefonda denenmedi): tek kural `src/lib/notifyRules.js` (`allowNotify(kişi, tür)`, `planCat`, `recordCat`, `trainees`; `isTraining` buraya taşındı, trainingLog buradan alır).
  - Sporcu ve öğrenci: antrenman (training), fitness, mesaj (chat), deneme (test). Veli: devamsızlık (absent), aidat (dues), mesaj, deneme. Ana hesap, çalışan, aile, diğer: hepsi (eskisi gibi).
  - Uygulanan yerler: `pushSend.sendTo` (payload.cat; türsüz bildirim sporcuya/veliye gitmez, zile de yazılmaz; neden `WHY.rule`, `pushWhy` metni), `/api/notify` (her olaya cat), `plan-reminders.mjs` (kendi hatırlatması, plana özel hatırlatma: almayan kişi "gitmedi" yazılmadan atlanır; günlük özet ve ekler sporcu/veliye gitmez).
  - Yeni antrenman bildirimi: ana hesap/antrenör/çalışan bugüne ya da ileriye antrenman ekleyince (iptal değil, 2 dk içinde) uygulamadaki sporcu ve öğrencilere bir kez "Yarın 16:00'da Antrenman var (Liman)" (`/api/notify` atama yolu, `notified.<uid>`; DataProvider antrenman planını toNotify'a ekler). Sporcunun eklediği antrenman diğer sporculara gitmez. Ayrılan ya da hesapsız sporcu almaz.
  - Velide Ayarlar › Günlük özetler satırı gizlendi. `profileOf` artık `kind` da döner.
  - Testler: `bildirim.mjs` "Kim neyi alır (sporcu, veli)" (20 durum: yeni antrenman, idman adlı Genel plan, eski/iptal/geç antrenman, sporcunun kendi antrenmanı, yarış planı ataması "kural", değişiklikler, fitness, mesaj, veliye görev, devamsızlık, kural tablosu, zamanlayıcı hatırlatma ve özetleri). Eski üç test yeni kurala göre değişti (sporcuya görev artık gitmez).

## Sıradaki işler
0. Telefonda: Seyhun yarına antrenman eklesin, sporcu hesabında "Yarın …'da Antrenman var" gelsin; sporcuya görev verince gitmesin ve Seyhun'a "Sporcuya yalnız antrenman…" yazsın.
1. Mesajlar sporcuya açık; Seyhun isterse kapatılır (ALLOW.athlete'ten "chat" çıkar).

## Asistan
- Bildirim kuralı (2026-11-25): sporcu/öğrenci yalnız antrenman, fitness, mesaj; veli yalnız devamsızlık, aidat, mesaj. Yeni bildirim türü eklerken payload'a `cat` yaz; yazılmazsa sporcuya ve veliye gitmez (lib/notifyRules).
