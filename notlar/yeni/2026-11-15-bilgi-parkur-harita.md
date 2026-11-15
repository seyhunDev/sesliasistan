## Nerede kaldım
- Bilgi ekranı (Seyhun onayladı "yap, her şeyi tamamla"): şematik parkur kalktı. Pusulanın altında rüzgâr göstergesi (WindDial: halkanın üstü teknenin burnu, ok rüzgârın geldiği yer, "27° iskeleden"), altında sade parkur haritası (features/bilgi/CourseMap.jsx: ızgara + ölçek, şamandıralar, start hattı, tekne yönüyle, son 10 dk iz). Parkur varsa rüzgâr yukarıda, yoksa kuzey yukarı ve yalnız tekne.
- Otomatik parkur: bilgi/ekran.parkur { type trapez|ust|ucgen, wind, komite {lat,lon}, line (m), orsa (m), marks (elle düzeltmeler) }; lib/bilgi buildCourse (raceCourse dest ile; Yayın/yarış sistemine dokunmaz). Yönet › Parkur: tip, rüzgâr, hakem botu (Konumum / elle), start hattı, 1 numaraya uzaklık, önizleme haritası (kanaldaki tekneler), şamandıra satırına dokunup koordinat / Konumum / Otomatik.
- Yönet › Tekneler haritasında (MapLibre) parkur şamandıraları da görünür.
- "Start sonrası ekranda": Pusula, Rüzgâr, Harita, Süre, Saat (varsayılan hepsi açık).
- Pusula sayısı üstten kesiliyordu: satır yüksekliği 1, üst boşluk safe-area + 2.25rem; yatayda solda pusula/rüzgâr/süre, sağda harita.
- Sesle: "bilgi parkuru rüzgâr 220", "bilgi parkuru hakem botu burada", "bilgi parkuru trapez", "bilgi parkuru 1 numara 800 metre".

## Sıradaki işler
- Denizde dene; parkur oranları (apaz açısı, alt kapı yeri) gerekirse ayarlanır. Rüzgâr şimdilik elle; ölçüm cihazı gelince otomatik.
