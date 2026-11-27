## Nerede kaldım
- Yarışa artı/eksi gün eklenmiyor (Seyhun 2026-11-27 "artı eksi gün eklemeyeceğiz, olanlar da gerçek tarihlerine dönsün, bir kere düzeltelim"). İki yer vardı:
  - Takvim › PDF hazırla penceresinde yarışa Önce/Sonra gün ekleme (yalnız PDF, cihazda saklanıyordu): kalktı; eski ayar yok sayılır (lib/veliTakvimi.js parentRaces, VeliTakvimi.jsx).
  - Yolculuk yazılınca takvimdeki yarış planı gidiş–dönüş günlerine uzuyordu (raceLinks.racePlanDates): artık hep yarışın asıl günleri; çıkış başka gündeyse plana saat yazılmaz. Yolculuk günleri yarış kaydında kalır.
- Eski uzamış planlar: Yarışlar sayfası açılınca (ana hesap, oturumda bir kez) günleri yarıştan farklı yarış planları yarışın günlerine çekilir; yarış sayfası açılınca da aynı eşitleme.

## Sıradaki işler
- Telefonda denenmedi. Seyhun Yarışlar sayfasını bir kez açınca takvimdeki yarışlar düzelir.
