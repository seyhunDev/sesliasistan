## Nerede kaldım

- Kısa tanıtımın açılışında "Antrenör. Sporcu. Tekne. Tek uygulama." yazıları çok hızlı geçiyordu (her biri 0,6 sn, sabit) ve seslendirmeyle eş değildi: animasyon sahne açılır açılmaz başlıyor, ses dosyası ise sonra yükleniyordu (Seyhun 2026-11-28).
- Düzeltme (`public/tanitim/kisa/index.html`, `introPlan`): her yazı, seslendirme cümlesinde ("Antrenör, sporcu ve tekne. Hepsi tek uygulamada: Velora.") kendi kelimesinin geçtiği anda çıkar ve sıradakine kadar kalır; logo "Velora"da. Ses kapalıyken cümle 6,5 sn sayılır (önceki ~2,6 sn yerine). Ses açıkken sahne bekler (`.hold`), ses gerçekten çalmaya başlayınca (`playing`) sesin kendi süresiyle başlar; ses 4 sn içinde gelmezse yazılar beklemez.
- Telefonda sesli denenmedi.

## Sıradaki işler

- SAY_IN cümlesi değişirse `IN_AT` kelimeleri (Antrenör, sporcu, tekne, Hepsi, Velora) cümlede geçmeli.
