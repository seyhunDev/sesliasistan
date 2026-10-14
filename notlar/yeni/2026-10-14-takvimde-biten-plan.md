## Nerede kaldım

- Takvimde biten plan görünüyordu (Seyhun: "takvim sayfasında tamamlanmış, bitmiş plan gösteriliyor"; telefonda denenmedi): "Bitti" denen plan artık Takvim'de ve günün noktasında görünmez, sabah/akşam özetine de girmez; Arşiv › Planlar'da durur (`dayItems`, agenda.js ve summary.js). İptal edilen plan eskisi gibi üstü çizili görünür. Testi `test:elle` › "takvim: biten plan görünmez".
- Ana sayfadaki Sırada listesinde ve gün penceresinde saatsiz plan "Tüm gün" yazar (önceden "—" / "Gün"; SiradaCard.jsx, HomeSummary.jsx).

## Sıradaki işler

- Takvimi aç: bitirdiğin plan görünmemeli. Başka yanlış görünen plan varsa adını yaz.
