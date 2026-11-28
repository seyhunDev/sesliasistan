## Nerede kaldım
- Yönet bas-konuş canlı parçaları artık sabit 2,5 sn'de değil, susmada kesilir (src/lib/pttCut.js, usePtt.js). Ses seviyesi 80 ms'de bir ölçülür: 0,65 sn susma = cümle sonu (parça en az 1,2 sn), susmadan konuşmada 9 sn'den sonra ilk 250 ms duraksamada, en geç 10,5 sn'de kesilir. Hiç konuşma olmayan parça 3 sn'de atılır. Bırakınca kalan parça her zaman gider. Seviye ölçülemeyen cihazda eski 2,5 sn.
- Kesik sebebi: her parça ayrı kaydedici, ikisi arasındaki küçük boşluk konuşmanın ortasına denk gelince kelime yeniyordu. Artık kesme sessizliğe denk gelir.
- Testler elle.mjs "Bas konuş: susmada kesme". Telefonda denenmedi; eşikler (VOICE_MIN 0,06, SIL_MS 650) denemede ayarlanabilir.

## Sıradaki işler
- "Görüldü"yü çalmaya göre (Ulaştı → Dinlendi) yapma önerisi cevap bekliyor.
