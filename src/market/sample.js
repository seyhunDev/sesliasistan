// Velora Market örnek ürünleri (yemek yapmaya uygun; fiyatlar ₺, hayali). Yönetim ilk kez yazınca Firestore'a
// (orgs/{org}/market/katalog) bunlarla başlanır, sonra oradan değişir.
// Ürün: { id, name, size ("1 L", "500 g", "adet"), cat (reyon id), price, stock, held (siparişte bekleyen) }

export const AISLES = [
  ["sebze", "Meyve ve sebze"],
  ["et", "Et, tavuk, balık"],
  ["sut", "Süt ve kahvaltılık"],
  ["temel", "Temel gıda"],
  ["baharat", "Baharat ve sos"],
  ["firin", "Ekmek ve hamur"],
  ["konserve", "Konserve ve dondurulmuş"],
  ["icecek", "İçecek"],
];
export const aisleName = (id) => AISLES.find((a) => a[0] === id)?.[1] || "Diğer";

// [ad, boyut, fiyat, stok]
const RAW = {
  sebze: [
    ["Domates", "1 kg", 45, 60], ["Salatalık", "1 kg", 40, 40], ["Kuru soğan", "1 kg", 25, 80], ["Sarımsak", "250 g", 55, 30],
    ["Patates", "1 kg", 30, 70], ["Havuç", "1 kg", 28, 40], ["Patlıcan", "1 kg", 50, 35], ["Kabak", "1 kg", 42, 30],
    ["Sivri biber", "500 g", 35, 40], ["Kapya biber", "500 g", 45, 25], ["Yeşil soğan", "demet", 15, 30], ["Maydanoz", "demet", 12, 40],
    ["Dereotu", "demet", 12, 25], ["Nane", "demet", 12, 20], ["Marul", "adet", 25, 30], ["Roka", "demet", 15, 20],
    ["Ispanak", "1 kg", 45, 20], ["Mantar", "400 g", 60, 25], ["Brokoli", "adet", 45, 15], ["Karnabahar", "adet", 50, 12],
    ["Pırasa", "1 kg", 35, 20], ["Kereviz", "adet", 30, 15], ["Limon", "1 kg", 40, 50], ["Elma", "1 kg", 35, 60],
    ["Muz", "1 kg", 70, 40], ["Portakal", "1 kg", 35, 50], ["Mandalina", "1 kg", 40, 40], ["Çilek", "500 g", 75, 15],
    ["Avokado", "adet", 35, 20], ["Taze fasulye", "1 kg", 70, 15],
  ],
  et: [
    ["Dana kıyma", "500 g", 325, 30], ["Dana kuşbaşı", "500 g", 360, 20], ["Kuzu kuşbaşı", "500 g", 450, 10], ["Dana bonfile", "500 g", 650, 8],
    ["Tavuk göğüs", "1 kg", 210, 30], ["Tavuk but", "1 kg", 180, 30], ["Tavuk kanat", "1 kg", 190, 20], ["Bütün tavuk", "adet", 260, 12],
    ["Köfte harcı", "500 g", 290, 15], ["Sucuk", "250 g", 180, 25], ["Pastırma", "100 g", 160, 10], ["Levrek", "adet", 220, 10],
    ["Çipura", "adet", 210, 10], ["Somon fileto", "300 g", 340, 8], ["Karides", "500 g", 380, 8], ["Hamsi", "1 kg", 150, 10],
  ],
  sut: [
    ["Süt", "1 L", 42, 60], ["Yoğurt", "1 kg", 75, 40], ["Süzme yoğurt", "500 g", 70, 25], ["Ayran", "1 L", 35, 30],
    ["Kaşar peyniri", "200 g", 96, 40], ["Beyaz peynir", "500 g", 140, 30], ["Lor peyniri", "500 g", 60, 15], ["Mozzarella", "200 g", 90, 20],
    ["Parmesan", "100 g", 120, 10], ["Krem peynir", "180 g", 65, 15], ["Tereyağı", "250 g", 118, 30], ["Margarin", "250 g", 45, 20],
    ["Krema", "200 ml", 40, 25], ["Yumurta", "10'lu", 75, 50], ["Zeytin (siyah)", "500 g", 110, 25], ["Zeytin (yeşil)", "500 g", 100, 20],
    ["Bal", "450 g", 180, 15], ["Reçel", "380 g", 70, 15], ["Tahin", "300 g", 85, 12], ["Pekmez", "400 g", 75, 12],
  ],
  temel: [
    ["Un", "1 kg", 32, 50], ["Toz şeker", "1 kg", 40, 40], ["Pirinç", "1 kg", 75, 40], ["Bulgur (pilavlık)", "1 kg", 45, 30],
    ["Bulgur (köftelik)", "1 kg", 45, 20], ["Kırmızı mercimek", "1 kg", 60, 30], ["Yeşil mercimek", "1 kg", 65, 20], ["Nohut", "1 kg", 70, 25],
    ["Kuru fasulye", "1 kg", 85, 25], ["Spagetti", "500 g", 25, 50], ["Penne makarna", "500 g", 25, 40], ["Erişte", "500 g", 40, 20],
    ["Lazanya yaprağı", "500 g", 89, 15], ["Şehriye", "500 g", 22, 25], ["Ayçiçek yağı", "1 L", 85, 40], ["Zeytinyağı", "1 L", 260, 25],
    ["Mısır nişastası", "200 g", 25, 15], ["Kabartma tozu", "10 g", 5, 40], ["Vanilin", "5 g", 4, 30], ["Kakao", "100 g", 45, 15],
    ["Galeta unu", "200 g", 22, 15], ["İrmik", "500 g", 30, 15], ["Çay", "1 kg", 220, 20], ["Türk kahvesi", "100 g", 65, 20],
  ],
  baharat: [
    ["Tuz", "750 g", 15, 40], ["Karabiber", "50 g", 30, 30], ["Pul biber", "100 g", 35, 25], ["Kimyon", "50 g", 25, 25],
    ["Kekik", "50 g", 25, 25], ["Nane (kuru)", "50 g", 20, 20], ["Toz kırmızı biber", "100 g", 30, 20], ["Tarçın", "50 g", 30, 15],
    ["Zerdeçal", "50 g", 30, 10], ["Köri", "50 g", 35, 10], ["Defne yaprağı", "10 g", 15, 10], ["Domates salçası", "830 g", 48, 40],
    ["Biber salçası", "650 g", 60, 25], ["Ketçap", "400 g", 45, 25], ["Mayonez", "400 g", 55, 25], ["Hardal", "300 g", 40, 15],
    ["Soya sosu", "250 ml", 60, 10], ["Sirke", "1 L", 35, 20], ["Nar ekşisi", "330 ml", 55, 15], ["Limon sosu", "1 L", 25, 15],
    ["Et suyu tableti", "8'li", 35, 20], ["Tavuk suyu tableti", "8'li", 35, 20],
  ],
  firin: [
    ["Ekmek", "adet", 15, 60], ["Tam buğday ekmeği", "adet", 25, 25], ["Lavaş", "6'lı", 35, 25], ["Yufka", "3'lü", 45, 20],
    ["Milföy hamuru", "1 kg", 90, 12], ["Pizza hamuru", "2'li", 60, 12], ["Bazlama", "4'lü", 45, 15], ["Hamburger ekmeği", "4'lü", 40, 15],
    ["Tost ekmeği", "adet", 40, 20], ["Kuru maya", "3'lü", 15, 25],
  ],
  konserve: [
    ["Domates (konserve)", "400 g", 35, 25], ["Mısır konservesi", "220 g", 30, 20], ["Ton balığı", "2x160 g", 120, 20], ["Haşlanmış nohut", "400 g", 30, 15],
    ["Bezelye (dondurulmuş)", "450 g", 55, 15], ["Patates (dondurulmuş)", "1 kg", 85, 15], ["Karışık sebze (dondurulmuş)", "450 g", 55, 12], ["Turşu", "1 kg", 60, 15],
    ["Közlenmiş biber", "540 g", 55, 10], ["Hindistan cevizi sütü", "400 ml", 70, 0],
  ],
  icecek: [
    ["Su", "5 L", 30, 40], ["Su", "0,5 L", 7, 100], ["Maden suyu", "6'lı", 45, 25], ["Kola", "1 L", 45, 30],
    ["Meyve suyu", "1 L", 50, 25], ["Limonata", "1 L", 45, 15], ["Soğuk çay", "1 L", 40, 15], ["Şalgam", "1 L", 35, 15],
  ],
};

const slug = (s) => s.toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const SAMPLE_PRODUCTS = Object.entries(RAW).flatMap(([cat, list]) =>
  list.map(([name, size, price, stock]) => ({ id: slug(`${name} ${size}`), name, size, cat, price, stock, held: 0 })),
);
