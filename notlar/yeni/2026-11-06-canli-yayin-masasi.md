## Nerede kaldım

- Ekran tek yerden: uygulama içi canlı ekran (Seyhun 2026-11-06, örnek `canli-tv/yayin-masasi/ornek.png` onaylandı). Yayın › Ekran sekmesindekiler canlı ekranda **Yayın masası**nda (`src/features/liveScreen/LiveMasa.jsx`, LiveStart çizer; yalnız ana hesap, uygulama içinde).
- Yayın modunda "Yayında: … ˄" masayı açar; dört sekme: Şimdi (evre Otomatik/elle, ekranda tut, sol alt, canlıdaki grup, Duraklat, Linki paylaş), Evreler (görüntü, gösterilecekler sırası Yukarı/Çıkar/+, her biri sn, sol alt, Varsayılana dön, Bu evreye geç), Kaynaklar (kutular Yayında / Yayın yok / Bağlantı yok, dokununca yayına ver, ad, bağlantı, çektiği grup, YouTube anahtarı SrcKey, sil, + Kaynak MyChannel ile; Canlı konum, Kayıtlar, Ekrandan kaldır), Yazı (ekranda yazı, ekrandaki ad).
- Kayıtlar Yayın sayfasıyla aynı (saveEvre, saveEvreMan, savePin, saveOnAir, saveCamBy, setStream, showOnScreen, savePlanKeys title/sub, saveShowTpl). Masa açıkken kaynakların yayında olup olmadığına 45 sn'de bir bakar, srcLive yazar.
- Benim modunda seçilen kaynak / konum yayındakinden farklıysa kırmızı **Yayına ver** (LiveStart `give`), verilince kendi seçimin "Yayınla aynı"ya döner.
- Alt çubuğa **Program** düğmesi (günün startları: biten soluk, yarışta mavi, sıradaki sarı).
- iPad yatayda masa ve kaynak seçici sağdan açılır, düğmeler sola kayar. Telefonda denenmedi; masa yerelde örnek veriyle görüldü (giriş gerektiği için gerçek kayıtla değil).

## Sıradaki işler

- Yayın konuşması Yayın › Ekran sekmesini kaldıracak (haber verildi).
- Masada henüz yok: Yayın sayfasındaki önizleme oynatıcısı, Tekneler yakınlık (Start · Yakın · Orta · Parkur), "Nasıl bağlanır", yakındaki kameralar (NearCams), kayıt yükleme. Gerekirse eklenir.
