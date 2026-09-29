// Tek seferlik örnek veri: 3 kişi (üye), planlar, görevler, notlar, fişler (üye fişleri, ödemeler dahil), doğum günleri, ders programı.
// Her örnek kayıt "ornek: true" ile işaretlenir; tekrar çalıştırınca önce eski örnekler silinir (çift kayıt olmaz).
//
//   node --env-file=.env.local scripts/ornek-veri.mjs ana@hesap.com          -> örnek veriyi yükler
//   node --env-file=.env.local scripts/ornek-veri.mjs ana@hesap.com --sil    -> yalnızca örnek veriyi ve örnek çalışanları siler
// Örnek kişilerin (üye) şifresi: ORNEK_SIFRE (yoksa "ornek123").
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [ownerEmail, flag] = process.argv.slice(2);
const onlyDelete = flag === "--sil";
const PASS = process.env.ORNEK_SIFRE || "ornek123";
const TZ = "Europe/Istanbul";

const need = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"].filter((k) => !process.env[k]);
if (!ownerEmail) {
  console.log("Ana hesabın e-postasını yaz: node --env-file=.env.local scripts/ornek-veri.mjs ana@hesap.com");
  process.exit(1);
}
if (need.length) {
  console.log(`.env.local içinde eksik: ${need.join(", ")}`);
  process.exit(1);
}
initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const db = getFirestore();

const owner = await auth.getUserByEmail(ownerEmail.trim().toLowerCase()).catch(() => null);
if (!owner) {
  console.log(`Ana hesap bulunamadı: ${ownerEmail}`);
  process.exit(1);
}
const O = owner.uid;
const ownerDoc = (await db.collection("users").doc(O).get()).data() || {};
if (ownerDoc.role === "staff") {
  console.log("Bu e-posta bir çalışan hesabı; ana hesabın e-postasını yaz.");
  process.exit(1);
}
const ownerName = ownerDoc.name || owner.displayName || "Ana hesap";
const org = db.collection("orgs").doc(O);
const COLS = ["plans", "tasks", "notes", "receipts", "receiptImages", "birthdays", "lessons"];

// ---- Önceki örnekleri temizle ----
async function clean() {
  let n = 0;
  for (const c of COLS) {
    const snap = await org.collection(c).where("ornek", "==", true).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
    n += snap.size;
  }
  const staff = await db.collection("users").where("ornek", "==", true).get();
  for (const s of staff.docs) {
    await auth.deleteUser(s.id).catch(() => {});
    await org.collection("members").doc(s.id).delete();
    await s.ref.delete();
  }
  return { records: n, staff: staff.size };
}
const removed = await clean();
console.log(`Eski örnekler silindi: ${removed.records} kayıt, ${removed.staff} çalışan`);
if (onlyDelete) process.exit(0);

// ---- Tarih yardımcıları (İstanbul saatine göre) ----
const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const day = (n) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const ago = (h) => new Date(Date.now() - h * 3600e3);
const iso = (h) => ago(h).toISOString();

// ---- Çalışanlar ----
const STAFF = [
  { key: "sanver", name: "Sanver Kaya", email: "sanver@ornek.kulup", seenH: 0.1 },
  { key: "ali", name: "Ali Deniz", email: "ali@ornek.kulup", seenH: 20 },
  { key: "elif", name: "Elif Yılmaz", email: "elif@ornek.kulup", seenH: null },
];
const S = {};
for (const s of STAFF) {
  const u =
    (await auth.getUserByEmail(s.email).catch(() => null)) ||
    (await auth.createUser({ email: s.email, password: PASS, displayName: s.name }));
  await auth.updateUser(u.uid, { password: PASS, displayName: s.name });
  S[s.key] = u.uid;
  await db.collection("users").doc(u.uid).set({ name: s.name, email: s.email, role: "staff", orgId: O, createdAt: iso(24 * 30), ornek: true });
  await org.collection("members").doc(u.uid).set({
    uid: u.uid, name: s.name, email: s.email, role: "staff", createdAt: iso(24 * 30),
    ...(s.seenH != null ? { lastSeen: ago(s.seenH) } : {}),
  });
}
const nameOf = (uid) => (uid === O ? ownerName : STAFF.find((s) => S[s.key] === uid)?.name || "");

// Ortak alanlar: ekleyen + sorumlular + görebilecekler
const who = (creator, assignees = []) => {
  const a = creator === O ? assignees : [creator];
  return { createdByUid: creator, assignees: a, people: [...new Set([creator, ...a])], createdBy: { name: nameOf(creator) } };
};
const base = (creator, assignees, hoursAgo, cat = "Genel") => ({
  ownerId: O, cat, src: "manual", createdAt: iso(hoursAgo), ornek: true, ...who(creator, assignees),
});

