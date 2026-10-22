## Nerede kaldım
- Ana hesap Ayarlar sadeleşti (Seyhun: "gereksizleri kaldıralım ama arşivlenenler olarak tut, tamamen silme"; telefonda denenmedi). Bölümler: Genel · Bildirimler · Ses ve asistan · Veri ve cihaz · Testler · Hesap. "Diğer" altındaki Bağlantılar ve Veri pencereleri kalktı, satırlar tek sayfada. En altta "Arşivlenenler" penceresi: Banka defteri kartı, Öğrenme, Aramalar, Telefondaki veriyi Firebase'e taşı, Eski mail eklerini sil, Kişiler. Hiçbiri silinmedi; Seyhun gerekirse tek tek kaldıracak.
- Yeni "Enerji kullanımı" (Veri ve cihaz): "2 dakika ölç" ile uygulama kullanılırken işlemci yükü (zamanlayıcı gecikmesi + uzun görevler), ekranı sürekli çizen animasyon süresi, internet (istek sayısı ve MB) ölçülür. Pil yalnız Android Chrome'da, bellek yalnız Chrome'da. Sonuç cihazda saklanır, Kopyala ile paylaşılır. Ölçüm sayfa değişince sürer, uygulama yeniden yüklenirse kesilir. Dosyalar `src/lib/energyMeter.js`, `src/features/settings/Energy.jsx`.
- Ölçüm sonucu (bilgisayarda, 390 px Chrome): normal sayfalar boşta işlemcinin %1-2'si; alt çubuktaki asistan düğmesinin ses çubukları (globals.css `vlidle`) hiç durmadan oynuyor, ekran sürekli yeniden çiziliyor. Asistan ekranı açıkken %13 işlemci ve saniyede 60 yerleşim hesabı; dev renk bulutları (`.abg`) grafik işlemciyi sürekli çalıştırıyor. Rapor /mnt/project-files/ayarlar-sade/arsiv/enerji-olcumu.md. İyileştirme asistan motoru thread'ine iletildi.

## Sıradaki işler
0. Telefonda: Ayarlar › Veri ve cihaz › Enerji kullanımı › 2 dakika ölç, uygulamayı kullan, sonucu oku. iPhone'da gerçek pil payı Ayarlar › Pil'de.
1. Asistan düğmesindeki boşta ses çubuğu animasyonu durdurulsun; asistan ekranındaki her karede yerleşim hesabı bulunsun.

## Tasarım
- Ayarlar'da seyrek ya da bir kez kullanılan satırlar silinmez, en alttaki "Arşivlenenler" penceresine taşınır.
