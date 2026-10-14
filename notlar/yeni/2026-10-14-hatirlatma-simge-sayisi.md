## Nerede kaldım

- Plan hatırlatması simgedeki sayıyı artırmıyordu (Seyhun: "10'daki planın 1 saat öncesinde bildirim geldi, zilde göründü ama uygulama simgesindeki sayıya eklenmedi"; telefonda denenmedi): hatırlatma, planın atama/değişiklik bildirimiyle aynı etiketi (`plan-<id>`) taşıyordu; zil listesinde aynı etiketli yeni bildirim eskisinin yerine geçtiği için okunmamış atama bildirimi varken sayı aynı kalıyordu. Hatırlatmanın etiketi artık `remind-<id>` (reminders.js `reminderText`); zilde ayrı satır, sayı artar. Testi `test:elle` › "Plana özel hatırlatma" › "simge sayısı".

## Sıradaki işler

- Bildirim yazılarını sadeleştirme önerisi Seyhun'un onayını bekliyor (başlık: plan adı · saat, alt satır: ne zaman · yer). Onaylanırsa public/sw.js tek satır birleştirmesi kaldırılır, notifyText.js yazıları değişir.
