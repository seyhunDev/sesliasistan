## Nerede kaldım
- Seyhun #897 sonrası "Pusula çalışmıyor, telefondaki gibi çalışması lazım". iPhone uygulamasına yerel pusula eklendi: `VeloraPlugin.swift` `Pusula` (compassStart / compassStop, "compass" olayı { mag, true, acc }). Yön CMDeviceMotion yerçekimi + manyetik alandan (telefonun kendi eksenlerinde): arka kameranın baktığı yön, düzken üst kenar; gerçek kuzey için sapma CLHeading trueHeading − magneticHeading (konum izni). Sayfa `CompassSight` yerel varsa onu kullanır (gerçek kuzey, iPhone Pusula uygulamasıyla aynı), yoksa tarayıcı yolu `compass.js`.

## Sıradaki işler
- iPhone uygulaması Xcode'dan yeniden kurulmalı; telefonda denenmedi. Pusula uygulamasıyla aynı dereceyi göstermeli (gerçek kuzey). Manyetik isterse `mag` kullanılır.
