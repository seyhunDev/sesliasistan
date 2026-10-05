## Nerede kaldım

- Kürenin büyüyüp küçülme animasyonu düzeltildi (Seyhun: "asistan küresinin büyüyüp küçülme animasyonu yok, arka planla birlikte çalışmalı"; telefonda denenmedi): PR #125'te küreye verilen Tailwind geçiş sınıfı (`transition-[width,height]`) globals.css'teki katmansız `.vlight` kuralının `transition` satırı tarafından eziliyordu; küre boyu hiç geçişsiz, bir anda değişiyordu. Genişlik ve yükseklik geçişi artık `.vlight` kuralının içinde (0,5 sn, kubbeyle aynı eğri). Tarayıcıda ölçüldü: 48 → 78 px geçişin 150. ms'sinde 72 px. Not: globals.css'teki katmansız kurallar Tailwind sınıflarını ezer; aynı öğeye geçiş eklenirken kurala yazılmalı.

## Sıradaki işler

- Yayından sonra uygulamayı kapatıp aç (eski sürüm önbellekte kalmasın), ana sayfada aşağı-yukarı kaydır: küre yeşil alanla birlikte yavaşça küçülüp büyümeli.
