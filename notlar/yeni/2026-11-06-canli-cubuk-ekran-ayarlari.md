## Nerede kaldım
- Canlı alt çubuk yeni görünüm (Seyhun 2026-11-06 "butonları düzelt"): simge + kısa ad (Parkur, Sıralama, Program, Video), Start mavi, sonda yuvarlak Ayarlar çarkı; Gizle/Düğmeler yazıları yerine yuvarlak ok (˅ gizle, ˄ göster). Kod `LiveScreen.jsx` `BAR_ICON`, stil `sahne.css` sonu.
- Ayarlar çarkı beyaz tam sayfa "Ekran ayarları" açar (örnek canli-tv/ekran-ayarlari onaylandı): solda evreler (ne açık, ŞİMDİ), sağda anahtarlar (Rüzgâr, Parkur, Program, Genel sıralama, Sıradaki yarış), Her biri sn, Sol alt liste, Görüntü, Bu evreyi kapat. Kayıt eskisi gibi `putEv` (yarış `courseShow.ev` + bütün yarışlar `yayinEkran/ev`). Kod `LiveMasa.jsx` (`addCat.ayar`), `ekranAyar.css`; LiveScreen `masaAt(t, ayar)`, `.sc-vp.masa.ayar`.

## Sıradaki işler
- Ekran ayarları gerçek hesapla denenmedi (örnek sayfada yayın masası yok); telefonda ve iPad'de denenmedi.
