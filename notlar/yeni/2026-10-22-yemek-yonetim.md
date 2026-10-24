## Nerede kaldım

- Velora Yemek 3. adım: Yönetim (`/yemek/yonetim`), Restoran ekranı (`/yemek/panel`), Kurye ekranı (`/yemek/kurye`). Giriş: Alışveriş › Yemek üstündeki "⋯". Kod `src/yemek/ui/AdminView.jsx`, `PanelView.jsx`, `CourierView.jsx`.
- Yönetim: bugünün sipariş/ciro/yolda sayıları, Siparişler / Restoranlar (aç-kapa anahtarı, saate bakmaz) / Kuryeler (ad + telefon), "Deneme modu" anahtarı (`orgs/{org}/yemek/ayar`: demo, closed, couriers).
- Restoran ekranı: restoran bu cihazda hatırlanır (localStorage `yemek-panel`). Yeni → Onayla (hazırlık süresi + yol ile varış) / Reddet; Hazırlanan → Kuryeye ver (kurye seçilir); Yolda.
- Kurye ekranı: kurye bu cihazda hatırlanır (`yemek-kurye`). Yoldaki siparişleri harita, adres, Yol tarifi (Apple Haritalar), Teslim ile gösterir. Sipariş varken konum siparişe yazılır (en sık 10 sn, en az 25 m), ekran açık tutulur.
- Restoran bir siparişe dokununca sipariş gerçek olur (`demo: false`) ve artık saatten kendiliğinden ilerlemez. Yoldayken kalan dakika kuryenin konumundan hesaplanır.
- Düzeltme: "pizza" demek artık "Pizza Rüzgar" restoranını seçmiyor (ilk kelime mutfak ya da "Dikili" ise restoran adı sayılmaz).
- Kural değişmedi (sahibin genel kuralı kapsıyor). Ekranlar telefonda denenmedi.

## Sıradaki işler

- Ana sayfaya saate göre "Öğle / Akşam yemeği önerisi" butonu (`/shopping?tab=yemek`): ana sayfa sahibi iş parçası yapıyor; içeriği sonra `suggest()` ile doldurulacak.
- 4. adım: yapay zeka (Gemini) ile öneri ve sesli asistan görevi `isler/yemek.js` ("pizza söyle" sipariş; "pizza yedim" Fitness'ta kalır).
- Başka cihazdan restoran/kurye girişi şimdilik ana hesapla; ayrı projeye taşınınca ayrı hesaplar.
