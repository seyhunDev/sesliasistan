## Nerede kaldım

- Bildirim testi (Seyhun: "ana hesap, çalışanlar, sporcular, aile, bu bildirim sisteminin bir testini çıkar, normal insan davranışlarına göre; adı bildirim testi, GitHub'a koy, ara sıra çalıştıracağız"): yeni komut `npm run test:bildirim` (72 test). Gerçek sunucu kodu (`/api/notify`, pushSend, bildirim kutusu, 5 dakikalık zamanlayıcı plan-reminders.mjs) sahte Firestore ve sahte telefonlarla çalışır (`scripts/asistan-test/taklit-sunucu.mjs`, hooks.mjs firebase-admin / web-push / next/server yerine onu verir). Hiçbir yere bağlanmaz, gerçek veriye dokunmaz, kimseye bildirim gitmez; ortam değerleri sahte.
- Hesaplar: Seyhun (ana hesap), Ali (çalışan), Mete (sporcu, Android), Ayşe (veli), Eda (aile), Kaan (telefonu kayıtlı değil), Seyhun'un telefonunu kullanan deneme hesabı, uygulamada hesabı olmayan kişi.
- Senaryolar (dosya `scripts/asistan-test/yerel/bildirim.mjs`): görev/plan/not verme (iletildi, ikinci kez gitmez, yetkisiz istek 403); kişinin eklediği kayıt ana hesaba; gitmeyen bildirim ve nedeni (hesap yok, telefon yok, aynı telefon, uygulama silinmiş, yanlış anahtar, Yeniden gönder); mesajlar (birebir, Sporcular/Ekip/Aile grupları, sessize alma, sohbet açıkken, eski mesaj); değişiklik, iptal, tamamlama, silme (silmede bildirim yok); sporcu ve veli (gelmedi haberi, aidat hatırlatması, fitness programı, yoklama alındı); fiş (yeni, ödendi); zil ve simge sayısı (aynı sohbet tek satır, görüldü, en çok 30); plan hatırlatmaları (1 saat önce, çalışan yalnız kendi planı, iptal, plana özel "Hatırlat", gitmedi nedeni, sporcunun fitness'ı, iki kez gitmeme).
- Test bozuk koda karşı denendi (zil sınırı ve "aynı telefon" kuralı bozulunca kırmızı oldu). Uygulama kodunda hata bulunmadı, değişmedi.
- GitHub'daki "Testler" iş akışı (`test:hepsi`) bunu da çalıştırır; sonuç `test-sonuclari` dalında `son.txt`.

## Sıradaki işler

- Ara sıra Mac'te `npm run test:bildirim` çalıştır ya da GitHub › Actions › Testler sonucuna bak.
- Testin kapsamadığı: telefona gerçek teslim (Apple/Google), canlı Netlify zamanlayıcısı, Firestore kuralları, uygulama içi ekranlar. Bunlar için telefonda Ayarlar › Bildirimler › Dene.
- Yeni bir bildirim eklenince senaryosu `yerel/bildirim.mjs`'e eklenir.
