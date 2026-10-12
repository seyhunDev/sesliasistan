// Kasa (kulübün nakdi) ve kişisel defter (saf fonksiyonlar, test edilir). Ekran: Hesaplar (/mail) › Kulüp | Kişisel.
// Kayıt:
//   orgs/{uid}/incomes/{id} = { book "club"|"personal" (yoksa club), dir "in"|"out"|"debt" (yoksa in), cat, who, amount, note,
//     date "YYYY-MM-DD", at, paid?, paidAt? }  (elle girilen nakit giriş/çıkış; kişisel gelir, gider ve borçlar)
//   orgs/{uid}/cash/meta = { from (kasanın başladığı an, ISO), add [anahtar] (eski nakit "kasaya eklendi"), skip [anahtar] }
// Kasa = kulübün sayılan nakit girişleri − nakit çıkışları. Kasa başlamadan önce girilen nakitler (Aidatlar'daki nakit aidatlar,
// elle gelirler) kendiliğinden sayılmaz; her birinde "Nakit girdi olarak ekle" düğmesi var (add). Sonrakiler kendiliğinden sayılır.
// Kişisel defter kulüpten tamamen ayrıdır: kasaya, Ödemeler'e ve özete girmez.

export const OUT_CATS = ["Avans", "Malzeme", "Yakıt", "Ulaşım", "Yemek", "Borç verildi", "Diğer"];
export const PERSONAL_CATS = {
  in: ["Maaş", "Ders", "Satış", "Diğer"],
  out: ["Market", "Fatura", "Yakıt", "Yemek", "Kira", "Sağlık", "Diğer"],
  debt: ["Borç"],
};

export const bookOf = (x) => (x?.book === "personal" ? "personal" : "club");
export const dirOf = (x) => (x?.dir === "out" || x?.dir === "debt" ? x.dir : "in");

// Hareket sayılıyor mu (kasada)
export function inKasa(m, meta = {}) {
  if (!m?.cash || bookOf(m) === "personal" || !m.key) return false;
  if ((meta.skip || []).includes(m.key)) return false;
  if ((meta.add || []).includes(m.key)) return true;
  return !!meta.from && !!m.at && String(m.at) >= String(meta.from);
}

// Kasa: { total, in, out, counted [sayılanlar], old [kasa başlamadan önceki, eklenmemiş girişler] }
export function kasaOf(moves = [], meta = {}) {
  const counted = [];
  const old = [];
  for (const m of moves) {
    if (!m?.cash || bookOf(m) === "personal") continue;
    if (inKasa(m, meta)) counted.push(m);
    else if (m.amount > 0 && !(meta.skip || []).includes(m.key)) old.push(m);
  }
  const sum = (f) => counted.filter(f).reduce((n, x) => n + Math.abs(x.amount), 0);
  const inn = sum((x) => x.amount > 0);
  const out = sum((x) => x.amount < 0);
  return { total: Math.round((inn - out) * 100) / 100, in: inn, out, counted, old };
}

// Kişisel defter: { moves (en yeni önce), in, out, net, debt (ödenmemiş borç toplamı), debts (ödenmemişler) }
export function personalOf(moves = []) {
  const list = moves.filter((m) => bookOf(m) === "personal").sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const add = (f) => list.filter(f).reduce((n, x) => n + Math.abs(x.amount), 0);
  const inn = add((x) => x.dir === "in");
  const out = add((x) => x.dir === "out");
  const debts = list.filter((x) => x.dir === "debt" && !x.paid);
  return { moves: list, in: inn, out, net: Math.round((inn - out) * 100) / 100, debt: debts.reduce((n, x) => n + Math.abs(x.amount), 0), debts };
}
