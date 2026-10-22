## Nerede kaldım

- Seyhun "asistan açılırken takılıyor, önce arka plan güzelce açılsın, sonra yazı alanı" dedi. Sebep: açılırken kubbenin (`.dome`) boyu .45 sn boyunca kare kare tam ekrana büyüyordu; her karede yerleşim ve büyük alanın yeniden boyanması. Artık asistan açılıp kapanırken boy bir anda değişiyor (TabBar `wasActive`).
- Sıralı açılış (globals.css `.afull-in`): zemin alttan yükselip belirir (`afbgin`), sonra üst satır, logo, konuşma alanı ve en son yazı kutusu sırayla yukarı kayar (`afpartin`). Logo çubukları 0,12 sn sonra büyür. Kapanış: içerik aşağı kayıp söner, zemin arkasından.
- Önceki sohbetler alanı (`PastSessions.jsx`) kaldırıldı: motor #700 ile ekranda gösterilmiyor (30 sn sonra temiz açılış; yapay zekanın hafızası aynı).
- Ekran testi "zemin": zemin sürekli oynamaz (yalnız açılışta) kontrolüne çevrildi. 107/107.

## Sıradaki işler

- Telefonda denenmedi. Hâlâ takılırsa: logo çubuklarının açılış büyümesi kapatılabilir ya da zemin geçişi yalnız opacity yapılabilir.
