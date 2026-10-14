## Nerede kaldım

- Yarış evrakında İrtibat Telefonu artık velinin numarası (Seyhun: "irtibat numarasına veli iletişim numarası yazılacak, sporcunun değil"; telefonda denenmedi): sporcunun kendi telefonu kullanılmaz, veli telefonu yoksa evrak hazırlanırken sorulur (`athleteInfo`, raceDocs.js).
- Tek sporcunun evrakını gönderme (Seyhun: "ek evraklarından bir tanesini seçip WhatsApp'la göndermek istiyorum"; telefonda denenmedi): Evrak › Hazır evrak'ta Veli İzin Belgesi ve Kulüp izin yazısına dokununca sporcular listelenir; her sporcunun satırında aç ve paylaş (paylaşım menüsünden WhatsApp seçilir). EK-2 herkes için tek liste olduğu için bölünmez. Sayfalar hazırlanırken ayrılır (`splitPages`, raceDocs.js; `partFiles`, RaceEditor.jsx). Önceden hazırlanmış evrakta liste için bir kez "Yenile". Testi `test:yaris` › "sporcu başına sayfa".

## Sıradaki işler

- Bir yarışta Evrak › Yenile, sonra Veli İzin Belgesi'ne dokun, bir sporcunun paylaş düğmesiyle WhatsApp'a gönder; İrtibat Telefonu velinin numarası mı bak.
