## Nerede kaldım

- Asistan yerleşimi yenilendi (Seyhun: "asistan kullanılmadığında çok mu büyük duruyor?", "diğer bütün sayfalarda asistan sağ altta olsun; ana sayfadaki asistanı aşağı indir, butonların ikisi sola ikisi sağa; aşağı kaydırınca daha da küçülsün"; telefonda denenmedi):
  - Kubbe artık yalnız dört ana sekmede (Ana sayfa, Takvim, Mesajlar, Görevler; `TABS`, TabBar.jsx) ve tek satır: Ana sayfa · Takvim · küre · Mesajlar · Görevler. Boştaki yükseklik ~160 px → ~106 px. Klavye ve + düğmeleri boştaki çubuktan kalktı: yazmak için küreye basılı tut (eskisi gibi); Oluştur (+) ve klavye asistan açılınca solda görünür, + dokununca konuşma kapanıp Oluştur menüsü açılır.
  - Aşağı kaydırınca kubbe daha da küçülür (~76 px: küre 48 px, sekmelerde yalnız simge); yukarı kaydırınca, sayfanın başına dönünce ya da kubbenin boş yerine dokununca eski hâline döner (`mini`, `small`, Dome). Sayfanın alt boşluğu (`--stage-h`) büyük boyda kalır, içerik zıplamaz.
  - Diğer bütün sayfalarda (Planlar, Notlar, Fişler, Envanter, yarış, gönderi, Ayarlar…) asistan sağ altta küçük küre: kubbedeki kürenin aynısı (yeşil çerçeveli beyaz küre, dokun konuş, basılı tut yaz); dokununca kubbe alttan yükselir, o sayfanın ipucu ve örnekleriyle (`data-fab`, TabBar). Eski sağ alttaki koyu düğme (`AssistantFab`) silindi; görünüşü farklı olduğu için başka asistan sanılıyordu, aslında aynı asistanı açıyordu. Sayfanın alt düğme çubuğu varsa (yarış evrakı, Sporcular, Kişiler, Çalışanlar) küre onun üstüne çıkar (globals.css). Sohbet ekranında yok.

## Sıradaki işler

- Yeni yerleşimi telefonda dene: ana sayfada tek satır (iki sekme · küre · iki sekme) düzgün mü, aşağı kaydırınca küçülüyor mu, küreye basılı tutunca yazma açılıyor mu, asistan açıkken + ile Oluştur. Planlar, Notlar, bir yarış ve Ayarlar'da sağ alttaki küre; yarışta "Belgeleri hazırla" çubuğunun üstünde mi. Çok erken/geç küçülüyorsa yeni threade yaz (eşikler 24/16 px).

## Tasarım

- Kubbe yalnız dört ana sekmede, tek satır: iki sekme · küre · iki sekme; boşta klavye ve + yok (yazma: basılı tut; Oluştur: asistan açılınca). Aşağı kaydırınca küçülür. Diğer sayfalarda asistan sağ altta aynı küre (Seyhun'un seçimi, 2026-10-05).
