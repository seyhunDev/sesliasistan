## Nerede kaldım

- #1399'un devamı: lacivert sayfalardaki kendi yazılmış düğmeler ortak düğmeye geçti (34 dosya). Lacivert üstteki "+ Not / + Yarış / + Sporcu / Yeni / Düzenle" (AddButton, ck-btn, raised act-main) = `btn btn-primary btn-sm`; ikincil (Yoklama, Yarışlar, Raporlar, Excel, Bugün, Konumum, Yer, Banka eşleştir…) = `btn btn-secondary`; ana sayfa yemek/market kartı (Takip, Yeni sipariş, Yardım), Başla, Yayın'a git, WhatsApp gönder, Deniz trafiği (Teknem, Acil), kokpit iş düğmeleri (ActionGrid), hava gün düğmeleri (DayNav), takvim Bugün.
- `.food-card` de lacivert seçicisine eklendi. Artık kullanılmayan CSS silindi: ck-btn, ck-btn2, ck-pbtn, ck-pill, ck-ibtn, food-btn, food-btn2.
- Ekran görüntüleriyle bakıldı (telefon: ana, notlar, sporcular, yarışlar, planlar, deniz, kameralar, aidat, testler, yemek, takvim).

## Sıradaki işler

- Lacivertte ana düğme rengi kararı Seyhun'da (mavi önerildi, şimdilik mavi). Beyaz seçilirse yalnız globals.css'teki `:is(.ck, .navy, .lvd, .food-card) .btn-primary` satırı değişir.
- Ortak düğmede olmayanlar (kendi sahipleri var): yarış detayı/canlı ekran kendi renkleri (main.rz: Canlı ekran beyaz, ana düğme açık mavi), fotoğraf/video görüntüleyici (MediaViewer, iPhone Fotoğraflar görünümü), Yayın sayfası. Seçim çipleri, sekmeler, gün kutuları bilerek olduğu gibi.
- Telefonda deneme.