const batch = db.batch();
const ids = {};
const put = (col, key, data) => {
  const ref = org.collection(col).doc();
  ids[key] = ref.id;
  batch.set(ref, data);
};

// ---- Planlar ----
const plan = (key, creator, assignees, p) =>
  put("plans", key, {
    ...base(creator, assignees, p.h ?? 48, p.cat),
    title: p.title,
    date: p.date,
    endDate: p.endDate || "",
    time: p.time || "",
    allDay: !p.time,
    durationMin: p.time ? 60 : null,
    tz: TZ,
    timeSource: p.time ? "user" : "none",
    place: p.place || "",
    status: "planned",
  });
const { sanver, ali, elif } = S;
plan("antrenmanBugun", O, [sanver], { title: "Antrenman", date: day(0), time: "17:00", place: "Kulüp iskelesi", cat: "Antrenman" });
plan("bakimBugun", O, [ali], { title: "Tekne bakımı", date: day(0), time: "09:00", place: "Çekek yeri", cat: "Ekipman" });
plan("optimist", O, [sanver, elif], { title: "Optimist antrenmanı", date: day(1), time: "10:00", place: "Kulüp iskelesi", cat: "Antrenman" });
plan("veli", O, [], { title: "Veli toplantısı", date: day(2), time: "18:30", place: "Kulüp salonu", cat: "Toplantı" });
plan("sayim", elif, [], { title: "Malzeme sayımı", date: day(3), time: "15:00", place: "Depo", cat: "Ekipman", h: 5 });
plan("kamp", O, [sanver, ali, elif], { title: "Yaz kampı", date: day(5), endDate: day(7), place: "Urla", cat: "Kamp" });
plan("yaris", O, [ali], { title: "Bölge yarışı", date: day(9), place: "Çeşme", cat: "Yarış" });
plan("kurul", O, [], { title: "Yönetim kurulu toplantısı", date: day(14), time: "11:00", place: "Kulüp salonu", cat: "Toplantı" });
plan("antrenmanGecen", O, [sanver], { title: "Antrenman", date: day(-3), time: "16:00", place: "Kulüp iskelesi", cat: "Antrenman", h: 24 * 6 });
plan("laser", O, [ali], { title: "Laser yarışı", date: day(-10), place: "Foça", cat: "Yarış", h: 24 * 15 });

// ---- Görevler ----
const task = (key, creator, assignees, t) =>
  put("tasks", key, {
    ...base(creator, assignees, t.h ?? 30, t.cat),
    title: t.title,
    due: t.due ?? null,
    done: !!t.done,
    doneAt: t.done ? iso(t.doneH ?? 20) : null,
    planId: t.plan ? ids[t.plan] : null,
  });
task("sigorta", O, [], { title: "Sigorta poliçesini yenile", due: day(-2), h: 24 * 5 });
task("yelek", O, [sanver], { title: "Can yeleklerini say", due: day(-1), cat: "Ekipman" });
task("yika", O, [sanver], { title: "Tekneleri yıka", due: day(0), cat: "Ekipman", plan: "antrenmanBugun" });
task("teklif", O, [ali], { title: "Yelken onarımı için teklif al", due: day(0), cat: "Ekipman" });
task("kampListe", O, [elif], { title: "Kamp ihtiyaç listesini hazırla", due: day(1), cat: "Kamp", plan: "kamp" });
task("motor", O, [ali, sanver], { title: "Motor yağını değiştir", due: day(3), cat: "Ekipman" });
task("form", O, [ali], { title: "Yarış kayıt formlarını doldur", due: day(7), cat: "Yarış", plan: "yaris" });
task("romork", ali, [], { title: "Römork lastiklerini kontrol et", due: day(1), cat: "Ekipman", h: 3 });
task("site", O, [], { title: "Kulüp web sitesini güncelle" });
task("aidat", O, [], { title: "Yeni sezon aidat listesini çıkar" });
task("alan", O, [sanver], { title: "Antrenman alanını temizle", due: day(-1), done: true, doneH: 18 });
task("davet", O, [], { title: "Veli toplantısı davetlerini gönder", due: day(-1), done: true, doneH: 26, plan: "veli" });

// ---- Notlar ----
const note = (key, creator, assignees, n) =>
  put("notes", key, {
    ...base(creator, assignees, n.h ?? 10, n.cat),
    title: n.title,
    body: n.body,
    tags: [],
    planId: n.plan ? ids[n.plan] : null,
    ...(n.pinned ? { pinned: true } : {}),
  });
