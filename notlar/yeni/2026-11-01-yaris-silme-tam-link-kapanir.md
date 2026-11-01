# Yarış silinince her şey silinir, paylaşılan link kapanır (2026-11-01)

## Nerede kaldım
- Seyhun: "yarışı sildiğimde ortak yarışlardan da silebilmeliyim; yarışı silince o yarışın her şeyini sil; sildiğimde linki de kullanılamasın, genel bir sayfaya yönlendirelim."
- `src/features/athletes/raceWipe.js` `wipeRace(orgId, id)`: yarış belgesi → evrak dosyaları (Storage raceFiles) → `dropLive` (fotoğraf/video, sheets, course, entries, raceLive belgesi) → `dropShared` (sharedRaces + sheets/live/course; yalnız açan kulüp ya da Velora ana hesabı, kural zaten izinli) → `/api/canli` DELETE (canliEkran işareti). Yarış sayfası ve asistan "yarışı sil" bunu kullanır.
- Silinen yarışın linki `/canli/<id>`: "Bu yarış kaldırıldı", 6 sn sonra `/canli` genel sayfasına geçer (düğme de var).
- Genel sayfa `/canli` (`LiveHome.jsx`): açık, bitmemiş yarışların listesi (`/api/canli` id'siz, canliEkran işaretlerinden; 30 sn bellek).
- Firestore kuralı değişmedi.

## Sıradaki işler
- Telefonda deneme: yarışı sil → Yarış takvimi (ortak) ve /canli linki.
- Genel sıralamada "Kulübüm" süzgeci (bekliyor).

## Ek (#948)
- Yarış takvimi › ortak yarış sayfasında açan kulüp ya da Velora ana hesabı için "Sil" (iki dokunuş: Sil → Silinsin mi?), `dropShared`; eskiden silinmiş yarışların ortak kaydı buradan temizlenir.
