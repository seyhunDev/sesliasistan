@AGENTS.md

Her görev bitince kullanıcıya önce test edip GitHub'a göndermesini hatırlat: `npm run gonder -- "kısa açıklama"` (testler + derleme geçerse kaydeder ve gönderir; gizli dosya varsa durur). Sonra proje dökümünü yenilemesini hatırlat: `node scripts/proje-ozeti.mjs` (çıktı ~/Downloads/sesliasistan-ozet-<tarih>.md; yeni sohbette paylaşılır).

## Çalışma kuralları (her sohbette geçerli)

- Kullanıcıyla Türkçe konuş. Proje: Dikili'deki yelken kulübü için Türkçe sesli asistan PWA'sı (Next.js 16, Firebase sesliasistan-3e95a, Netlify https://sesliasistan.netlify.app). Kullanıcının yerel klasörü ~/Projeler/sesliasistan (Mac).
- Gizli bilgi asla yazılmaz, pakete ya da depoya konmaz: service account JSON, VAPID özel anahtarı, API anahtarları, şifreler. Kullanıcı sohbete şifre yapıştırırsa kullanma, tekrar etme; yenilemesini öner. Banka dosyası (HesapOzeti.xls) verisi tekrarlanmaz.
- DEV_SKIP_AUTH Netlify'da asla açılmaz. Şifreler hiçbir yerde saklanmaz.
- firestore.rules değişirse kullanıcı Firebase konsolundan yayınlar (Firebase CLI yok): `pbcopy < firestore.rules`, sonra Firestore › Kurallar › Yayınla. Bunu her seferinde hatırlat.
- Sporcu verisine ve ana hesap (seyhunyildiz) hesabına dokunma.
- Kullanıcıya verilen terminal komut bloklarında `#` yorum satırı olmasın.
- Değişiklikler GitHub'a gönderilebiliyorsa doğrudan gönder; gönderilemiyorsa tar.gz + .sha1 paketi ver (kullanıcı `tar xzf` ile açar, sonra `npm run build && netlify deploy --prod`).
- Testler: `npm test` (asistan yerel kuralları + derleme), canlı: `node --no-warnings scripts/uygulama-test/calistir.mjs` (hesap sorar), yapay zeka: `node scripts/asistan-test/calistir.mjs --yz`. Lint'te önceden var olan hatalar: AssistantSheet 4, AddSheet 5, DataProvider 2, receipts/[id] 1; yeni hata ekleme.
- Yapay zeka: Gemini 3.x için `thinkingLevel: "minimal"`, eskiler için `thinkingBudget: 0` (lib/ai/gemini.js). Hata türleri lib/ai/errors.js.
- Sıradaki işler: Asistan Sahnesi 2. adım (sayfada arka plan vurgusu / hayalet taslak), 3. adım (mesajda hayalet balon).
