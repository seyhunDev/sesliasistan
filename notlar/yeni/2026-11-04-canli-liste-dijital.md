## Nerede kaldım
- /canli genel sayfa baştan (Seyhun 2026-11-04 "2026 dijital dünyasına uygun, Velora logomuz, altta soft kayan logolar"; ayrı başlık "Yenile canlı yarışlar sekmesi tasarımı"). Kod: `src/features/liveScreen/LiveHome.jsx`, CSS ayrı dosya `liveHome.css` (sınıflar `.lh-*`; eski `.lv-hm` / `.lv-hero` / `.lv-hrow` blokları liveScreen.css'ten silindi).
- Üstte Velora V + "Velora | Canlı yayın", sağda durum hapı "N yarış canlı" (kırmızı yayılan nokta) ya da "Şu an canlı yarış yok".
- "Şu an canlı": süren yarışların HEPSİ büyük kartta (geniş ekranda 2 sütun), kırmızı "Canlı" rozeti, kartın üst kenarında akan kırmızı çizgi, beyaz "Canlı izle". Canlı yoksa "Sıradaki yayın" tek kart, mavi "Aç". Altında Yaklaşan / Biten (Biten satırında "Bitti").
- Zemin: Velora laciverti, çok bulanık yarış fotoğrafı, yavaş süzülen iki mavi ışık, ince ızgara. Kartlar buzlu cam.
- Alt logo şeridi (sabit, yavaş kayar, kenarlarda kaybolur, tek renk soluk): liste `src/features/liveScreen/logolar.js` (şimdilik Velora + Dikili Yelken Spor Kulübü). Sponsor eklemek: dosya `public/canli/logolar/`, satır logolar.js'e; gerçek marka yalnız izinle.
- Yarış ekranı yükleniyor (LiveScreen.jsx LoadSkel): ortada V daire + dönen ince mavi halka, yarışın adı, "Yayına bağlanılıyor" (`.lv-lbrand`); sağ alttaki `.lv-lname` kalktı.

## Sıradaki işler
- Telefonda denenmedi. Seyhun'un sponsor/partner logoları gelirse şeride eklenecek.
