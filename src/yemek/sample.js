// Örnek restoranlar (Dikili, hayali). Yapı yemek sipariş sitelerindeki gibi:
// restoran › kategori › ürün › seçenek grubu › seçenek. Kategori başka mutfaksa `cuisine` taşır (pizzacıda Makarnalar). Fiyatlar ₺, süreler dakika.
// Firestore'a yüklenince: yemekKatalog/ozet (kısa bilgiler, catalogOf) + yemekRestoranlar/{id} (tam menü).

// ---- Ortak seçenek grupları ----
const one = (name, opts, required = true) => ({ name, type: "one", required, options: opts.map(([n, extra = 0]) => ({ name: n, extra })) });
const many = (name, opts, max) => ({ name, type: "many", required: false, max, options: opts.map(([n, extra = 0]) => ({ name: n, extra })) });

const PIZZA_SIZE = one("Boy", [["Küçük", -50], ["Orta"], ["Büyük", 70]]);
const CRUST = one("Hamur", [["İnce"], ["Kalın"]]);
const PIZZA_EXTRA = many("Ekstra", [["Ekstra peynir", 30], ["Jalapeño", 20], ["Zeytin", 15], ["Mantar", 20]], 4);
const DRINK = one("İçecek", [["Kola"], ["Kola Zero"], ["Ayran"], ["Su", -10], ["Limonata", 15]]);
const DONENESS = one("Pişme", [["Az"], ["Orta"], ["İyi"]]);
const BURGER_EXTRA = many("Ekstra", [["Cheddar", 25], ["Karamelize soğan", 20], ["Bacon", 45], ["Turşu", 0]], 4);
const PORTION = one("Porsiyon", [["1 porsiyon"], ["1,5 porsiyon", 60]]);
const SPICE = one("Acı", [["Acısız"], ["Az acılı"], ["Acılı"]]);
const BREAD = one("Ekmek", [["Lavaş"], ["Ekmek arası"], ["Porsiyon (pilavlı)", 40]]);

// it(id, ad, fiyat, açıklama, etiketler, foto, seçenekler)
const it = (id, name, price, desc = "", tags = [], photo = "", options = []) => ({ id, name, price, desc, tags, photo, options, available: true });

const DRINKS = (p) => ({
  name: "İçecekler",
  items: [
    it(`${p}-kola`, "Kola 1 L", 50, "", ["içecek"], "drink"),
    it(`${p}-ayran`, "Ayran", 25, "", ["içecek"], "drink"),
    it(`${p}-su`, "Su 0,5 L", 10, "", ["içecek"], "drink"),
    it(`${p}-limonata`, "Ev yapımı limonata", 45, "", ["içecek"], "lemonade"),
  ],
});

