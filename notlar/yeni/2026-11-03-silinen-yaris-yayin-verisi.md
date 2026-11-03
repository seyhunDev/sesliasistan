## Nerede kaldım

- Seyhun 2026-11-03 15:40: deneme yarışını sildi ama /canli/<id> linki "deneme şampiyonası · yarış günü" göstermeye devam etti.
  - Sebep 1: canlı sayfa son veriyi tarayıcıda (sessionStorage `lv-data:<id>`) tutuyordu; sunucu "yok" (404) deyince de eski kopyayı göstermeye devam ediyordu. Artık 404'te kopya silinir, "Bu yarış kaldırıldı" çıkar ve /canli'ye geçer.
  - Sebep 2: silmede yalnız istemci tarafı temizlik vardı (raceWipe → dropLive); tekne takibi (takip/{yarış} + tekne konumları) ve ziyaret sayıları hiç silinmiyordu, istemci adımı yarıda kalırsa canlı kayıt da kalıyordu.
- /api/canli DELETE { race }: yarış belgesi yoksa sunucu (yönetici anahtarıyla) her şeyi siler: orgs/{org}/raceLive/{yarış} ve alt belgeleri (sheets, course, entries), Storage orgs/{org}/raceMedia/{id} ve küçük resmi, takip/{yarış} ve tekne konumları, canliEkran/{yarış}, Netlify Blobs "canli-iz" ziyaret kayıtları. Yarış duruyorsa yalnız ekran işareti kalkar.
- /api/canli DELETE { sweep: true }: yarış belgesi olmayan yetim yayın kayıtlarını bulur ve siler (ant- antrenman kayıtları ve ortak yarışlar hariç). Yarışlar sayfası açılınca oturumda bir kez kendiliğinden çalışır (raceWipe.js sweepLive). Firestore kuralı değişmedi.

## Sıradaki işler

- Yarışın kendisinde kalanlar (silmede zaten gidiyordu): yarış belgesi, evrak dosyaları, planlar, ortak yarış kaydı.
- Telefonda denenmedi; Seyhun Yarışlar sayfasını bir kez açınca eski deneme yarışının yayın verisi silinir.
