## Nerede kaldım
- Program güncellenmiyordu: sitedeki "EK YARIŞ KURALI NO3" adında "talimat" geçmediği için "Belge" (other) sayılıyor, hiç okunmuyordu. siteDocs KINDS amend artık "ek (yarış) kural"ı da kapsıyor ("Günlük Kural 42 Listesi" kapsamaz).
- Önceden "Belge" olarak alınmış bu tür belgeler arka planda bir kez (raceSite kaydında `fix` = FIX) eskiden yeniye ek talimat olarak işlenir (raceSiteTake.fixKinds).
- Program satırları anlamıyla eşleşiyor (siteDocs.itemKey: ilk start, son start, antrenör/kaptanlar toplantısı, ödül töreni): ek talimattaki "İlk start 12:00", talimattaki "Günün ilk start saati (Optimist Genel)" satırının yerine geçer, adı korunur. Yayın programında (raceLive plan.agenda) ek talimat günün bütün maddelerini silmiyor, yalnız aynı anlamdakini değiştiriyor.
- Son gelen belge için veri hazır (gösterimi Yarışlar çalışmasında): siteDocs.latestNews(docs, race, bugün), changedRows(belge.undo.notice.schedule, race.notice.schedule) ve "Okudum" = saveDocState(org, yarış, belge, { read: true, seen: true }).

## Sıradaki işler
- Gerçek belgeyle denenmedi; arka plan bir sonraki çalışmada (10 dk) eski belgeyi işler.
