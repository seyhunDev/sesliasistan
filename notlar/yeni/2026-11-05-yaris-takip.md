## Nerede kaldım

- Yarış detayı "Yarış takip" oldu (Seyhun 2026-11-05, örnek `yaris-detay-sade/yaris-takip-ornek.png` onaylı): sitesi bağlı yarışta ilk sekme **Takip** (eski Dokümanlar), yarış günü dışında sayfa onunla açılır; Özet'in adı Hazırlık.
- Takip (`src/features/athletes/RaceTrack.jsx`): Sonuçlar (bizim sporcuların sırası `ourPlaces` + sonuç belgeleri, geçici/kesin), Duyurular (renk listesi, final grupları, sporcu listesi, diğer), Talimatlar (talimat, ek talimat Vn, program). Görülmemiş "Yeni", sekmede "N yeni". Satıra dokununca PDF. Veri `watchSiteDocs` (B alanı); işleme, görüldü yazma, Geri al, Şimdi bak, İzlemeyi bırak SiteDocs'ta, "Tüm belgeler ve işlemler" altında. Bildirim (sunucu `notifyDocs`) zaten `?sec=site` açıyor.
- Başlıkta ana hesap için "Yayın" düğmesi (Seyhun "bir de yayın butonu koy").
- Telefonda denenmedi.

## Sıradaki işler

- Yarış günü ⋯ menüsünde Takip yok (RACE_SECS ortak); isterse eklenir.
