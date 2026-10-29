## Nerede kaldım
- Parkur › Pusula yanlış ölçüyordu (başka pusulada 20° iken 277°, bir yerden sonra dönmüyordu). Neden: iPhone webkitCompassHeading telefonun üst kenarının yönü; nişan alırken telefon dik tutulunca üst kenar göğe bakıyor, değer kayıp takılıyor. Düzeltme `src/lib/compass.js` `compassReader`: arka kameranın baktığı yön alpha/beta/gamma'dan hesaplanır; iPhone'da alpha kuzeye bağlı değil, telefon düze yakınken (beta < 60°) webkitCompassHeading ile fark alınır. Hiç düz tutulmadıysa "Telefonu bir an düz tut". Test: yaris.mjs "Pusula".

## Sıradaki işler
- Telefonda denenmedi; Seyhun bir el pusulasıyla karşılaştırsın.
