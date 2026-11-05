## Nerede kaldım
- /canli temizliği: geçmiş yarış (`?y=`) artık yeni sahnelerle (Sahne `past`): canlı rozeti yok, "Yarış sonucu" sıralaması (sc 03). Eski düzen (WaitHero, SidePanel, SeqHero, StartHero, NearBand, DayEnd, WindBody, gr-* vb.) LiveScreen.jsx'ten kalktı.
- Kullanılmayan stiller liveScreen.css ve sahne.css'ten silindi (JS'te kullanılmayan sınıflar, boş @media, kullanılmayan keyframes).
- test:yaris: yalnız eski düzeni denetleyen 31 test silindi, 5 testten eski düzene ait denetimler çıkarıldı; önceki kırmızılar dışında yeni kırmızı yok.
- Telefonda denenmedi.

## Sıradaki işler
- Yatay ekranda/iPad'de alt çubuk yok (yalnız dikey).
- /canli'de finiş penceresi geri sayımı.
- `?tani=1` kaldırılabilir.
