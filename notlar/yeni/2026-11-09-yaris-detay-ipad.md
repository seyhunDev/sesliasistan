## Nerede kaldım

- Yarış detayı iPad için yeniden tasarlandı (örnek /mnt/project-files/yaris-tasarim/ipad-detay/*.png, Seyhun "Yap"). Telefonda değişiklik yok.
  - Arkada canlı yayının fotoğrafı (src/features/liveScreen/bgPhoto.js) bulanık ve hafif karartılmış, bütün ekranı kaplar.
  - Solda (lacivert üst saydam): geri ve ⋯ üstte, ortada büyük soluk yarış adı ve tarih satırı, altında Şimdi/Hava/Harita cam satırları, en altta Canlı ekran · Yayın.
  - Sağda koyu cam panel: sekmeler (Takip, Hazırlık, Sporcu, Evrak, Yolculuk) ve içi; renk değişkenleri panelin içinde koyu ve saydam.
  - Yatay iPad ve Mac: bu sayfada sol menü gizli, yalnız asistan düğmesi sağ altta; geri düğmesiyle çıkılır. Dik iPad: üstte kahraman, altında panel.
  - CSS: globals.css "YARIŞ DETAYI iPAD (rzi)"; main.rzi yalnız kayıtlı yarışta (yeni yarış formu eski görünümde).
- Sonuç yuvarlakları: BFD simsiyah, UFD beyaz (atılmışsa halka o renkte), diğer cezalar kırmızı (ResultCards.jsx, Seyhun 2026-11-09).
- Telefonda/iPad'de gerçek veriyle denenmedi.

## Sıradaki işler

- Seyhun iPad'de bakınca: panelin içindeki eski açık renkli parçalar (sarı/yeşil uyarı kutuları) koyu camda göze batıyorsa tek tek koyulaştır.

## Tasarım

- Yarış detayı iPad'de tam ekran: bulanık fotoğraf zemini + solda soluk büyük ad ve düğmeler + sağda koyu cam panel. Telefon yarış kart düzeninde kalır.

## Tasarım (telefon)

- (Tasarım) 2026-11-09 telefon ve dik iPad de aynı görünüm (bulanık fotoğraf + cam panel); Seyhun "üst taraf boş kalıyor" dedi: telefonda ve dik iPad'de üst sıkı (geri, ad, ⋯ tek satır, tarih altında, hemen altında Hava ve Canlı ekran · Yayın). Büyük soluk ad yalnız yatay iPad/Mac'te.
