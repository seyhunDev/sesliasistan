## Nerede kaldım

- Mesajlar (Seyhun, 2026-10-19): ana hesap için sohbet arşivleme, herkes için kalıcı silme ve "Mesajları sıfırla" eklendi. Telefonda denenmedi.
  - Sohbet › üstteki ad › bilgi: "Arşivle" / "Arşivden çıkar" (yalnız ana hesabın listesinden kalkar, mesajlar yerinde; sabit gruplar Ekip/Aile/Sporcular arşivlenmez) ve "Herkes için sil" (onay sorar; mesajlar ve ekleri kalıcı silinir).
  - Mesajlar listesinin altında "Arşiv · N" (dokununca açılır) ve ana hesapta "Mesajları sıfırla": önce kaç sohbet ve mesaj silineceğini söyleyip onay ister, sonra tüm sohbetleri, mesajları ve ekleri herkes için siler.
  - Silme ve sıfırlama sunucuda: `api/chat-admin` (yalnız ana hesap; count / delete / reset; Storage `orgs/{org}/chatFiles/` de temizlenir). Arşiv sohbet belgesinde `archived.{uid}`; arşivdeki sohbetler okunmamış sayısına katılmaz.
  - Sesle (ana hesap): "Ali ile konuşmayı arşivle", "Ekip sohbetini arşivden çıkar", "bu sohbeti arşivle" hemen yapılır; "Ali'yle sohbeti herkes için sil" onay sorar (assistantLocal `chatOpAsk`, assistRoute `chatOp`, yonlendirme, isler/mesaj `chatDel`). Sıfırlama sesle yok (yalnız düğme).
  - firestore.rules: sohbet güncellemesinde `archived` alanı (yalnız kendi anahtarı). Konsoldan yayınlanmalı.

## Sıradaki işler

- Seyhun firestore.rules'u yayınlasın (yayınlanmadan Arşivle "Yapılamadı" der). Silme ve sıfırlama kural beklemez.
- Telefonda denensin: bir sohbeti arşivle, listenin altındaki Arşiv'den aç, geri çıkar; bir deneme sohbetini herkes için sil; sonra istenirse Mesajları sıfırla.
