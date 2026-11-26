## Nerede kaldım

- Ayarlar › Durum'daki ilk kart artık "Harcama · bu ay": Gemini token harcaması + görseller (Instagram, İngilizce kalıp, Fitness fotoğrafı) + Fitness animasyonu (FIT_ANIM_PRICE) + Google seslendirme kota aşımı, TL. Bütçe yüzdesi bu toplama göre.
- Karta dokununca "Harcamalar" penceresi (src/features/settings/Spend.jsx): her servis bir satır, tahmini tutar ve servisin kendi sayfasını açan düğme (Gemini › Google Cloud faturalama, seslendirme › Cloud konsolu, Firebase › Kullanım ve faturalama, Netlify, anahtarı tanımlıysa Anthropic/OpenAI/Groq). Gemini satırına dokununca eski ayrıntı (gün gün, iş iş, bütçe) açılır (Usage.jsx UsageDetail). Altta tek satır: "Tahmini; gerçek tutar servisin faturasında."
- Hesap: src/lib/aiUsage.js servicesOf (test: test:elle "Kullanım ekranı"). /api/usage?ai=1 artık dört görsel sayacını (imgs) ve hangi anahtarın tanımlı olduğunu (keys, yalnız var/yok) da döndürür.

## Sıradaki işler

- Firebase ve Anthropic/OpenAI/Groq tutarını uygulama saymıyor ("–"); gerekirse ileride sayaç eklenir.
- Netlify düğmesi takım adı bilinmediği için app.netlify.com ana sayfasını açar.
- Telefonda denenmedi.
