## Nerede kaldım
- Sporcu hesabı açma sadeleşti (thread "Sadeleştir sporcu hesabı ekleme sistemi"). "Kişi bulunamadı" nedeni: telefon kişi kaydını yazıp sunucu onu 8 sn içinde göremeyince 404; artık `/api/staff` POST kişi kaydını kendisi kurar.
- Çift hesap nedeni: Kişiler'den açılan hesap kulüp sporcusuna bağlı değildi; artık `athleteId` ile ya da aynı adla var olan hesap bulunur, yeni hesap açılmaz (tek sporcuda yeni şifre verilir).
- "Sporcu bulunamadı": kulüpte olmayan sporcuya bağlı Kişiler kaydı; Sporcular listesi açılınca `repairLinks` aynı adla yeniden bağlar ya da bağı kaldırır.
- Ortak sonuç ekranı `LoginResult`: Adres, Kullanıcı adı, Şifre + Kopyala, Hepsini kopyala, WhatsApp.
- Ayarlar › Hesap › "Hesapları temizle": liste + onay; ana hesap dışındaki tüm Velora girişleri (sporcu, veli, çalışan, aile, profilsiz kullanıcı adı hesapları) silinir; kurye/restoran ve başka ana hesaplar kalır. Kişiler kayıtları hesapsız kalır.
- Firestore kuralı değişmedi. Telefonda denenmedi.

## Sıradaki işler
- Seyhun Ayarlar'dan temizliği yapınca sporcu hesaplarını yeniden açıp telefonda denemek.

## Asistan
- Hesap temizliği yalnız Ayarlar'da, sesle yok (geri alınamaz toplu silme).
