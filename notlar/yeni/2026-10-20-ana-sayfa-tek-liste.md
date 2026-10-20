## Nerede kaldım

- Ana sayfa takvimi tek kartta (Seyhun 2026-10-20: "tek bir listemiz olsun"): önce bugün saat saat, ince başlıkla "Yarın · Çarşamba", sonra "Sırada" (en çok 4 satır). Ayrı Yarın ve Sırada kutuları kalktı.
- Her plan bir kez görünür: yarın ve sonraki planlar birlikte gruplanır (`homeList` → `raceGroups`), yarışın yarınki işi Yarın'da değil yarışın satırında durur. Test: elle.mjs "tek liste".
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda bak: yarışın yarınki işi yalnız yarış satırında mı, başlıklar yeterince belirgin mi.

## Tasarım

- Ana sayfa takvimi tek kart; gün bölümleri yalnız ince çizgi + küçük gri başlıkla ayrılır, ayrı kutu yok.
