## Nerede kaldım

- Sporcu hesabı Mesajlar'da yalnız Sporcular grubunu ve ana hesabı görür (Seyhun: "sporcular mesajlarda sadece sporcular grubunu ve ana hesabı görebilmeli; ana hesap başkası olursa o gözüksün"; telefonda denenmedi): ana hesap e-postayla değil kulübün sahibi olarak bulunur (orgId). Sporcunun Yeni sohbet listesinde yalnız ana hesap var, "Yeni grup" yok; daha önce çalışanla açılmış birebir sohbetler ya da eklendiği gruplar listede görünmez (`ownerOnly`, `canGroup`, kinds.js; ChatProvider `mineOk`; NewChatSheet). Çalışanların kişi listesinde de sporcu yok (birebir yazışma yalnız ana hesapla). Öğrenci ve veli değişmedi. Kural değişikliği VAR: `talkOk` sporcuyu yalnız ana hesaba açar, sporcu grup kuramaz. Testi `test:elle` › "Sporcu mesajları".

## Sıradaki işler

- firestore.rules'ı Firebase konsolundan yayınla. Bir sporcu hesabıyla gir: Mesajlar'da yalnız Sporcular ve ana hesap görünmeli, + ile yalnız ana hesap seçilebilmeli.
- İstenirse öğrenci ve veli hesaplarına da aynı kısıt.
