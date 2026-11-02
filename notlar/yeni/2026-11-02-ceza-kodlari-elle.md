## Nerede kaldım
- Yayın › Dönüşler'e "Ceza ve sonuç kodları" bölümü ve alt çubukta "Ceza" düğmesi (PenSheet): kayıt listesinden yelken no ya da adla aranır; startın grubu günün grup listesinde varsa önce o grup, "Tüm liste" ile herkes. Tekneye dokun → kod seç (DNC, DNS, OCS, UFD, BFD, DSQ, DNE, RET, DNF) → yazılır; "Kaldır" siler. Listede olmayan numara da yazılabilir.
- Yeni kodlar DNC ve DNE (PEN_CODES, PEN_NAME, raceRounds.js). Puan hepsinde grup sayısı + 1 (roundScore.js); DNE'nin "atılamaz" olması şimdilik fark etmez (geçici sıralamada atma yok).
- Sesle de: "DNE 512", "88 gelmedi" (DNC), "512'nin cezası kalksın" (round-say ve yerel penOf).
- Biten yarışta grup listesinde olup hiç görülmeyen tekne zaten kendiliğinden DNC, startta görülüp finiş yapmayan DNF olur.

## Sıradaki işler
- Atma (discard) gelince DNE atılamaz kuralı uygulanmalı.
- Otomatik ceza (resmî sonuçlardan) sonra.