note("ruzgar", O, [], { title: "Rüzgar raporu", body: "Hafta sonu kuzeyden 15-18 knot bekleniyor, pazar öğleden sonra hafifliyor.", pinned: true, h: 4 });
note("gundem", O, [], { title: "Veli toplantısı gündemi", body: "1. Yaz kampı programı\n2. Aidatlar\n3. Yeni sezon yarış takvimi\n4. Ekipman ihtiyaçları", plan: "veli", cat: "Toplantı", h: 26 });
note("kampNot", O, [elif], { title: "Kamp için ihtiyaçlar", body: "Çadır 6 adet, ilk yardım çantası, yedek halat, 20 kişilik mutfak malzemesi.", plan: "kamp", cat: "Kamp", h: 30 });
note("dumen", sanver, [], { title: "3 numaralı Optimist", body: "Dümen yuvası gevşek, antrenmandan önce sıkılması gerekiyor.", cat: "Ekipman", h: 2 });
note("servis", ali, [], { title: "Motor servisi", body: "Servis cuma günleri kapalı; parçalar salı günü gelecek.", h: 22 });
note("kurulKarar", O, [], { title: "Yönetim kurulu kararları", body: "Yeni rıhtım başvurusu yapılacak. Sezon sonu kupası için bütçe ayrıldı. Antrenör sözleşmeleri yenilendi.", cat: "Toplantı", h: 24 * 8 });

// ---- Fişler ----
// Tutarlar kuruş (tamsayı); hesap src/lib/receipts.js ile aynı (birim fiyat KDV dahil)
function calcTotals(items) {
  const by = {};
  let gross = 0;
  for (const i of items) {
    const line = Math.round(i.q * i.u);
    gross += line;
    by[i.r] = (by[i.r] || 0) + line;
  }
  const byRate = Object.keys(by).map(Number).sort((a, b) => a - b).map((r) => {
    const b = Math.round(by[r] / (1 + r / 100));
    return { r, base: b, vat: by[r] - b };
  });
  const vat = byRate.reduce((a, x) => a + x.vat, 0);
  return { gross, vat, net: gross - vat, byRate };
}
const mismatch = (r) => r.declared > 0 && Math.abs(r.declared - r.totals.gross) > 5;
// items: [ad, adet, birim fiyat (TL, KDV dahil), KDV oranı]
const receipt = (key, creator, r) => {
  const items = r.items.map(([n, q, tl, rate]) => ({ n, q, u: Math.round(tl * 100), r: rate }));
  const body = {
    merchant: r.merchant, taxId: r.taxId || "", address: r.address || "", docType: r.docType || "fis", docNo: r.docNo || "",
    date: r.date, time: r.time || "", items, totals: calcTotals(items),
    declared: r.declared ? Math.round(r.declared * 100) : null, declaredVat: null,
    pay: r.pay, cat: r.cat, note: r.note || "", conf: null,
  };
  body.status = mismatch(body) ? "review" : "ok";
  const pay = creator === O ? { payStatus: null } : r.paid
    ? { payStatus: "paid", paidAt: iso(r.paidH), paidBy: { name: ownerName }, paySeenAt: r.seen ? iso(r.paidH - 2) : null }
    : { payStatus: "pending" };
  put("receipts", key, { ...body, ...base(creator, [], r.h ?? 24), cat: r.cat, hasImage: false, src: "manual", ...pay });
};
receipt("migros", O, { merchant: "Migros", taxId: "6220529513", date: day(-2), time: "18:42", pay: "Kart", cat: "Market",
  items: [["Su 5 L", 6, 32.5, 1], ["Muz kg", 2, 64.9, 1], ["Kahve", 1, 189.9, 10], ["Peçete", 3, 24.75, 20]] });
receipt("shell", O, { merchant: "Shell", date: day(-4), time: "08:15", pay: "Kart", cat: "Yakıt", items: [["Kurşunsuz benzin 95 (L)", 38.5, 44.62, 20]] });
receipt("malzeme", O, { merchant: "Deniz Malzemeleri Ltd.", taxId: "3130401234", docType: "fatura", docNo: "DM2026-0412", date: day(-6), pay: "Havale", cat: "Ekipman",
  items: [["Can yeleği (çocuk)", 4, 1250, 20], ["Halat 10 mm (m)", 30, 42.5, 20], ["Makara", 2, 385, 20]] });
