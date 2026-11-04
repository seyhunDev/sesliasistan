## Nerede kaldım

- İngilizce sayfası artık kalıplarla öğretiyor (Seyhun 2026-11-02: "kalıplarla kelimeleri öğreneceğim, tek tek kelime öğrenmek istemiyorum… kalıp bloklama"; örnek /mnt/project-files/ingilizce-kelime/kaliplar/ornek.png 2026-11-04 "yap" ile onaylandı).
- Veri: src/lib/englishChunks.js. 5 konu (Günlük konuşma, Fikir ve duygu, İş ve plan, Yolculuk ve dışarıda, Spor ve kulüp), 37 kalıp; her kalıp baş + boşluk + son, 5 parça ([İngilizce parça, Türkçesi, cümlenin Türkçesi]), kullanım notu (rule) ve Kur için yakın yanlış baş (near).
- Mantık: src/lib/englishChunkStudy.js. İlerleme aynı destede (orgs/{org}/english/deck): `chunks` { id: { st, box, due, kd } } ve `cdays` (üst üste gün). Kur'da hepsi ilk denemede doğruysa 1, 2, 4, 7, 14 gün aralık, sonra öğrenildi; hata ya da İpucu varsa yarın yeniden. Sıra: tekrarı gelen, yeni, sonra diğer çalışılanlar.
- Ekran: src/features/words/ChunkStudy.jsx. Lacivert zeminde mor/camgöbeği ışık; kalıp bloğu camgöbeği, değişen parça pembe-turuncu. Adım çubuğu Dinle · Değiştir · Kur · Konuş. Bitince "Kalıp tamam" / "Az kaldı", sayılar (kalıp, ifade, üst üste gün) ve Bugün tekrar listesi; Konuş (WordTalk, kalıpla) ve Sıradaki kalıp.
- Sayfa (/english) varsayılan Kalıp; ⋯: Konular, Çalışıyorum, Öğrendiklerim, "Bu kalıbı zaten biliyorum" / "yeniden çalış", "Kelimelerim ve cümlelerim" (eski ekran; orada üstte Kalıp · Kelime · Cümle).
- Sesle: "kalıp çalış", "İngilizce kalıp çalışalım", "kalıplarla İngilizce çalış" → İngilizce sayfası (nav.js CHUNK_STUDY).
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: bloklara dokunma, sesli okuma, Kur akışı.
- İstenirse: daha çok kalıp, kendi kalıbını ekleme (yapay zeka hazırlar), iPhone widget'ında günün kalıbı.

## Tasarım

- İngilizce kalıplar: kalıp bloğu camgöbeği çerçeveli, boşluğa giren parça logonun pembe-turuncu (#ff3d77 → #ff9a4d) dolgulu bloğu; ana düğme aynı geçişli hap. Zemin fotoğrafsız, köşelerde mor ve camgöbeği ışık.
