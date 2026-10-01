// Sunucu: ana hesabın verilerini silme ve örnek veri oluşturma (Ayarlar › Örnek veri).
// Sporcu verisi ayrı veritabanında (kulüp projesi); buradan hiç dokunulmaz. Ana hesabın kendisi ve ayarları kalır.
import { adminAuth, adminDb } from "@/lib/server/admin";
import { loginEmail } from "@/lib/kinds";

const TZ = "Europe/Istanbul";

// ---- Silme ----
// orgs/{ana hesap} altındaki her şey (planlar, görevler, notlar, fişler, doğum günleri, dersler, sohbetler, kişiler…);
// kişilerin giriş hesapları ve profilleri. keepMails: banka/mail bildirimleri kalsın.
export async function wipeOrg(O, { keepMails = true } = {}) {
  const db = adminDb();
  const org = db.collection("orgs").doc(O);
  // Kişi hesapları: bu işletmeye bağlı users (role staff)
  const staff = await db.collection("users").where("orgId", "==", O).get();
  const uids = staff.docs.filter((d) => d.id !== O && d.data().role === "staff").map((d) => d.id);
  for (let i = 0; i < uids.length; i += 1000) await adminAuth().deleteUsers(uids.slice(i, i + 1000)).catch((e) => console.warn("[demo] hesaplar silinemedi:", e.code));
  for (let i = 0; i < uids.length; i += 400) {
    const b = db.batch();
    uids.slice(i, i + 400).forEach((u) => b.delete(db.collection("users").doc(u)));
    await b.commit();
  }
  const cols = await org.listCollections();
  let n = 0;
  for (const c of cols) {
    if (keepMails && c.id === "mails") continue;
    await db.recursiveDelete(c);
    n++;
  }
  return { accounts: uids.length, collections: n };
}