receipt("elektrik", O, { merchant: "Gediz Elektrik", docType: "fatura", docNo: "GE-88213", date: day(-33), pay: "Havale", cat: "Fatura", h: 24 * 33,
  items: [["Elektrik tüketimi", 1, 2143.4, 20]] });
receipt("restoran", O, { merchant: "Liman Restoran", date: day(-35), time: "20:10", pay: "Nakit", cat: "Yemek", h: 24 * 35,
  items: [["Balık", 4, 420, 10], ["Salata", 2, 110, 10], ["İçecek", 6, 45, 20]] });
receipt("kontrol", O, { merchant: "Kırtasiye Dünyası", date: day(-1), pay: "Kart", cat: "Diğer", declared: 520, note: "Fişteki toplam kalemlerle uyuşmuyor, kontrol et.",
  items: [["Dosya", 10, 18.5, 20], ["Toner", 1, 320, 20]] });
receipt("sanverMarket", sanver, { merchant: "BİM", date: day(-1), time: "12:30", pay: "Nakit", cat: "Market", h: 20, note: "Antrenman sonrası su ve meyve",
  items: [["Su 0,5 L", 24, 7.5, 1], ["Elma kg", 3, 39.9, 1]] });
receipt("sanverYakit", sanver, { merchant: "Opet", date: day(-5), pay: "Kart", cat: "Yakıt", h: 24 * 5, paid: true, paidH: 30,
  items: [["Motorin (L)", 20, 46.1, 20]] });
receipt("aliTamir", ali, { merchant: "Usta Tekne Tamir", date: day(-2), pay: "Nakit", cat: "Bakım", h: 40,
  items: [["Pervane tamiri", 1, 1750, 20], ["İşçilik", 1, 600, 20]] });
receipt("aliUlasim", ali, { merchant: "Taksi", date: day(-8), pay: "Nakit", cat: "Ulaşım", h: 24 * 8, paid: true, paidH: 24 * 6, seen: true,
  items: [["Taksi (kulüp–marina)", 1, 285, 10]] });
receipt("elifYemek", elif, { merchant: "Köfteci Ramiz", date: day(0), time: "13:05", pay: "Kart", cat: "Yemek", h: 2,
  items: [["Köfte menü", 3, 290, 10], ["Ayran", 3, 35, 10]] });

// ---- Doğum günleri (ay/gün; yıl biliniyorsa yaş gösterilir) ----
const md = (n) => { const d = day(n); return { month: +d.slice(5, 7), day: +d.slice(8, 10) }; };
const bday = (key, creator, b) => put("birthdays", key, { ...base(creator, [], 24 * 3), name: b.name, ...md(b.in), year: b.year || null, memberUid: b.member || null, note: b.note || "" });
bday("sanverDG", O, { name: "Sanver Kaya", in: 5, year: 1998, member: sanver, note: "Kulüpçe pasta" });
bday("teyze", O, { name: "Ayşe Teyze", in: 12, year: 1962, note: "Çiçek gönder" });
bday("anne", O, { name: "Annem", in: 26 });
bday("elifDG", elif, { name: "Elif'in kardeşi", in: 40 });

// ---- Ders programı (haftalık; 1 = pazartesi) ----
const lesson = (key, creator, l) => put("lessons", key, { ...base(creator, [], 24 * 7), title: l.title, day: l.day, start: l.start, end: l.end, place: l.place || "", teacher: l.teacher || "" });
[
  ["Yelken teorisi", 1, "18:00", "19:30", "Kulüp salonu", "Kaptan Murat"],
  ["İngilizce", 2, "19:00", "20:30", "Online", "Deniz Hoca"],
  ["Meteoroloji", 3, "18:00", "19:00", "Kulüp salonu", "Kaptan Murat"],
  ["İlk yardım", 4, "18:30", "20:00", "Sağlık merkezi", ""],
  ["İngilizce", 4, "20:30", "21:30", "Online", "Deniz Hoca"],
  ["Pratik (denizde)", 6, "10:00", "13:00", "Kulüp iskelesi", "Kaptan Murat"],
].forEach(([title, d, start, end, place, teacher], i) => lesson(`ders${i}`, O, { title, day: d, start, end, place, teacher }));

await batch.commit();

console.log("\nÖrnek veri yüklendi: 10 plan, 12 görev, 6 not, 11 fiş, 4 doğum günü, 6 ders");
console.log("Örnek kişiler, üye hesabı (şifre: " + PASS + "):");
STAFF.forEach((s) => console.log(`  - ${s.name.padEnd(12)} ${s.email}`));
console.log("\nSilmek için: node --env-file=.env.local scripts/ornek-veri.mjs " + ownerEmail + " --sil");
process.exit(0);
