## Nerede kaldım

- Planlara "Önemli" işareti geldi (Seyhun 2026-10-21 örneği onayladı). Plan kaydında `important: true`; `src/lib/planImportant.js` isImportant(p): alan ya da adında "son gün/günü, son tarih, son ödeme, son başvuru, son kayıt" geçmesi (yarış talimatından gelen son tarihler kendiliğinden önemli).
- Görünüş: ana sayfa takvim listesi, Planlar ve Takvim satırları açık mor zeminli, alt satırın başında mor "Önemli" etiketi (`src/components/ui/ImpTag.jsx`); ana sayfa Sırada tarih kutusu mor çerçeveli.
- Plan ekle (DraftCard) ve düzenle (EditCard) formlarında "Önemli" anahtarı; taslak `d.important` drafts.js ve DataProvider.addDrafts ile kayda gider.
- Sesle "önemli" (yeni plan + "önemli yap/çıkar"): asistan thread'i ("Sesli asistanın çalışma sistemi") bu PR'dan sonra ekleyecek.
- Telefonda denenmedi.

## Sıradaki işler

- Sesle önemli işaretleme (asistan thread'i).

## Tasarım

- Önemli plan: açık mor zemin + mor "Önemli" etiketi; amber kullanılmaz.
