## Nerede kaldım

- iPhone uygulamasında (Capacitor) da ekranın sol kenarından sağa çekince geri gidiliyor (Seyhun: "bu yana çekerek geri gitme olayları"). Ana ekran uygulamasındaki `SwipeBack.jsx` artık Capacitor iOS'ta da açık (önceden kapalıydı; WKWebView'in kendi geri hareketi de kapalı, yani çift geri yok). Kurallar aynı: alt sekme sayfalarında, açık pencere ya da asistan varken çalışmaz; satırlardaki sola kaydırma (Gizle) ve grafikler kenardan başlamadığı için etkilenmez. Web tarafı olduğu için Xcode'dan yeniden kurmak gerekmez, yayınla gelir. Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene; Android uygulamasında telefonun kendi geri hareketi var, ona dokunulmadı.
