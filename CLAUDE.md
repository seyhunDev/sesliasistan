@AGENTS.md

Her görev bitince kullanıcıya önce test edip GitHub'a göndermesini hatırlat: `npm run gonder -- "kısa açıklama"` (testler + derleme geçerse kaydeder ve gönderir; gizli dosya varsa durur). Ardından Netlify'a yayınlama komutunu her seferinde ayrı bir blok olarak yaz: `npm run build && netlify deploy --prod`. Son olarak NOTLAR.md'deki "Nerede kaldım" ve "Sıradaki işler"i güncelle.

## Çalışma kuralları (her sohbette geçerli)

- Kullanıcıyla Türkçe konuş. Proje: Dikili'deki yelken kulübü için Türkçe sesli asistan PWA'sı (Next.js 16, Firebase sesliasistan-3e95a, Netlify https://sesliasistan.netlify.app). Kullanıcının yerel klasörü ~/Projeler/sesliasistan (Mac).
- Gizli bilgi asla yazılmaz, pakete ya da depoya konmaz: service account JSON, VAPID özel anahtarı, API anahtarları, şifreler. Kullanıcı sohbete şifre yapıştırırsa kullanma, tekrar etme; yenilemesini öner. Banka dosyası (HesapOzeti.xls) verisi tekrarlanmaz.
- DEV_SKIP_AUTH Netlify'da asla açılmaz. Şifreler hiçbir yerde saklanmaz.
- firestore.rules değişirse kullanıcı Firebase konsolundan yayınlar (Firebase CLI yok): `pbcopy < firestore.rules`, sonra Firestore › Kurallar › Yayınla. Bunu her seferinde hatırlat.
- Sporcu verisine ve ana hesap (seyhunyildiz) hesabına dokunma.
- Kullanıcıya verilen terminal komut bloklarında `#` yorum satırı olmasın.
- Değişiklikler GitHub'a gönderilir (bulut oturumunda dal + PR).
- Testler: `npm test` (tüm yerel testler + derleme); derlemesiz hepsi `npm run test:hizli`; alan alan `npm run test:asistan` / `test:ses` / `test:elle` / `test:yaris` (dosyalar `scripts/asistan-test/yerel/<alan>.mjs`, yeni özelliğin testi kendi alanına eklenir); yapay zeka `npm run test:yz`; canlı `npm run test:canli` (hesap sorar). Lint'te önceden var olan hatalar: AssistantSheet 4, AddSheet 5, DataProvider 2, receipts/[id] 1; yeni hata ekleme.
- Yapay zeka: Gemini 3.x için `thinkingLevel: "minimal"`, eskiler için `thinkingBudget: 0` (lib/ai/gemini.js). Hata türleri lib/ai/errors.js.
- Durum, sıradaki işler, tasarım ve asistan kararları NOTLAR.md içinde (aşağıda otomatik yüklenir); kalıcı kararları oraya yaz.
- Token: tüm dosyaları tarama, haritadan ilgili dosyaya git.

## Harita

- Sayfalar: `src/app/(app)/<sayfa>/page.jsx`; giriş `src/app/(auth)`; API: `src/app/api/<ad>/route.js`.
- Asistan arayüzü: `src/features/assistant` (AssistantSheet, AssistantProvider, AssistantFab); sunucu: `src/app/api/assistant`, `src/services/assistantService.js`.
- Yapay zeka: `src/lib/ai` (gemini, anthropic, assistant, rules, schema, errors); ön cevap `src/lib/precue.js`; yerel kurallar `src/lib/assistantLocal.js`.
- Ses: `src/hooks/useSpeech.js`, `src/features/speech`, `src/app/api/transcribe`, `src/app/api/tts`.
- Ana sayfa ve alt çubuk: `src/features/home` (TabBar, HomeHero, StageBrief…); ekleme/taslak: `src/features/add`.
- Veri: `src/features/data/DataProvider.jsx`, Firebase `src/lib/firebase`, sunucu yönetici `src/lib/server`; kurallar `firestore.rules`.
- Diğer özellikler `src/features/<ad>` (athletes, chat, mail, receipts, meeting, weather, staff…); ortak arayüz `src/components/ui`.
- Bildirim zamanlayıcı: `netlify/functions/plan-reminders.mjs`; betikler: `scripts/`.

@NOTLAR.md
