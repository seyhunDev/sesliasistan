## Nerede kaldım

- Fitness ana hesap ekranları sadeleşti (Seyhun'un onayladığı örnek `/mnt/project-files/fitness/sadelestirme-ornek.png`; sporcunun ekranlarına ve sporcu ayrıntı sayfasına dokunulmadı; telefonda denenmedi): (1) Program hazırla tek ekran: Kimin için (sporcu seçilince tek satır + Değiştir), Ne için, Günler ve saat (gün daireleri + Sabah/Öğle/Akşam); yer, yaş/spor, saat, süre, hafta, başlangıç ve profil kapalı "Ayrıntılar"da. "Haftada kaç gün" kutusu kalktı (gün daireleri yeter). (2) Sporcu programında Hazır ekranı: koyu özet kart, günler liste (dokununca o günün hareketleri), "Kaydet ve Ali'ye gönder" (`AthleteReady`, ProgramEditor.jsx; `toName`, model.js). Kendi programın Hazır ekranı aynı. (3) Fitness › Sporcular listesi: her sporcuda baş harf, ad, durum satırı ("Bugün: … · bekliyor", "Çar yapmadı", "Bu hafta tamam"), sağda haftalık sayı ve 7 gün noktası (✓ yaptı, ✕ yapmadı, – atladı); noktaya dokununca o gün açılır. Programı olmayanlar "PROGRAMI YOK" altında "+ Program". Testi `test:elle` › "sporcuya gönder (ad eki)".

## Sıradaki işler

- Telefonda Fitness › + ile bir sporcuya program hazırla: tek ekran yeterli mi, "Kaydet ve …'e gönder" sporcuya bildirim gönderiyor mu. Sporcular listesinde noktalar doğru mu bak.