export const SAMPLE_PLACES = [
  {
    id: "anne-eli", name: "Anne Eli Ev Yemekleri", cuisines: ["ev yemeği"], area: "Cumhuriyet Mah.",
    pos: { lat: 39.0712, lng: 26.8895 }, phone: "0232 000 00 01", rating: 4.6, ratingCount: 312,
    prepMin: 20, minOrder: 150, fee: 0, hours: ["11:00", "21:00"], cover: "stew",
    menu: [
      { name: "Ana yemekler", items: [
        it("ae-fasulye", "Kuru fasulye", 160, "Tereyağlı, etli", ["popüler", "doyurucu"], "stew", [PORTION]),
        it("ae-karniyarik", "Karnıyarık", 190, "Kıymalı, közlenmiş patlıcan", ["doyurucu"], "stew", [PORTION]),
        it("ae-tavuk", "Fırın tavuk but", 210, "Patatesli", [], "rice", [PORTION]),
        it("ae-kofte", "İzmir köfte", 220, "Patates, biber, domates sos", ["popüler"], "stew", [PORTION]),
        it("ae-dolma", "Zeytinyağlı biber dolma", 150, "Soğuk servis", ["vejetaryen", "hafif"], "salad"),
        it("ae-taze", "Zeytinyağlı taze fasulye", 130, "", ["vejetaryen", "hafif"], "salad"),
      ] },
      { name: "Yanında", items: [
        it("ae-pilav", "Tereyağlı pirinç pilavı", 70, "", ["vejetaryen"], "rice"),
        it("ae-cacik", "Cacık", 50, "", ["vejetaryen", "hafif"], "salad"),
        it("ae-mercimek", "Mercimek çorbası", 80, "", ["vejetaryen", "hafif", "çorba"], "soup"),
      ] },
      { name: "Tatlılar", items: [it("ae-sutlac", "Fırın sütlaç", 90, "", ["tatlı"], "dessert")] },
      DRINKS("ae"),
    ],
  },
  {
    id: "esnaf", name: "Dikili Esnaf Lokantası", cuisines: ["ev yemeği", "çorba"], area: "Çarşı",
    pos: { lat: 39.0729, lng: 26.8876 }, phone: "0232 000 00 02", rating: 4.3, ratingCount: 198,
    prepMin: 15, minOrder: 120, fee: 15, hours: ["07:00", "20:00"], cover: "soup",
    menu: [
      { name: "Çorbalar", cuisine: "çorba", items: [
        it("es-mercimek", "Mercimek çorbası", 70, "", ["vejetaryen", "hafif", "çorba"], "soup"),
        it("es-ezogelin", "Ezogelin", 70, "", ["vejetaryen", "hafif", "çorba"], "soup"),
        it("es-iskembe", "İşkembe", 110, "Sarımsak, sirke", ["çorba"], "soup"),
      ] },
      { name: "Sulu yemekler", items: [
        it("es-etsote", "Et sote", 230, "Pilav ile", ["doyurucu"], "stew", [PORTION]),
        it("es-tasKebabi", "Tas kebabı", 240, "Pilav ile", ["doyurucu", "popüler"], "stew", [PORTION]),
        it("es-nohut", "Etli nohut", 160, "Pilav ile", ["doyurucu"], "stew", [PORTION]),
        it("es-turlu", "Türlü", 140, "", ["vejetaryen"], "stew"),
      ] },
      { name: "Yanında", items: [it("es-pilav", "Pilav", 60, "", ["vejetaryen"], "rice"), it("es-salata", "Mevsim salata", 70, "", ["vejetaryen", "hafif"], "salad")] },
      DRINKS("es"),
    ],
  },
  {
    id: "pizza-ruzgar", name: "Pizza Rüzgar", cuisines: ["pizza", "makarna"], area: "Sahil",
    pos: { lat: 39.0701, lng: 26.8862 }, phone: "0232 000 00 03", rating: 4.5, ratingCount: 540,
    prepMin: 25, minOrder: 200, fee: 0, hours: ["12:00", "00:00"], cover: "pizza",
    menu: [
      { name: "Pizzalar", items: [
        it("pr-karisik", "Karışık", 260, "Sucuk, salam, mantar, biber, zeytin", ["popüler"], "pizza", [PIZZA_SIZE, CRUST, PIZZA_EXTRA]),
        it("pr-sucuklu", "Sucuklu", 245, "Bol sucuk, kaşar, domates sos", [], "pizzaPep", [PIZZA_SIZE, CRUST, PIZZA_EXTRA]),
        it("pr-marg", "Margarita", 210, "Domates sos, mozzarella, fesleğen", ["vejetaryen"], "pizzaMarg", [PIZZA_SIZE, CRUST, PIZZA_EXTRA]),
        it("pr-sebzeli", "Sebzeli", 225, "Mantar, biber, roka, zeytin", ["vejetaryen"], "pizzaVeg", [PIZZA_SIZE, CRUST, PIZZA_EXTRA]),
        it("pr-ton", "Ton balıklı", 270, "Ton, mısır, kırmızı soğan", [], "pizza", [PIZZA_SIZE, CRUST, PIZZA_EXTRA]),
        it("pr-4peynir", "Dört peynirli", 275, "Mozzarella, cheddar, parmesan, rokfor", ["vejetaryen"], "pizzaMarg", [PIZZA_SIZE, CRUST]),
      ] },
      { name: "Makarnalar", cuisine: "makarna", items: [
        it("pr-arrab", "Penne arrabbiata", 190, "Acılı domates sos, parmesan", ["acılı", "vejetaryen"], "pasta", [SPICE]),
        it("pr-fettu", "Fettuccine Alfredo", 215, "Kremalı, mantarlı", ["vejetaryen"], "pasta2"),
      ] },
      { name: "Yan ürünler", items: [
        it("pr-patates", "Patates kızartması", 80, "Orta boy", ["vejetaryen"], "fries"),
        it("pr-sarimsak", "Sarımsaklı ekmek", 70, "4 dilim", ["vejetaryen"], "pizzaMarg"),
      ] },
      { name: "Tatlılar", items: [it("pr-tiramisu", "Tiramisu", 120, "", ["tatlı"], "cake")] },
      DRINKS("pr"),
    ],
  },
  {
    id: "napoli", name: "Napoli Taş Fırın", cuisines: ["pizza"], area: "Mermer Sk.",
    pos: { lat: 39.0745, lng: 26.8911 }, phone: "0232 000 00 04", rating: 4.7, ratingCount: 221,
    prepMin: 30, minOrder: 250, fee: 20, hours: ["17:00", "23:30"], cover: "pizzaMarg",
    menu: [
      { name: "Napoli pizzaları", items: [
        it("np-marg", "Margherita DOP", 290, "San Marzano domates, manda mozzarellası", ["popüler", "vejetaryen"], "pizzaMarg", [CRUST]),
        it("np-diavola", "Diavola", 320, "Acı salam, pul biber", ["acılı"], "pizzaPep", [CRUST]),
        it("np-funghi", "Funghi", 305, "Mantar, trüf yağı", ["vejetaryen"], "pizzaVeg", [CRUST]),
        it("np-prosc", "Parmalı roka", 350, "Kurutulmuş et, roka, parmesan", [], "pizza", [CRUST]),
      ] },
      { name: "Başlangıçlar", items: [it("np-burrata", "Burrata salata", 240, "Domates, fesleğen", ["vejetaryen", "hafif"], "salad")] },
      { name: "Tatlılar", items: [it("np-tiramisu", "Tiramisu", 140, "", ["tatlı"], "cake")] },
      DRINKS("np"),
    ],
  },
  {
    id: "burger-koy", name: "Burger Koy", cuisines: ["burger"], area: "Sahil",
    pos: { lat: 39.0697, lng: 26.8851 }, phone: "0232 000 00 05", rating: 4.2, ratingCount: 410,
    prepMin: 20, minOrder: 180, fee: 0, hours: ["12:00", "23:00"], cover: "burger",
    menu: [
      { name: "Menüler", items: [
        it("bk-cheese-m", "Cheeseburger menü", 320, "Patates ve içecek ile", ["popüler", "doyurucu"], "burger", [DONENESS, DRINK, BURGER_EXTRA]),
        it("bk-double-m", "Double cheeseburger menü", 395, "İki köfte, patates, içecek", ["doyurucu"], "burger3", [DONENESS, DRINK, BURGER_EXTRA]),
        it("bk-tavuk-m", "Çıtır tavuk burger menü", 290, "Patates ve içecek ile", [], "burger2", [DRINK]),
      ] },
      { name: "Burgerler", items: [
        it("bk-classic", "Klasik burger", 240, "150 g köfte, marul, domates", [], "burger2", [DONENESS, BURGER_EXTRA]),
        it("bk-cheese", "Cheeseburger", 260, "Cheddar, turşu, soğan", [], "burger", [DONENESS, BURGER_EXTRA]),
        it("bk-bbq", "Barbekü burger", 285, "Barbekü sos, karamelize soğan", [], "burger3", [DONENESS, BURGER_EXTRA]),
        it("bk-veggie", "Sebze burger", 230, "Nohut köftesi", ["vejetaryen"], "burger2"),
      ] },
      { name: "Yan ürünler", items: [
        it("bk-patates", "Patates kızartması", 75, "", ["vejetaryen"], "fries"),
        it("bk-sogan", "Soğan halkası", 85, "", ["vejetaryen"], "fries"),
      ] },
      DRINKS("bk"),
    ],
  },
  {
    id: "smash", name: "Smash Dikili", cuisines: ["burger"], area: "Atatürk Cd.",
    pos: { lat: 39.0733, lng: 26.8902 }, phone: "0232 000 00 06", rating: 4.4, ratingCount: 175,
    prepMin: 15, minOrder: 200, fee: 15, hours: ["13:00", "01:00"], cover: "burger3",
    menu: [
      { name: "Smash burgerler", items: [
        it("sm-single", "Single smash", 250, "İnce köfte, cheddar, özel sos", ["popüler"], "burger3", [BURGER_EXTRA]),
        it("sm-double", "Double smash", 330, "İki ince köfte, çift cheddar", ["doyurucu"], "burger", [BURGER_EXTRA]),
        it("sm-truffle", "Trüflü smash", 360, "Trüf mayonez, mantar", [], "burger2", [BURGER_EXTRA]),
      ] },
      { name: "Yan ürünler", items: [
        it("sm-patates", "Baharatlı patates", 90, "", ["vejetaryen", "acılı"], "fries"),
        it("sm-cheese", "Cheddar soslu patates", 110, "", ["vejetaryen"], "fries"),
      ] },
      { name: "Tatlılar", items: [it("sm-shake", "Çikolatalı milkshake", 120, "", ["tatlı"], "icecream")] },
      DRINKS("sm"),
    ],
  },
  {
    id: "sakura", name: "Sakura Sushi", cuisines: ["sushi", "uzak doğu"], area: "Marina",
    pos: { lat: 39.0688, lng: 26.8840 }, phone: "0232 000 00 07", rating: 4.6, ratingCount: 143,
    prepMin: 30, minOrder: 300, fee: 25, hours: ["13:00", "23:00"], cover: "sushi",
    menu: [
      { name: "Rollar", items: [
        it("sk-cali", "California roll (8 adet)", 290, "Yengeç, avokado, salatalık", ["popüler"], "sushi"),
        it("sk-salmon", "Somon avokado roll (8 adet)", 340, "", [], "sushi2"),
        it("sk-tempura", "Karides tempura roll (8 adet)", 360, "", [], "sushi"),
        it("sk-veggie", "Sebze roll (8 adet)", 240, "", ["vejetaryen", "hafif"], "sushi2"),
      ] },
      { name: "Setler", items: [
        it("sk-set1", "Sushi set (16 adet)", 590, "2 kişilik karışık", ["paylaşım"], "sushi", [one("Soya", [["Normal"], ["Az tuzlu"]])]),
        it("sk-nigiri", "Somon nigiri (4 adet)", 260, "", [], "sushi2"),
      ] },
      { name: "Sıcaklar", items: [
        it("sk-noodle", "Tavuklu noodle", 240, "Sebze, soya sos", [], "pasta2", [SPICE]),
        it("sk-miso", "Miso çorbası", 90, "", ["hafif", "çorba"], "soup"),
      ] },
      DRINKS("sk"),
    ],
  },
  {
    id: "usta-donerci", name: "Usta Dönerci", cuisines: ["döner", "kebap"], area: "Çarşı",
    pos: { lat: 39.0721, lng: 26.8869 }, phone: "0232 000 00 08", rating: 4.4, ratingCount: 620,
    prepMin: 15, minOrder: 120, fee: 0, hours: ["10:00", "23:00"], cover: "doner",
    menu: [
      { name: "Dönerler", items: [
        it("ud-et", "Et döner", 220, "Yaprak et döner", ["popüler"], "doner", [BREAD, SPICE]),
        it("ud-tavuk", "Tavuk döner", 160, "", [], "doner", [BREAD, SPICE]),
        it("ud-iskender", "İskender", 340, "Tereyağı, yoğurt, domates sos", ["doyurucu"], "kebab"),
        it("ud-durum", "Dürüm menü", 230, "Ayran ve patates ile", ["doyurucu"], "doner", [SPICE, DRINK]),
      ] },
      { name: "Kebaplar", items: [
        it("ud-adana", "Adana kebap", 300, "Acılı", ["acılı"], "kebab", [BREAD]),
        it("ud-urfa", "Urfa kebap", 300, "Acısız", [], "kebab", [BREAD]),
        it("ud-lahmacun", "Lahmacun", 90, "", [], "kebab", [SPICE]),
      ] },
      { name: "Tatlılar", items: [it("ud-kunefe", "Künefe", 150, "", ["tatlı"], "dessert")] },
      DRINKS("ud"),
    ],
  },
  {
    id: "liman-balik", name: "Liman Balık", cuisines: ["balık", "deniz ürünleri"], area: "Liman",
    pos: { lat: 39.0679, lng: 26.8834 }, phone: "0232 000 00 09", rating: 4.7, ratingCount: 260,
    prepMin: 30, minOrder: 250, fee: 20, hours: ["12:00", "23:00"], cover: "fish",
    menu: [
      { name: "Izgaralar", items: [
        it("lb-levrek", "Levrek ızgara", 420, "Roka salata ile", ["popüler", "hafif"], "fish"),
        it("lb-cupra", "Çupra ızgara", 420, "Roka salata ile", ["hafif"], "fish"),
        it("lb-somon", "Somon ızgara", 460, "", ["hafif"], "fish"),
      ] },
      { name: "Deniz ürünleri", items: [
        it("lb-kalamar", "Kalamar tava", 320, "Tarator ile", [], "seafood"),
        it("lb-karides", "Karides güveç", 380, "Kaşarlı", [], "seafood"),
        it("lb-midye", "Midye tava", 240, "", [], "seafood"),
      ] },
      { name: "Mezeler", items: [it("lb-haydari", "Haydari", 90, "", ["vejetaryen", "hafif"], "salad"), it("lb-salata", "Gavurdağı salata", 120, "", ["vejetaryen", "hafif"], "salad")] },
      DRINKS("lb"),
    ],
  },
  {
    id: "tatli-liman", name: "Tatlı Liman", cuisines: ["tatlı", "kahvaltı"], area: "Sahil",
    pos: { lat: 39.0705, lng: 26.8872 }, phone: "0232 000 00 10", rating: 4.5, ratingCount: 188,
    prepMin: 10, minOrder: 100, fee: 10, hours: ["08:00", "23:00"], cover: "cake",
    menu: [
      { name: "Kahvaltı", cuisine: "kahvaltı", items: [
        it("tl-serpme", "Serpme kahvaltı (2 kişilik)", 520, "", ["paylaşım", "doyurucu"], "breakfast"),
        it("tl-menemen", "Menemen", 140, "", ["vejetaryen"], "breakfast", [one("Ekstra", [["Sade"], ["Kaşarlı", 25], ["Sucuklu", 40]])]),
        it("tl-tost", "Kaşarlı tost", 110, "", ["vejetaryen", "hafif"], "breakfast"),
      ] },
      { name: "Tatlılar", cuisine: "tatlı", items: [
        it("tl-cheesecake", "San Sebastian cheesecake", 180, "", ["popüler", "tatlı"], "cake"),
        it("tl-supangle", "Supangle", 120, "", ["tatlı"], "dessert"),
        it("tl-dondurma", "Dondurma (3 top)", 100, "", ["tatlı"], "icecream", [many("Top", [["Çikolata"], ["Vanilya"], ["Çilek"], ["Fıstık", 15]], 3)]),
        it("tl-baklava", "Fıstıklı baklava (4 dilim)", 200, "", ["tatlı"], "dessert"),
      ] },
      DRINKS("tl"),
    ],
  },
];

// Katalog belgesi: liste ekranı için kısa bilgiler (menü yok; sayfa açılınca tek okuma)
export function catalogOf(places) {
  return places.map(({ menu, ...p }) => ({ ...p, itemCount: menu.reduce((n, c) => n + c.items.length, 0) }));
}
