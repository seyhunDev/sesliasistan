## Nerede kaldım
- Altın / Gümüş / Bronz final serisi kontrol edildi: grup seçimi (GROUP_PICK), grup listesi içe aktarma (groupOf "gold/altın"), final listesinin sonraki günlere geçmesi (groupsOn), renkler (FINALS), sonuç PDF'inde grup (race-results grp, sheetRows grp:Altın) zaten hazırdı.
- Eksik olan düzeldi: geçici genel sıralama (provisional, /canli 03 ve sağdaki liste) final gruplarını bilmiyordu, yalnız puana göre diziyordu. Artık final yarışında Altın'da olan herkes Gümüş'ün önünde, Gümüş Bronz'un önünde; grup içinde puan (RRS A8). `finalIdx` son final yarışındaki grubu alır.

## Sıradaki işler
- Atma (discard) hesabı geçici sıralamada yok; resmî sonuç PDF'i yüklenince o geçerli.
