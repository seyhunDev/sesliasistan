## Nerede kaldım

- Elle yapılan işler asistanla da (Seyhun: "Manuel yapılan herşey asistan ile de yapılmalı"; telefonda denenmedi). Sayfa sayfa elle yapılan işler çıkarıldı, eksikler eklendi. Yerelde (yapay zekaya gitmeden; `src/lib/assistMore.js`, AssistantSheet `runExtra`/`runMore`):
  - Fiş: "F-0012 fişini ödendi yap", "Ali'nin fişlerini ödedim", "F-3 fişi ödenmedi" (yalnız ana hesap; ekleyene bildirim gider).
  - Yoklama: "gelmeyenlerin velilerine haber ver" (bugün, "dün" denirse dün; onayla, uygulamadaki velilere bildirim).
  - Alışveriş: "alınanları temizle".
  - Doğum günü: "Ayşe'nin doğum gününü sil" (onayla).
  - Kişi: "Ayşe Yılmaz'ı kişilerden sil" (onayla; yalnız hesabı olmayan kişi, hesabı olan için Kişiler sayfası).
  - Mesaj grubu: "Ali ve Ayşe ile Yelken Ekibi adında grup kur" (grup açılır).
  - Açık yarışta: "Ali 3. oldu", "Zeynep ikinci oldu", "24 tekne yarıştı", "Ali'yi yarıştan çıkar", "Ayşe ödedi / ödemedi" (bütçe), "yarışı planlara ekle", "yarışı sil" (onayla); "otel ekle: Foça Palas, 0232 …".
  - "Ali Kaya'nın sporcu kartını aç"; fatura "Turkcell faturasını Ali'ye ver" (görev + bildirim), "Turkcell faturasını sil" (onayla).
  - Gönderi ekranında "gönderiyi sil" (onay sorar).
- Yapay zekanın görev listesine yeni işlemler (lib/ai/assistant.js, steps.js): iptali geri alma ("antrenman iptalini geri al"), notu sabitleme/kaldırma, kaydı başka kişiye verme ("motor yağı görevini Gökhan'a ver", `patch.assignTo`), tekrarlayan planın bu ve sonrakilerini silme (onayla), çalışanın silme isteğini onaylama (onayla) ya da reddetme. Veri özetinde tekrarlı plan, sabit not ve silme isteği görünür.
- Testleri `test:asistan` › "Elle yapılanlar asistanla", "Yönlendirme: …" (yeni yollar). Kural değişikliği yok.

## Sıradaki işler

- Asistanla dene: Fişler'de çalışanın bir fişi için "F-… fişini ödendi yap"; yoklamada birini gelmedi yap, "gelmeyenlerin velilerine haber ver"; bir yarış sayfasında "Ali 3. oldu", "Ali ödedi"; "Ali ve Ayşe ile Deneme adında grup kur". Yanlış giden cümleyi yeni threade ver.
- Hâlâ asistanla yapılamayanlar (elle): dosya/fotoğraf yükleme (fatura, envanter belgesi, talimat; asistan yalnız sayfayı açar), etkinlik ihtiyaç listesi ve işleri, sporcu kartındaki alanları düzenleme (sınıf, veli, belge tarihleri), fiş Excel'ini mail atma, yarış evrakını hazırlama/mailleme, ders silme. İstenirse sırayla eklenir.

## Asistan

- Elle yapılan her iş asistanla da yapılabilmeli (Seyhun'un kuralı, 2026-10-09). Yeni elle özellik eklenince asistan işi de eklenir (`assistMore.js` + `assistTasks.js` + yönlendirme testi); geri alınamayanlar onay sorar.
