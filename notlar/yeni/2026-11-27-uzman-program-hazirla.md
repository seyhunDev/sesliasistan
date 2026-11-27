## Nerede kaldım

- Uzmanla çalışma tek yol (Seyhun 2026-11-27 "yap", örnek project-files/admin-sayfasi/uzman-program.html): sporcu ister → Admin uzmanı atar (atamak başlatmaktır) → uzman program hazırlar → süre bitince ya da "⋯ Uzmanla çalışmayı bitir" ile biter. "Kabul et", "Yeniden başlat" kalktı; Reddet yalnız bekleyen istekte.
- Atama ve bitirme sunucudan: PATCH /api/uzman-istek { ata: uzmanId } / { bitir: true } (yalnız ana hesap). İsteğe bas/bit/bitti, sporcunun users/{uid}.fitUzman { id, ad, istek, bas, bit } ve bitince fitUzmanGecmis yazılır (fit alanına değil: saveProfile fit'i baştan yazar). Saf işlevler lib/fitness/uzmanIstek.js ayEkle, uzmanBag, uzmanSurer, istekHafta (test elle.mjs).
- Ayrı sayfa /settings/admin/uzman/[id]/program/[istek] (`src/features/admin/UzmanProgram.jsx`): sporcunun hedefi, dolu günleri (paylaştığı planlar), yaş/spor/süre üstte; ortak NewProgram `inline uzmanAd ek hafta` (yapay zeka, hazır, kendim, PDF; Uzmanla çalış yok) + ProgramEditor; kayıt Fitness'taki gibi, programa `by { id, ad }`, sporcunun antrenmanlarına fit.by (ad).
- Sporcunun Fitness'ı: uzmanı varken "Uzmanla çalış" yerine "Uzmanın: X · bitiş …", bugünkü antrenmanda "Hazırlayan: X". AuthProvider profile.fitUzman.
- Telefonda denenmedi. Kurallar değişmedi.

## Sıradaki işler

- Uzmanın kendi girişi.
