## Nerede kaldım

- İngilizce › Kalıplar › Hatırla "A · Altyazı" tasarımına geçti (Seyhun 2026-11-25 seçti; örnek /mnt/project-files/ingilizce-hatirla/ornek.html, https://claude.ai/artifact/DBdUitd31nUowcZezHDjF1): `src/features/words/Altyazi.jsx`, tam ekran (z-54), kalıbın resmi bütün ekranı kaplar, cümle film altyazısı gibi altta (Bricolage Grotesque, `words/fonts.js`), en altta sarı "Bas ve konuş" çubuğu; dinlerken kırmızı, sesle büyüyen dalga; Bakıyorum'da ortak Loader; yanlışta "Sen: …" + doğrusu + "Tekrar söyle" + Atla/Konuş; doğruda Atla/Konuş. iPad'de yazı büyür, içerik en çok 48rem. Resim yoksa koyu alacakaranlık zemin + Türkçesi.
- Konuş: kişinin söylediği yerine "otomatik cevap" yazılıyordu (yazıya döküm konuşma bağlamıyla aynı çağrıdaydı, model beklenen cevabı yazabiliyordu). Artık /api/word önce bağlamsız `scribe` (kelimesi kelimesine, hatalıysa hatalı) yapar, sonra yazılı cevap gibi değerlendirir. Hatırla (`hear`) da aynı: önce döküm, büyük-küçük harf/noktalama/kısaltma dışında aynıysa doğrudan doğru, değilse yapay zeka karşılaştırır. `maxDuration` 26.
- Konuş'ta altta küçük 3 örnek cevap (İngilizce + Türkçesi) hep görünür, dokununca okunur ("İpucu" düğmesi kalktı). Yazı kutusu durumu söyler: "Yaz ya da mikrofona bas" / "Mikrofon açılıyor…" / "Dinliyorum · bitince bas".
- Telefonda denenmedi.

## Sıradaki işler

- Dinle, Değiştir, Kur ve Konuş adımlarını da Altyazı görünümüne geçirmek (Seyhun'a sorulacak).
