## Nerede kaldım

- Yayın › Ekran (Video) › Canlı kaynaklar: kaynağa dokununca altta adı düzenlenir (stream.sources[].name, en çok 30 harf; örn. "Drone 1 · Sarı") ve çektiği grup çiplerle seçilir. Bağlama Süre › Kameralar ile aynı (raceLive.camBy); başka kaynaktaki grup seçilince buraya geçer, yeniden dokununca çözülür.
- Canlı konum ayrı bölüm: renk listesi (günün grupları) varsa her grup için "Sarı grup tekneler", "Mavi grup tekneler" … döşemesi (kaç tekne yazar); yoksa eskisi gibi tek "Tekneler" (ekrandaki yarışın grubu). screen.grp ve evre görüntüsünde grp saklanır (raceRounds boatsOf); Ekran › evre › Görüntü listesinde de grup grup.
- Tekneler renk listesinden (lib/boatPlay fleetOf + realSet): grubun gerçek yelken numaraları örnek setin izlerini sırayla alır, 10'dan çoksa sonrakiler 9 m geride. Gerçek konum gelince realSet kalkar.
- /canli: canlı konumda bir grup ekrandayken sol altta o grubun tekneleri + genel sıralamadaki yerleri (ScGroup, "Grup ve sıra"), evrede Yok seçili olsa da; Canlı yanındaki grup etiketi o grup. Ortada genel sıralama ya da parkur varken yine gizli.
- Telefonda denenmedi.

## Sıradaki işler

- Gerçek takip verisi (takip/{yarış}/tekne) gelince realSet yerine canlı akış.
