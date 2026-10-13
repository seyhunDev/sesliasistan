## Nerede kaldım

- Plana özel hatırlatma (Seyhun: "çalışana plan oluşturuldu, 30 dakika önce, 1 saat önce hatırlat seçeneği olsun"; telefonda denenmedi): plan formunda "Hatırlat" satırı: Yok · 15 dk · 30 dk · 1 saat · 1 gün (seçilmezse Ayarlar'daki kişisel hatırlatma geçerli). Sorumlusu olan yeni planda varsayılan 1 saat. Planda yeni alan `remind` (dakika; 0 = yok). Hatırlatma plandaki sorumlulara ve ana hesaba gider (fitness planında yalnız sporcuya; `planRecipients`, reminders.js), 5 dakikalık zamanlayıcı gönderir (`sendPlanReminders`, plan-reminders.mjs; ek sorgu yok, yalnız listede olmayan kişinin profili okunur). Bu planlar kişisel hatırlatmada ikinci kez gönderilmez. Gitmeyen hatırlatma planda "Hatırlatma gitmedi" + nedeni + "Yeniden gönder" (`remindFail`, `/api/notify` event remind). Asistan: "yarın 10'da antrenman, Ali'ye ver, yarım saat önce hatırlat", "antrenmanı 1 saat önce hatırlat", "hatırlatma olmasın" (`remindOf`, `applyRemind`; update `patch.remind`). Kural değişikliği yok. Testleri `test:elle` › "Plana özel hatırlatma", yönlendirme › plan/update.

## Sıradaki işler

- Telefonda dene: bir çalışana 30 dk sonrası için plan ver, "Hatırlat: 15 dk" seç; çalışanın ve senin telefonuna bildirim gelmeli. Asistana "antrenmanı yarım saat önce hatırlat" de.
- Plan saati değişince eski "Hatırlatma gitmedi" satırı kendiliğinden silinmiyor (sonraki başarılı gönderimde silinir).
