## Nerede kaldım

- Program hazırla tek ekran ve eksiklerin gösterilmesi (Seyhun: "sporcu için program oluşturamıyorum, eksik kalan gösterilmiyor; daha sade, tek ekranda seçimler"; telefonda ve gerçek Gemini ile denenmedi): adımlar kalktı, her şey tek ekranda: Kimin için, Yaşı ve sporu (sporcuda), Hedef, Haftada kaç gün, Ne zaman, Nerede; günler, saat, süre ve ölçüler kapalı "Ayrıntılar"da. Eksik bir seçim varsa düğmenin üstünde kırmızı yazar ("Hedef seç.", "Sporcunun yaşını seç." gibi), düğme o zaman kapalı. Neden oluşmuyordu: yapay zeka program yerine soru/cevap dönünce (ör. sporcunun kilosu yok) uygulama yalnız kısa bir bildirim gösterip kapanıyordu. Artık form isteği `want: "program"` ile gider; yapay zeka eksik bilgide varsayım yapıp notta söyler, yine program gelmezse hata pencerede kırmızı kalır (`askErr`, FitnessHome.jsx; /api/fitness). Kural değişikliği yok.

## Sıradaki işler

- Telefonda Fitness › + › bir sporcu seç, seçimleri yap, "Programı hazırla"; program gelmeli. Kırmızı yazı çıkarsa yazanı threade yaz.