// ---- Örnek veri ----
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function dayFn() {
  const t = today();
  return (n) => {
    const d = new Date(`${t}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
}
const ago = (h) => new Date(Date.now() - h * 3600e3);
const iso = (h) => ago(h).toISOString();
const randomPw = () => Math.random().toString(36).slice(2, 6) + Math.floor(1000 + Math.random() * 9000);

// Kişiler: Sanver ve Ali çalışan, Pınar Ezgi aile; üç örnek çalışan daha. Doğum günü bilinmeyenlere tarih uydurulmaz.
const PEOPLE = [
  { key: "sanver", name: "Sanver İmamoğulları", kind: "staff", title: "Antrenör", user: "sanver", seenH: 0.05 },
  { key: "ali", name: "Ali Kök", kind: "staff", title: "Tekne sorumlusu", user: "ali.kok", seenH: 3 },
  { key: "deniz", name: "Deniz Aydın", kind: "staff", title: "Yardımcı antrenör", user: "deniz.aydin", phone: "0532 410 22 33", birthIn: 6, year: 1996, seenH: 20 },
  { key: "elif", name: "Elif Şahin", kind: "staff", title: "Muhasebe", user: "elif.sahin", phone: "0541 225 66 70", birthIn: 34, year: 1991 },
  { key: "murat", name: "Murat Çelik", kind: "staff", title: "Bakım ustası", user: "murat.celik", phone: "0505 318 90 12", birthIn: 71, year: 1984, seenH: 50 },
  { key: "pinar", name: "Pınar Ezgi Yıldız", kind: "family", user: "pinar.yildiz", seenH: 1 },
];

// receipts.js ile aynı hesap (kuruş; birim fiyat KDV dahil)
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

// Veri varken çalışmaz (çift kayıt ve aynı kullanıcı adları olmasın): önce wipeOrg
export async function orgHasData(O) {
  const org = adminDb().collection("orgs").doc(O);
  for (const c of ["members", "plans", "tasks", "notes", "receipts"]) if (!(await org.collection(c).limit(1).get()).empty) return true;
  return false;
}

export async function seedOrg(O, ownerName, { accounts = true } = {}) {
  const db = adminDb();
  const org = db.collection("orgs").doc(O);
  const day = dayFn();
  const password = randomPw();
  const S = {};
  const created = [];

  // Kişiler (+ hesaplar). Hesap kimliği = kişi kimliği
  for (const p of PEOPLE) {
    const ref = org.collection("members").doc();
    const uid = ref.id;
    S[p.key] = uid;
    const birth = p.birthIn != null ? `${p.year}-${day(p.birthIn).slice(5)}` : "";
    let account = false;
    if (accounts) {
      try {
        await adminAuth().createUser({ uid, email: loginEmail(p.user), password, displayName: p.name });
        account = true;
        created.push({ name: p.name, login: p.user });
      } catch (e) {
        // Aynı kullanıcı adı başka bir işletmede kullanılıyor olabilir: kişi hesapsız eklenir
        console.warn("[demo] hesap açılamadı:", p.user, e.code);
      }
    }
    const m = {
      uid, name: p.name, kind: p.kind, role: "staff", status: "active", account, createdAt: iso(24 * 40), ornek: true,
      ...(p.title ? { title: p.title } : {}), ...(p.phone ? { phone: p.phone } : {}), ...(birth ? { birth } : {}),
      ...(account ? { loginName: p.user } : {}), ...(account && p.seenH != null ? { lastSeen: ago(p.seenH) } : {}),
    };
    const b = db.batch();
    b.set(ref, m);
    if (account) {
      b.set(db.collection("users").doc(uid), { name: p.name, email: loginEmail(p.user), role: "staff", kind: p.kind, orgId: O, createdAt: iso(24 * 40), onboarded: true, introV: 99 });
      b.set(org.collection("directory").doc(uid), { name: p.name, role: "staff", kind: p.kind, ...(p.seenH != null ? { lastSeen: ago(p.seenH) } : {}) });
    }
    await b.commit();
  }
  await org.collection("directory").doc(O).set({ name: ownerName, role: "owner", lastSeen: new Date() }, { merge: true });
  const nameOf = (uid) => (uid === O ? ownerName : PEOPLE.find((p) => S[p.key] === uid)?.name || "");

  const who = (creator, assignees = []) => {
    const a = creator === O ? assignees : [creator];
    return { createdByUid: creator, assignees: a, people: [...new Set([creator, ...a])], createdBy: { name: nameOf(creator) } };
  };
  const base = (creator, assignees, hoursAgo, cat = "Genel") => ({ ownerId: O, cat, src: "manual", createdAt: iso(hoursAgo), ornek: true, ...who(creator, assignees) });
  const writes = [];
  const ids = {};
  const put = (col, key, data) => {
    const ref = org.collection(col).doc();
    ids[key] = ref.id;
    writes.push([ref, data]);
  };
  const { sanver, ali, deniz, elif, murat, pinar } = S;

  // Planlar
  const plan = (key, creator, assignees, p) =>
    put("plans", key, {
      ...base(creator, assignees, p.h ?? 48, p.cat), title: p.title, date: p.date, endDate: p.endDate || "", time: p.time || "", allDay: !p.time,
      durationMin: p.time ? 60 : null, tz: TZ, timeSource: p.time ? "user" : "none", place: p.place || "", status: "planned",
    });
  plan("antrenman", O, [sanver, deniz], { title: "Optimist antrenmanı", date: day(0), time: "17:00", place: "Kulüp iskelesi", cat: "Antrenman" });
  plan("bakim", O, [ali, murat], { title: "Tekne bakımı", date: day(0), time: "09:30", place: "Çekek yeri", cat: "Ekipman" });
  plan("ilca", O, [sanver], { title: "ILCA antrenmanı", date: day(1), time: "10:00", place: "Kulüp iskelesi", cat: "Antrenman" });
  plan("veli", O, [sanver, elif], { title: "Veli toplantısı", date: day(2), time: "18:30", place: "Kulüp salonu", cat: "Toplantı" });
  plan("sayim", O, [murat], { title: "Malzeme sayımı", date: day(3), time: "15:00", place: "Depo", cat: "Ekipman" });
  plan("aksam", O, [pinar], { title: "Ailecek akşam yemeği", date: day(4), time: "20:00", place: "Ev", cat: "Genel" });
  plan("kamp", O, [sanver, deniz, ali], { title: "Hafta sonu kampı", date: day(6), endDate: day(7), place: "Urla", cat: "Kamp" });
  plan("yaris", O, [sanver, ali], { title: "Bölge yarışı", date: day(10), place: "Çeşme", cat: "Yarış" });
  plan("kurul", O, [elif], { title: "Yönetim kurulu toplantısı", date: day(14), time: "11:00", place: "Kulüp salonu", cat: "Toplantı" });
  plan("gecen", O, [sanver], { title: "Antrenman", date: day(-3), time: "16:00", place: "Kulüp iskelesi", cat: "Antrenman", h: 24 * 6 });
  plan("foca", O, [ali], { title: "Foça yarışı", date: day(-12), place: "Foça", cat: "Yarış", h: 24 * 16 });

  // Görevler
  const task = (key, creator, assignees, t) =>
    put("tasks", key, {
      ...base(creator, assignees, t.h ?? 30, t.cat), title: t.title, due: t.due ?? null, done: !!t.done, doneAt: t.done ? iso(t.doneH ?? 20) : null,
      planId: t.plan ? ids[t.plan] : null,
    });
  task("sigorta", O, [elif], { title: "Sigorta poliçesini yenile", due: day(-2), h: 24 * 5 });
  task("yelek", O, [deniz], { title: "Can yeleklerini say", due: day(-1), cat: "Ekipman" });
  task("yika", O, [ali], { title: "Tekneleri yıka", due: day(0), cat: "Ekipman", plan: "antrenman" });
  task("teklif", O, [murat], { title: "Yelken onarımı için teklif al", due: day(1), cat: "Ekipman" });
  task("kampListe", O, [deniz], { title: "Kamp ihtiyaç listesini hazırla", due: day(3), cat: "Kamp", plan: "kamp" });
  task("motor", O, [murat, ali], { title: "Motor yağını değiştir", due: day(4), cat: "Ekipman" });
  task("form", O, [sanver], { title: "Yarış kayıt formlarını doldur", due: day(8), cat: "Yarış", plan: "yaris" });
  task("aidat", O, [elif], { title: "Sezon aidat listesini çıkar", due: day(5) });
  task("market", O, [pinar], { title: "Hafta sonu alışverişi", due: day(2) });
  task("romork", ali, [], { title: "Römork lastiklerini kontrol et", due: day(1), cat: "Ekipman", h: 3 });
  task("site", O, [], { title: "Kulüp web sitesini güncelle" });
  task("alan", O, [sanver], { title: "Antrenman alanını temizle", due: day(-1), done: true, doneH: 18 });
  task("davet", O, [elif], { title: "Veli toplantısı davetlerini gönder", due: day(-1), done: true, doneH: 26, plan: "veli" });

  // Notlar
  const note = (key, creator, assignees, n) =>
    put("notes", key, { ...base(creator, assignees, n.h ?? 10, n.cat), title: n.title, body: n.body, tags: [], planId: n.plan ? ids[n.plan] : null, ...(n.pinned ? { pinned: true } : {}) });
  note("gundem", O, [sanver, elif], { title: "Veli toplantısı gündemi", body: "1. Kamp programı\n2. Aidatlar\n3. Yarış takvimi\n4. Ekipman ihtiyaçları", plan: "veli", cat: "Toplantı", pinned: true, h: 26 });
  note("kampNot", O, [deniz], { title: "Kamp için ihtiyaçlar", body: "Çadır 6 adet, ilk yardım çantası, yedek halat, 20 kişilik mutfak malzemesi.", plan: "kamp", cat: "Kamp", h: 30 });
  note("dumen", sanver, [], { title: "3 numaralı Optimist", body: "Dümen yuvası gevşek, antrenmandan önce sıkılması gerekiyor.", cat: "Ekipman", h: 2 });
  note("servis", murat, [], { title: "Motor servisi", body: "Servis cuma günleri kapalı; parçalar salı günü gelecek.", h: 22 });
  note("kurul", O, [], { title: "Yönetim kurulu kararları", body: "Rıhtım başvurusu yapılacak. Sezon sonu kupası için bütçe ayrıldı.", cat: "Toplantı", h: 24 * 8 });
  note("ev", O, [pinar], { title: "Ev için", body: "Kombi bakımı ekim sonunda. Çocukların okul servisi ücreti ödenecek.", h: 6 });

  // Fişler (çalışan/aile fişleri ödeme bekler; birkaçı ödendi)
  const receipt = (key, creator, r) => {
    const items = r.items.map(([n, q, tl, rate]) => ({ n, q, u: Math.round(tl * 100), r: rate }));
    const body = {
      merchant: r.merchant, taxId: r.taxId || "", address: "", docType: r.docType || "fis", docNo: r.docNo || "", date: r.date, time: r.time || "",
      items, totals: calcTotals(items), declared: null, declaredVat: null, pay: r.pay, cat: r.cat, note: r.note || "", conf: null, status: "ok",
    };
    const pay = creator === O ? { payStatus: null } : r.paid ? { payStatus: "paid", paidAt: iso(r.paidH), paidBy: { name: ownerName }, paySeenAt: null } : { payStatus: "pending" };
    put("receipts", key, { ...body, ...base(creator, [], r.h ?? 24), cat: r.cat, hasImage: false, ...pay });
  };
  receipt("migros", O, { merchant: "Migros", date: day(-2), time: "18:42", pay: "Kart", cat: "Market", items: [["Su 5 L", 6, 32.5, 1], ["Muz kg", 2, 64.9, 1], ["Kahve", 1, 189.9, 10]] });
  receipt("shell", O, { merchant: "Shell", date: day(-4), time: "08:15", pay: "Kart", cat: "Yakıt", items: [["Kurşunsuz benzin 95 (L)", 38.5, 44.62, 20]] });
  receipt("malzeme", O, { merchant: "Deniz Malzemeleri Ltd.", docType: "fatura", docNo: "DM2026-0412", date: day(-6), pay: "Havale", cat: "Ekipman", items: [["Can yeleği (çocuk)", 4, 1250, 20], ["Halat 10 mm (m)", 30, 42.5, 20]] });
  receipt("sanverMarket", sanver, { merchant: "BİM", date: day(-1), time: "12:30", pay: "Nakit", cat: "Market", h: 20, note: "Antrenman sonrası su ve meyve", items: [["Su 0,5 L", 24, 7.5, 1], ["Elma kg", 3, 39.9, 1]] });
  receipt("aliTamir", ali, { merchant: "Usta Tekne Tamir", date: day(-2), pay: "Nakit", cat: "Bakım", h: 40, items: [["Pervane tamiri", 1, 1750, 20], ["İşçilik", 1, 600, 20]] });
  receipt("muratParca", murat, { merchant: "Marin Yedek Parça", date: day(-3), pay: "Kart", cat: "Bakım", h: 60, items: [["Yağ filtresi", 2, 240, 20], ["Motor yağı 4 L", 1, 980, 20]] });
  receipt("denizYakit", deniz, { merchant: "Opet", date: day(-5), pay: "Kart", cat: "Yakıt", h: 24 * 5, paid: true, paidH: 30, items: [["Motorin (L)", 20, 46.1, 20]] });
  receipt("pinarMarket", pinar, { merchant: "A101", date: day(0), time: "11:20", pay: "Kart", cat: "Market", h: 4, items: [["Süt 1 L", 4, 38.5, 1], ["Ekmek", 2, 15, 1], ["Deterjan", 1, 219.9, 20]] });

  // Doğum günleri (ana hesabın takvimi; kişiye bağlı olanlar memberUid ile)
  const md = (n) => { const d = day(n); return { month: +d.slice(5, 7), day: +d.slice(8, 10) }; };
  const bday = (key, b) => put("birthdays", key, { ...base(O, [], 24 * 3), name: b.name, ...md(b.in), year: b.year || null, memberUid: b.member || null, note: b.note || "", phone: b.phone || "" });
  bday("deniz", { name: "Deniz Aydın", in: 6, year: 1996, member: deniz, note: "Çalışan", phone: "0532 410 22 33" });
  bday("elif", { name: "Elif Şahin", in: 34, year: 1991, member: elif, note: "Çalışan", phone: "0541 225 66 70" });
  bday("murat", { name: "Murat Çelik", in: 71, year: 1984, member: murat, note: "Çalışan", phone: "0505 318 90 12" });
  bday("teyze", { name: "Ayşe Teyze", in: 1, year: 1962, note: "Çiçek gönder" });

  // Ders programı (haftalık; 1 = pazartesi)
  [
    ["Yelken teorisi", 1, "18:00", "19:30", "Kulüp salonu", "Sanver İmamoğulları"],
    ["Meteoroloji", 3, "18:00", "19:00", "Kulüp salonu", "Deniz Aydın"],
    ["Pratik (denizde)", 6, "10:00", "13:00", "Kulüp iskelesi", "Sanver İmamoğulları"],
  ].forEach(([title, d, start, end, place, teacher], i) =>
    put("lessons", `ders${i}`, { ...base(O, [], 24 * 7), title, day: d, start, end, place, teacher }),
  );

  for (let i = 0; i < writes.length; i += 400) {
    const b = db.batch();
    writes.slice(i, i + 400).forEach(([ref, data]) => b.set(ref, data));
    await b.commit();
  }

  // Sohbetler: Ekip ve Aile gruplarında birkaç mesaj
  const chat = async (cid, msgs) => {
    const cref = org.collection("chats").doc(cid);
    const b = db.batch();
    msgs.forEach(([by, text, minAgo], i) => b.set(cref.collection("messages").doc(), { by, text, at: ago(minAgo / 60), n: i + 1 }));
    const [by, text, minAgo] = msgs.at(-1);
    b.set(cref, { type: "team", seq: msgs.length, last: { text, by, at: ago(minAgo / 60) }, read: { [O]: msgs.length - 1 }, createdAt: ago(48) });
    await b.commit();
  };
  await chat("team", [
    [O, "Günaydın, bugün 17:00 antrenmanı var. Tekneler hazır mı?", 180],
    [ali, "Hazırlıyorum, 3 numaralı Optimist'in dümenine bakacağım.", 150],
    [sanver, "Ben 16:30'da iskelede olurum.", 40],
  ]);
  await chat("family", [
    [O, "Akşam yemeğini perşembe yapalım mı?", 300],
    [pinar, "Olur, ben alışverişi hallederim.", 90],
  ]);

  return { password: accounts ? password : "", accounts: created, counts: { people: PEOPLE.length, records: writes.length } };
}
