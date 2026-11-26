## Nerede kaldım

- İngilizce açılışı bölüm seçimi oldu (örnek /mnt/project-files/ingilizce-hatirla/acilis.html onaylandı): "Bugün ne çalışalım?", sarı "Kaldığın yer" kartı (son açılan kalıp, bu cihazda `sa-en-son`), altında bölümler ve ilerlemeleri; hepsi çalışıldıysa yeşil "Tamamlandı" + "Baştan çalış". Kod `src/features/words/EnHome.jsx` (EnHome, PathPage).
- Bölümler `src/lib/englishPaths.js` PATHS: Kalıplar (eski kalıplar), Önemli fiiller (12 fiil × 5 günlük anlam: get, make, take, have, go, come, put, keep, give, look, turn, run), Günlük durumlar (8 durum × 5 kalıp; Konuş adımında yapay zeka o yerdeki kişiyi oynar, `roleOf` → /api/word `role`). Hepsi aynı kalıp biçiminde, aynı 5 adımla (ChunkStudy) öğretilir; ilerleme aynı `chunks` alanında.
- Bölüm sayfası: ilerleme, gruplar (fiil satırı anlamlar + noktalar, durum kutuları, kalıp konuları), altta "Başla/Devam et". Çalışmada geri bölüm sayfasına döner, ⋯ bölümün grupları.
- iPad'de açılış üç sütun, bölüm sayfası iki sütun (max 64rem). Telefonda denenmedi.

## Sıradaki işler

- Yeni bölüm eklemek: englishPaths.js PATHS'e bir öğe (id, name, big, desc, unit, color, topics, chunks); açılışta kendiliğinden görünür.
- Fiil ve durum kalıplarının resimleri yok (resim yalnız Kalıplar'da).
- Dinle/Değiştir/Kur adımlarını Altyazı görünümüne taşımak (sorulacak).
