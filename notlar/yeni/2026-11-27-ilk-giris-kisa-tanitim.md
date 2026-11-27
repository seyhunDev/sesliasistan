## Nerede kaldım

- İlk girişte (users.onboarded false) ve Ayarlar › Tanıtımı göster'de eski izin slaytları yerine yeni akış (Seyhun 2026-11-27 "Yap", örnek https://claude.ai/artifact/VthKvT3KXJ2W7CkGYcsK3a):
  1. Sitedeki kısa tanıtım tam ekran: `/tanitim/kisa?app=1` iframe içinde (`src/features/onboarding/IlkTanitim.jsx`). Tek kaynak: yazı ve sesler yine `public/tanitim/kisa/index.html` + `lib/tanitimSes.js`. `?app` görünümü: logo yok, sağ üstte Atla, seslendirme kapalı başlar; Atla ya da son sahne `postMessage({velora:"tanitim-bitti"})` gönderir, Katıl/Giriş ekranı çıkmaz.
  2. "Velora'da ayrıca": tanıtımda olmayan özellikler, görünüme göre (`ozellikler(kim)`: ana / coach (çalışan) / normal (aile, diğer) / veli). iPad'de iki sütun. "Başla" bildirim iznini bir kez ister (sorulmadıysa), sonra ana sayfa. onboarded, introV ve tourDone yazılır ("Şimdi sen dene" çıkmaz).
- Veli tanıtım videosunu görmez, yalnız kendi listesini (Takvim, Bildirimler, İngilizce). Sporcu/öğrenci: değişmedi (AthleteWelcome).
- Eski slaytlar yalnız eski hesaplara "Yenilikler" olarak kaldı (INTRO_V).
- "Hangi spor?" artık yalnız spor seçmemiş ana hesaba (`needsSport` role owner); kulübe eklenen kişiye sorulmuyor.
- Kullanım izni sorusu ilk giriş tanıtımı bitmeden (onboarded true olmadan) sayılmaya başlamaz.
- Telefonda ve iPad'de denenmedi.

## Sıradaki işler

- Telefonda: Ayarlar › Testler › Tanıtım ve karşılama › baştan başlat ile denemek (iPhone uygulamasında iframe içinde video ve ses).
- Tanıtım sayfası değişirse `?app` görünümü (Atla, tanitim-bitti iletisi) korunmalı.
- Başvurular'dan tek dokunuşla hesap açma.

## Tasarım

- İlk giriş: kısa tanıtım (Atla her an) → "Velora'da ayrıca" (Sahne: siyah zemin, limon simgeler, sade satırlar, tek "Başla") → ana sayfa. İzin slaytı yok; mikrofon asistan ilk açılınca, bildirim Başla'da.
