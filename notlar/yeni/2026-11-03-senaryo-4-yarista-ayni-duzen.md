# Canlı ekran: yarışta aynı düzen, eksen tahmini, panel süreleri (2026-11-03)

## Nerede kaldım

- Seyhun: "gün boyunca rüzgâr tablosunda yazılar birbirine girmiş" → dönen paneldeki genel `b/span/small` kuralları tabloya da sızıyordu; seçiciler `.lv-oneb > …` olarak daraltıldı.
- "Parkur animasyonu tamamlanmadan geçiyor" → her panelin kendi süresi (`panelMs`): parkur = sahne animasyonu (`SCENE_T` 12 sn) + 2 sn, saatlik tablo ve sıralama 10 sn, diğerleri 8 sn.
- "Eksen yoksa ölçülmedi yerine tahmin" → `axisText`: ölçüm yoksa start saatindeki tahmin rüzgârının yönü "… · tahmin"; varsayılan parkur kartı da eksen olarak bu yönü alır (o da yoksa 0°). Rüzgârda zaten "Start'ta tahmin".
- "Geri sayım bittiğinde ekran çok farklı olmasın" → yarış sürerken (`racing`) de StartHero / NearBand: sayaç "Start'tan beri" ileri sayar, yarış adı · grup · start saati; sağda dönen panel: Sıralama (ilk dönüş yazıldıysa, cam kart `RankPanel`) → Parkur (yarışın rotası) → Rüzgâr → Gün boyunca → Sıradaki. Start hattı ve 5·4·1·0 çubuğu yarışta yok. Sol sıralama paneli, genel sıralama yan paneli, program çipleri ve alt şerit yarışta da yok; tekne haritası kalır. Sağ üstte "Canlı" rozeti (gün/yer yazılmaz).
- Ekran görüntüleri: yayin-tasarim/senaryo/4-videosuz-siralama.png, 4-videosuz-parkur.png, 4-videolu-siralama.png.
- Test yaris.mjs: "canlı ekran senaryo 4".

## Sıradaki işler

- Senaryo 5 startlar arası / abandone, 6 gün bitti, 7 yarıştan önceki günler.
- Telefonda "Canlı" rozeti üstteki yarış adıyla çakışıyor (eski), bakılacak.
- Örnek G (parkur sahnesi sade) onay bekliyor.
- Telefonda denenmedi.
