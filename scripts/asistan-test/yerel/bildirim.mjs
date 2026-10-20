// Bildirim testi: ana hesap, çalışan, sporcu, veli ve aile hesaplarına giden bildirimler (npm run test:bildirim).
// Gerçek sunucu kodu (/api/notify, pushSend, bildirim kutusu, 5 dakikalık zamanlayıcı) sahte Firestore ve sahte
// telefonlarla çalışır (taklit-sunucu.mjs). Hiçbir yere bağlanmaz, gerçek veriye dokunmaz, kimseye bildirim gitmez.
// Senaryolar insanların gerçek davranışına göre: görev verme, birinin kayıt eklemesi, mesajlaşma, sessize alma,
// sohbet açıkken yazma, iptal, tamamlama, yoklama, aidat, fitness programı, fiş, uygulamayı silen telefon, yanlış anahtar,
// aynı telefonu iki hesapta kullanma, hesabı ya da telefonu olmayan kişi, hatırlatmanın iki kez gitmemesi.
import { suite } from "./ortak.mjs";

// Sahte ortam değerleri (gerçek anahtar değil; yalnız "ayar var mı" denetimi geçsin diye)
Object.assign(process.env, {
  FIREBASE_CLIENT_EMAIL: "test@ornek.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-proje",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-acik-anahtar",
  VAPID_PRIVATE_KEY: "test-ozel-anahtar",
});

const F = (globalThis.__fake ||= { store: new Map(), sent: [], fail: {}, apps: [] });
const { ts, clone } = await import("../taklit-sunucu.mjs");
const { POST } = await import("@/app/api/notify/route");
const inbox = await import("@/lib/inbox");
const sched = (await import("../../../netlify/functions/plan-reminders.mjs")).default;

const { group } = suite("bildirim");
const quiet = (fn) => async (...a) => {
  const e = console.error, l = console.log;
  console.error = console.log = () => {};
  try {
    return await fn(...a);
  } finally {
    console.error = e;
    console.log = l;
  }
};
const call = quiet(async (uid, body) => (await POST({ uid, json: async () => body })).body);
const run = quiet(async () => (await sched()).text());
const get = (p) => F.store.get(p);
const put = (p, d) => F.store.set(p, clone(d));
const to = (e) => F.sent.filter((x) => x.to === e);
const sentTo = (e) => to(e).length;
const nowIso = () => new Date().toISOString();

// Kişiler: ana hesap Seyhun; Ali çalışan; Mete sporcu (Android telefon); Ayşe veli; Eda aile; Kaan çalışan (telefon kaydı yok);
// "ikinci" ana hesabın telefonunu kullanan deneme hesabı; "yok" uygulamada hesabı olmayan kişi.
function reset() {
  F.store.clear();
  F.sent.length = 0;
  for (const k of Object.keys(F.fail)) delete F.fail[k];
  const staff = (name, kind, push) => ({ role: "staff", orgId: "own", name, kind, push });
  put("users/own", { role: "owner", name: "Seyhun", reminders: { on: true, lead: 60 }, push: { "k-own": { endpoint: "e-own", keys: {} } } });
  put("users/ali", staff("Ali", "staff", { "k-ali": { endpoint: "e-ali", keys: {} } }));
  put("users/mete", staff("Mete", "athlete", { "k-mete": { fcm: "t-mete", app: "android" } }));
  put("users/veli", staff("Ayşe", "parent", { "k-veli": { endpoint: "e-veli", keys: {} } }));
  put("users/es", staff("Eda", "family", { "k-es": { endpoint: "e-es", keys: {} } }));
  put("users/kisi", staff("Kaan", "staff", {}));
  put("users/ikinci", staff("Deneme", "staff", { "k-own": { endpoint: "e-own", keys: {} } }));
  for (const [id, kind] of [["ali", "staff"], ["mete", "athlete"], ["veli", "parent"], ["es", "family"], ["kisi", "staff"]]) put(`orgs/own/members/${id}`, { kind });
}

const rows = {}; // grup adı → [[söz, beklenen, değer, denetim]]
const add = (g, say, desc, got, ok = (x) => x === true) => (rows[g] ||= []).push([say, desc, got, ok]);
const plan = (id, d) => put(`orgs/own/plans/${id}`, { title: "Antrenman", date: "2026-10-20", time: "10:00", createdByUid: "own", createdAt: nowIso(), ...d });

// ---------------- Görev / plan verme ----------------
{
  const G = "Görev verme (ana hesap → çalışan, sporcu)";
  reset();
  plan("p1", { assignees: ["ali"], people: ["ali"] });
  let r = await call("own", { kind: "plan", id: "p1" });
  add(G, "Seyhun Ali'ye antrenman planı verdi", "Ali'nin telefonuna 1 bildirim, Seyhun'a gitmez", sentTo("e-ali") === 1 && sentTo("e-own") === 0 && r.sent === 1);
  add(G, "bildirim metni", "\"Antrenman\" geçiyor, plana dokununca açılır", /Antrenman/.test(JSON.stringify(to("e-ali")[0]?.payload)) && to("e-ali")[0]?.payload.url === "/?open=plan:p1");
  add(G, "plan kaydı", "notified.ali ve ack.ali.s yazıldı (iletildi)", !!get("orgs/own/plans/p1").notified?.ali && !!get("orgs/own/plans/p1").ack?.ali?.s);
  add(G, "Ali'nin zili", "Ali'nin bildirim kutusunda görünür", (get("users/ali").inbox || []).length === 1);
  r = await call("own", { kind: "plan", id: "p1" });
  add(G, "plan yeniden kaydedildi", "Ali'ye ikinci kez gitmez", r.sent === 0 && sentTo("e-ali") === 1);

  F.sent.length = 0;
  put("orgs/own/tasks/t1", { title: "Tekneleri yıka", due: "2026-10-20", createdByUid: "own", createdAt: nowIso(), assignees: ["mete"] });
  r = await call("own", { kind: "task", id: "t1" });
  add(G, "Seyhun sporcu Mete'ye görev verdi (Android)", "Mete'nin Android telefonuna gider", F.sent.some((x) => x.to === "t-mete" && x.android) && r.sent === 1);

  F.sent.length = 0;
  put("orgs/own/notes/n1", { title: "Malzeme listesi", createdByUid: "own", createdAt: nowIso(), assignees: ["es"] });
  r = await call("own", { kind: "note", id: "n1" });
  add(G, "Seyhun eşine (aile) not verdi", "Eda'ya gider", sentTo("e-es") === 1 && r.sent === 1);

  F.sent.length = 0;
  plan("p2", { assignees: ["ali", "veli"] });
  r = await call("own", { kind: "plan", id: "p2" });
  add(G, "iki kişiye birden verildi", "ikisine de gider", sentTo("e-ali") === 1 && sentTo("e-veli") === 1 && r.sent === 2);

  r = await call("ali", { kind: "plan", id: "p1" });
  add(G, "Ali başkasının planı için bildirim istedi", "yetki yok (403)", r.error === "Yetki yok");
}

// ---------------- Çalışanın, sporcunun eklediği kayıt ----------------
{
  const G = "Kişinin eklediği kayıt (ana hesaba)";
  reset();
  put("orgs/own/tasks/t2", { title: "Römork lastiği", createdByUid: "ali", createdAt: nowIso() });
  let r = await call("ali", { kind: "task", id: "t2" });
  const p = to("e-own")[0]?.payload;
  add(G, "Ali görev ekledi", "Seyhun'a \"… ekledi\" bildirimi", r.sent === 1 && /ekledi/.test(`${p?.title} ${p?.body}`));
  r = await call("ali", { kind: "task", id: "t2" });
  add(G, "Ali aynı görevi yeniden kaydetti", "Seyhun'a ikinci kez gitmez", r.sent === 0 && sentTo("e-own") === 1);
  put("orgs/own/tasks/t3", { title: "Eski görev", createdByUid: "ali", createdAt: new Date(Date.now() - 10 * 60e3).toISOString() });
  r = await call("ali", { kind: "task", id: "t3" });
  add(G, "Ali 10 dakika önce eklediği görevi düzenledi", "\"yeni kayıt\" bildirimi gitmez", r.sent === 0);
  put("orgs/own/plans/p3", { title: "Antrenman", createdByUid: "mete", createdAt: nowIso() });
  r = await call("mete", { kind: "plan", id: "p3" });
  add(G, "sporcu Mete plan ekledi", "Seyhun'a gider", r.sent === 1);
}

// ---------------- Telefona gitmeyen bildirim ----------------
{
  const G = "Gitmeyen bildirim ve nedeni";
  reset();
  plan("p1", { assignees: ["yok", "kisi", "ikinci"] });
  const r = await call("own", { kind: "plan", id: "p1" });
  const why = Object.fromEntries((r.fail || []).map((x) => [x.u, x.why]));
  add(G, "uygulamada hesabı olmayan kişiye görev", "neden: hesap yok (account)", why.yok === "account", (x) => x);
  add(G, "telefonunda bildirim açık olmayan Kaan", "neden: cihaz yok (device)", why.kisi === "device");
  add(G, "Seyhun'un telefonunu kullanan deneme hesabı", "Seyhun'un telefonuna gitmez, neden: aynı telefon (same)", why.ikinci === "same" && sentTo("e-own") === 0);
  add(G, "plan ekranı", "Kaan için ack.kisi.x yazıldı (\"Bildirim gitmedi\")", get("orgs/own/plans/p1").ack?.kisi?.x?.why === "device" && !get("orgs/own/plans/p1").notified?.kisi);

  reset();
  F.fail["e-ali"] = 410;
  plan("p2", { assignees: ["ali"] });
  let r2 = await call("own", { kind: "plan", id: "p2" });
  add(G, "Ali uygulamayı silmiş (abonelik bitmiş)", "telefon kaydı silinir, gitmedi yazılır", !get("users/ali").push?.["k-ali"] && r2.fail?.[0]?.why === "device");

  reset();
  F.fail["e-veli"] = 403;
  plan("p3", { assignees: ["veli"] });
  r2 = await call("own", { kind: "plan", id: "p3" });
  add(G, "VAPID anahtarı uyuşmuyor", "neden \"anahtar\" diye yazılır, telefon kaydı silinmez", r2.fail?.[0]?.why === "error" && /anahtar/i.test(r2.fail?.[0]?.msg || "") && !!get("users/veli").push?.["k-veli"]?.err);

  delete F.fail["e-veli"];
  r2 = await call("own", { kind: "plan", id: "p3", retry: true });
  add(G, "Yeniden gönder (anahtar düzeldi)", "gider, \"gitmedi\" işareti kalkar", r2.sent === 1 && !get("orgs/own/plans/p3").ack?.veli?.x && !!get("orgs/own/plans/p3").ack?.veli?.s);
  r2 = await call("own", { kind: "plan", id: "p3", retry: true });
  add(G, "Yeniden gönder'e ikinci kez basıldı", "giden kişiye tekrar gitmez", r2.sent === 0);
}

// ---------------- Mesajlar ----------------
{
  const G = "Mesajlar";
  reset();
  const msg = (cid, mid, by, text, ago = 0) => put(`orgs/own/chats/${cid}/messages/${mid}`, { by, text, at: ts(Date.now() - ago) });
  put("orgs/own/chats/dm1", { type: "dm", members: ["own", "ali"] });
  msg("dm1", "m1", "own", "Yarın 9'da iskelede ol");
  let r = await call("own", { event: "chat", chat: "dm1", mid: "m1" });
  const p = to("e-ali")[0]?.payload;
  add(G, "Seyhun Ali'ye yazdı", "Ali'ye gider, başlıkta Seyhun", r.sent === 1 && p?.title === "Seyhun" && /iskelede/.test(p?.body) && sentTo("e-own") === 0);

  F.sent.length = 0;
  put("orgs/own/chats/athletes", { type: "group" });
  msg("athletes", "m2", "own", "Cumartesi antrenman 10:00");
  r = await call("own", { event: "chat", chat: "athletes", mid: "m2" });
  add(G, "Sporcular grubuna yazıldı", "Ali (antrenör), Mete, veli Ayşe alır; aile Eda almaz", sentTo("e-ali") === 1 && F.sent.some((x) => x.to === "t-mete") && sentTo("e-veli") === 1 && sentTo("e-es") === 0);
  add(G, "grup bildirim metni", "\"Seyhun: …\" ve grup adı Sporcular", to("e-veli")[0]?.payload.title === "Sporcular" && /^Seyhun: /.test(to("e-veli")[0]?.payload.body));

  F.sent.length = 0;
  put("orgs/own/chats/team", { type: "group" });
  msg("team", "m3", "own", "Toplantı 18:00");
  r = await call("own", { event: "chat", chat: "team", mid: "m3" });
  add(G, "Ekip grubuna yazıldı", "yalnız çalışanlar (Ali) alır", sentTo("e-ali") === 1 && sentTo("e-veli") === 0 && sentTo("e-es") === 0 && !F.sent.some((x) => x.to === "t-mete"));

  F.sent.length = 0;
  put("orgs/own/chats/family", { type: "group" });
  msg("family", "m4", "es", "Akşam yemeği 8'de");
  r = await call("es", { event: "chat", chat: "family", mid: "m4" });
  add(G, "Eda Aile grubuna yazdı", "Seyhun alır, Eda'nın kendisine gitmez", sentTo("e-own") === 1 && sentTo("e-es") === 0);

  F.sent.length = 0;
  put("orgs/own/chats/athletes", { type: "group", muted: { veli: true } });
  msg("athletes", "m5", "own", "Yağmur var, iptal");
  await call("own", { event: "chat", chat: "athletes", mid: "m5" });
  add(G, "veli Ayşe grubu sessize almış", "Ayşe'ye gitmez, diğerlerine gider", sentTo("e-veli") === 0 && sentTo("e-ali") === 1);

  F.sent.length = 0;
  put("users/ali", { ...get("users/ali"), viewing: { key: "chat-dm1", at: nowIso() } });
  msg("dm1", "m6", "own", "Geliyor musun?");
  await call("own", { event: "chat", chat: "dm1", mid: "m6" });
  add(G, "Ali o an sohbeti açmış okuyor", "Ali'ye bildirim gitmez", sentTo("e-ali") === 0);
  put("users/ali", { ...get("users/ali"), viewing: { key: "chat-dm1", at: new Date(Date.now() - 5 * 60e3).toISOString() } });
  msg("dm1", "m7", "own", "Cevap ver");
  await call("own", { event: "chat", chat: "dm1", mid: "m7" });
  add(G, "Ali 5 dakika önce sohbetten çıkmış", "Ali'ye gider", sentTo("e-ali") === 1);

  msg("dm1", "m8", "own", "Eski mesaj", 10 * 60e3);
  r = await call("own", { event: "chat", chat: "dm1", mid: "m8" });
  add(G, "eski mesaj için yeniden bildirim istendi", "gönderilmez", r.skipped === "mesaj yok");
  msg("dm1", "m9", "ali", "Ben yazdım");
  r = await call("own", { event: "chat", chat: "dm1", mid: "m9" });
  add(G, "Seyhun Ali'nin mesajı için bildirim istedi", "gönderilmez (mesaj onun değil)", r.skipped === "mesaj yok");
  put("orgs/own/chats/dm2", { type: "dm", members: ["own", "veli"] });
  msg("dm2", "m10", "ali", "Merhaba");
  r = await call("ali", { event: "chat", chat: "dm2", mid: "m10" });
  add(G, "Ali üyesi olmadığı sohbete bildirim istedi", "yetki yok (403)", r.error === "Yetki yok");
}

// ---------------- Kayıt değişti, iptal, tamamlandı, silindi ----------------
{
  const G = "Değişiklik, iptal, tamamlama, silme";
  reset();
  plan("p1", { people: ["ali"], assignees: ["ali"], updatedAt: nowIso(), time: "11:00" });
  let r = await call("own", { kind: "plan", id: "p1", event: "changed" });
  add(G, "Seyhun antrenmanı 11'e aldı", "Ali'ye \"değişti\" bildirimi, Seyhun'a gitmez", r.sent === 1 && sentTo("e-own") === 0);
  F.sent.length = 0;
  plan("p2", { people: ["ali", "veli"], updatedAt: nowIso(), status: "cancelled", cancelReason: "wind" });
  r = await call("own", { kind: "plan", id: "p2", event: "changed" });
  add(G, "rüzgâr yüzünden antrenman iptal", "Ali ve Ayşe'ye \"iptal\" bildirimi", r.sent === 2 && /iptal/i.test(JSON.stringify(to("e-ali")[0]?.payload)));
  plan("p3", { people: ["ali"], updatedAt: new Date(Date.now() - 10 * 60e3).toISOString() });
  r = await call("own", { kind: "plan", id: "p3", event: "changed" });
  add(G, "değişiklik 10 dakika önceydi", "gönderilmez", r.skipped === "değişiklik yok");
  r = await call("veli", { kind: "plan", id: "p1", event: "changed" });
  add(G, "veli başkasının planını değiştirdi diye bildirim istedi", "yetki yok (403)", r.error === "Yetki yok");

  F.sent.length = 0;
  put("orgs/own/tasks/t1", { title: "Motor yağı", createdByUid: "own", assignees: ["ali"], doneBy: { ali: nowIso() } });
  r = await call("ali", { kind: "task", id: "t1", event: "done" });
  add(G, "Ali görevi tamamladı", "Seyhun'a \"tamamlandı\" gider, Ali'ye gitmez", r.sent === 1 && sentTo("e-own") === 1 && sentTo("e-ali") === 0);
  r = await call("veli", { kind: "task", id: "t1", event: "done" });
  add(G, "ilgisi olmayan veli \"tamamlandı\" dedi", "yetki yok (403)", r.error === "Yetki yok");

  F.sent.length = 0;
  r = await call("own", { kind: "plan", id: "p1", event: "deleted" });
  const r2 = await call("ali", { kind: "plan", id: "p1", event: "deleteReq" });
  add(G, "plan silindi / Ali silme isteği gönderdi", "kimseye bildirim gitmez (Seyhun'un kuralı)", F.sent.length === 0 && !!r.skipped && !!r2.skipped);
  r = await call("own", { kind: "plan", id: "p1", event: "reply" });
  add(G, "eski uygulama kayda mesaj bildirimi istedi", "gönderilmez (kayıtta mesaj yok)", F.sent.length === 0 && !!r.skipped);
}

// ---------------- Sporcu ve veli: yoklama, aidat, fitness ----------------
{
  const G = "Sporcu ve veli bildirimleri";
  reset();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  put("orgs/own/athleteAtt/m1", { name: "Deniz", athleteId: "a1", parents: ["veli"], att: { [today]: "absent" } });
  let r = await call("own", { event: "absent", date: today, ids: ["m1"] });
  add(G, "Deniz antrenmana gelmedi, veliye haber", "veli Ayşe'ye gider", r.sent === 1 && sentTo("e-veli") === 1);
  r = await call("own", { event: "absent", date: today, ids: ["m1"] });
  add(G, "Seyhun düğmeye ikinci kez bastı", "aynı gün ikinci kez gitmez", r.sent === 0 && sentTo("e-veli") === 1);
  r = await call("ali", { event: "absent", date: today, ids: ["m1"] });
  add(G, "çalışan Ali velilere haber vermek istedi", "yalnız ana hesap (403)", r.error === "Yetki yok");

  F.sent.length = 0;
  const ym = today.slice(0, 7);
  put("orgs/own/dues/settings", { fee: 1500, roster: [{ id: "a1", studentName: "Deniz Şahin" }, { id: "a2", studentName: "Can Kaya" }] });
  put(`orgs/own/dues/${ym}`, { paid: { a2: [{ amt: 1500, via: "eft", date: today }] } });
  put("orgs/own/athleteAtt/m2", { name: "Can", athleteId: "a2", parents: ["veli"] });
  r = await call("own", { event: "dues", ym, ids: ["m1", "m2"] });
  add(G, "aidat hatırlatması (Deniz ödemedi, Can ödedi)", "yalnız Deniz için veliye gider", r.sent === 1 && /Deniz/.test(JSON.stringify(to("e-veli")[0]?.payload)));
  r = await call("own", { event: "dues", ym, ids: ["m1"] });
  add(G, "aidat hatırlatmasına ikinci kez basıldı", "aynı ay ikinci kez gitmez", r.sent === 0);

  F.sent.length = 0;
  put("orgs/own/fitPrograms/f1", { for: "mete", title: "Kuvvet programı" });
  r = await call("own", { event: "fitProgram", id: "f1" });
  add(G, "Seyhun Mete'ye fitness programı hazırladı", "Mete'nin telefonuna gider", r.sent === 1 && F.sent.some((x) => x.to === "t-mete"));
  r = await call("own", { event: "fitProgram", id: "f1" });
  add(G, "program yeniden kaydedildi", "Mete'ye ikinci kez gitmez", r.skipped === "gönderildi");
  r = await call("mete", { event: "fitProgram", id: "f1" });
  add(G, "sporcu kendine program bildirimi istedi", "yalnız ana hesap (403)", r.error === "Yetki yok");

  r = await call("ali", { event: "attTaken", date: today });
  add(G, "çalışan Ali bugünün yoklamasını aldı", "ana hesaba \"alındı\" yazılır (hatırlatma gelmez)", r.ok === true && get("users/own").attLast === today);
  F.store.set("users/own", { ...get("users/own"), attLast: "" });
  r = await call("ali", { event: "attTaken", date: "2020-01-01" });
  add(G, "eski bir günün yoklaması kaydedildi", "\"alındı\" yazılmaz", r.skipped === "bugün değil" && get("users/own").attLast === "");
}

// ---------------- Fişler ----------------
{
  const G = "Fiş bildirimleri";
  reset();
  put("orgs/own/receipts/r1", { merchant: "Migros", total: 245.9, createdByUid: "ali", createdAt: nowIso(), payStatus: "pending" });
  let r = await call("ali", { receiptId: "r1", event: "new" });
  add(G, "Ali fiş ekledi (ödeme bekliyor)", "Seyhun'a gider", r.sent === 1 && sentTo("e-own") === 1);
  put("orgs/own/receipts/r2", { merchant: "Shell", total: 1000, createdByUid: "own", createdAt: nowIso(), payStatus: "paid" });
  r = await call("own", { receiptId: "r2", event: "new" });
  add(G, "Seyhun kendi fişini ekledi", "kimseye gitmez", !!r.skipped);
  F.sent.length = 0;
  put("orgs/own/receipts/r1", { ...get("orgs/own/receipts/r1"), payStatus: "paid" });
  r = await call("own", { receiptId: "r1" });
  add(G, "Seyhun Ali'nin fişini ödedi", "Ali'ye \"ödendi\" gider", r.sent === 1 && sentTo("e-ali") === 1);
  r = await call("ali", { receiptId: "r1" });
  add(G, "Ali fişi ödendi diye bildirim istedi", "yalnız ana hesap (403)", r.error === "Yalnızca ana hesap");
}

// ---------------- Bildirim kutusu (zil) ve simge sayısı ----------------
{
  const G = "Bildirim kutusu (zil) ve simge sayısı";
  let list = [];
  const t = (m) => new Date(Date.UTC(2026, 9, 14, 8, m)).toISOString();
  list = inbox.inboxAdd(list, { title: "Görev", tag: "task-1" }, t(0));
  list = inbox.inboxAdd(list, { title: "Mesaj", tag: "chat-a" }, t(1));
  list = inbox.inboxAdd(list, { title: "Mesaj 2", tag: "chat-a" }, t(2));
  add(G, "aynı sohbetten iki mesaj geldi", "zilde tek satır (son mesaj)", list.length === 2 && list[0].title === "Mesaj 2");
  add(G, "hiç açılmadı", "simgede 2", inbox.inboxBadge(list, "") === 2);
  add(G, "zil açıldı (görüldü)", "simge 0", inbox.inboxBadge(list, t(3)) === 0);
  list = inbox.inboxAdd(list, { title: "Yeni", tag: "task-9" }, t(4));
  add(G, "açtıktan sonra bir bildirim daha geldi", "simgede 1", inbox.inboxBadge(list, t(3)) === 1);
  // Seyhun: "mesaj geldi, Mesajlar'dan açıp okudum, zildeki bildirim kaldı" (zili açmadan, işi başka yoldan görünce)
  let k = [];
  k = inbox.inboxAdd(k, { title: "Ali Kaya", body: "Yarın gel", tag: "chat-c1", url: "/messages?c=c1" }, t(0));
  k = inbox.inboxAdd(k, { title: "Yeni görev: Motor", tag: "task-T1", url: "/?open=task:T1" }, t(1));
  k = inbox.inboxAdd(k, { title: "Fiş ödendi", tag: "paid-R1", url: "/receipts/R1" }, t(2));
  let s1 = inbox.inboxSeeOne(k, { tag: "chat-c1" }, "", t(5));
  add(G, "mesajı zile dokunmadan Mesajlar'dan okudu", "o bildirim görüldü, simge 3 → 2", inbox.inboxBadge(k, "") === 3 && inbox.inboxBadge(s1, "") === 2 && !inbox.inboxUnread(s1, "").some((x) => x.tag === "chat-c1"));
  s1 = inbox.inboxSeeOne(s1, { id: "T1" }, "", t(6));
  add(G, "görevi Görevler listesinden açtı", "görev bildirimi de görüldü, simge 1", inbox.inboxBadge(s1, "") === 1);
  s1 = inbox.inboxSeeOne(s1, { here: "/receipts/R1" }, "", t(7));
  add(G, "fişin sayfasına başka yoldan gitti", "fiş bildirimi de görüldü, simge 0", inbox.inboxBadge(s1, "") === 0);
  add(G, "başka bir sohbeti açtı", "bildirim değişmez, yazma gerekmez", inbox.inboxSeeOne(k, { tag: "chat-c2" }, "", t(5)) === k);
  const k2 = inbox.inboxAdd(s1, { title: "Ali Kaya", body: "Bir şey daha", tag: "chat-c1", url: "/messages?c=c1" }, t(8));
  add(G, "okuduktan sonra aynı sohbetten yeni mesaj geldi", "yeniden okunmamış, simge 1", inbox.inboxBadge(k2, "") === 1);
  add(G, "zil açıldıktan sonra sohbeti okudu", "zaten görülmüş, yazma gerekmez", inbox.inboxSeeOne(k2, { tag: "chat-c1" }, t(9), t(10)) === k2);

  let big = [];
  for (let i = 0; i < 40; i++) big = inbox.inboxAdd(big, { title: `B${i}`, tag: `t-${i}` }, t(10 + i));
  add(G, "40 bildirim birikti", `zil en çok ${inbox.INBOX_MAX} tutar, en yenisi üstte`, big.length === inbox.INBOX_MAX && big[0].title === "B39");

  reset();
  put("users/ali", { ...get("users/ali"), inbox: [], inboxSeen: "" });
  for (const id of ["p1", "p2"]) plan(id, { assignees: ["ali"] });
  await call("own", { kind: "plan", id: "p1" });
  await call("own", { kind: "plan", id: "p2" });
  const last = to("e-ali").at(-1)?.payload;
  add(G, "Ali'ye iki plan verildi", "zilde 2 satır, telefondaki simge sayısı 2", (get("users/ali").inbox || []).length === 2 && last?.badge === 2);
  plan("p3", { assignees: ["yok"] });
  await call("own", { kind: "plan", id: "p3" });
  add(G, "hesabı olmayan kişiye plan verildi", "olmayan hesaba zil yazılmaz", !get("users/yok"));
}

// ---------------- Zamanlayıcı: plan hatırlatmaları ----------------
{
  const G = "Plan hatırlatmaları (5 dakikalık zamanlayıcı)";
  reset();
  const at = (min) => {
    const d = new Date(Date.now() + min * 60e3);
    const date = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    const time = d.toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false });
    return { date, time };
  };
  put("users/ali", { ...get("users/ali"), reminders: { on: true, lead: 60 } });
  put("orgs/own/plans/pA", { title: "Toplantı", ...at(40) });
  put("orgs/own/plans/pB", { title: "Antrenman", people: ["ali"], ...at(45) });
  put("orgs/own/plans/pC", { title: "İptal antrenman", status: "cancelled", ...at(40) });
  put("orgs/own/plans/pD", { title: "Tekne yükleme", remind: 30, people: ["kisi", "yok"], ...at(20) });
  put("orgs/own/plans/pF", { title: "Mete fitness", fit: { for: "mete" }, ...at(40) });
  put("orgs/own/plans/pG", { title: "Ali'siz plan", ...at(300) });
  await run();
  const tags = (e) => to(e).map((x) => x.payload.tag);
  add(G, "40 dakika sonra toplantı (1 saat önce hatırlat)", "Seyhun'a hatırlatma gider", tags("e-own").includes("remind-pA"));
  add(G, "Ali'nin de olduğu antrenman", "Seyhun ve Ali'ye gider", tags("e-own").includes("remind-pB") && tags("e-ali").includes("remind-pB"));
  add(G, "Ali'nin olmadığı toplantı", "çalışan Ali'ye gitmez", !tags("e-ali").includes("remind-pA"));
  add(G, "iptal edilen antrenman", "hatırlatma gitmez", !F.sent.some((x) => x.payload?.tag === "remind-pC"));
  add(G, "planda \"Hatırlat: 30 dk\" (20 dk kaldı)", "Seyhun'a bir kez gider", tags("e-own").filter((x) => x === "remind-pD").length === 1);
  const fail = get("orgs/own/plans/pD").remindFail || {};
  add(G, "plandaki Kaan'ın telefonu kayıtlı değil", "planda \"Hatırlatma gitmedi\" (device)", fail.kisi?.why === "device");
  add(G, "plandaki kişinin hesabı yok", "planda \"Hatırlatma gitmedi\" (account)", fail.yok?.why === "account");
  add(G, "Mete'nin fitness antrenmanı", "Seyhun'a hatırlatılmaz", !tags("e-own").includes("remind-pF"));
  add(G, "5 saat sonraki plan", "henüz gitmez", !F.sent.some((x) => x.payload?.tag === "remind-pG"));
  const n = F.sent.length;
  await run();
  add(G, "zamanlayıcı 5 dakika sonra yine çalıştı", "aynı hatırlatma ikinci kez gitmez", F.sent.length === n);

  put("users/kisi", { ...get("users/kisi"), push: { "k-kisi": { endpoint: "e-kisi", keys: {} } } });
  const r = await call("own", { kind: "plan", id: "pD", event: "remind" });
  add(G, "Kaan bildirimleri açtı, Seyhun \"Yeniden gönder\"e bastı", "Kaan'a gider, \"gitmedi\" yalnız hesapsız kişide kalır", r.sent === 1 && sentTo("e-kisi") === 1 && !get("orgs/own/plans/pD").remindFail?.kisi && !!get("orgs/own/plans/pD").remindFail?.yok);
}

// ---------------- Bildirim testi (Ayarlar › Testler › Bildirim testi) ----------------
{
  const G = "Bildirim testi (deneme kayıtları)";
  const pt = await import("@/lib/pushTest");
  const api = await import("@/app/api/push-tests/route");
  const ack = (await import("@/app/api/ack/route")).POST;
  const { ackSig } = await import("@/lib/server/pushSend");
  reset();
  const own = () => get("users/own");
  const inbox0 = (own().inbox || []).length;
  const r = quiet(async () => (await api.POST({ uid: "own", json: async () => ({ kind: "task" }) })).body)();
  const id = (await r).id;
  const t = own().pushTests?.[id];
  add(G, "\"Yeni görev\" 30 sn düğmesine basıldı", "deneme kaydı yalnız kişinin belgesinde, 30 sn sonrası için", !!t && Math.abs(Date.parse(t.due) - Date.parse(t.at) - 30e3) < 2000 && own().pushTestAt === t.due);
  add(G, "deneme metni", "gerçek görev metni, sonunda \"Deneme\"", /^Yeni görev: Deneme görevi$/.test(t?.title) && / · Deneme$/.test(t?.body || ""));
  await run();
  add(G, "zaman gelmeden zamanlayıcı çalıştı", "henüz gitmez", !F.sent.some((x) => /^test-/.test(x.payload?.tag || "")));
  put("users/own", { ...own(), pushTests: { [id]: { ...t, due: new Date(Date.now() - 1000).toISOString() } } });
  await run();
  const s = F.sent.filter((x) => x.payload?.tag === `test-${id}`);
  add(G, "30 sn geçti, zamanlayıcı çalıştı", "telefona bir kez gider, \"zamanlayıcı\" yazılır, bekleyen kalmaz", s.length === 1 && s[0].to === "e-own" && own().pushTests[id].via === "zamanlayıcı" && !own().pushTestAt);
  add(G, "zil ve simgedeki sayı", "deneme zile yazılmaz, sayı gönderilmez", (own().inbox || []).length === inbox0 && s[0].payload.badge === undefined);
  await run();
  add(G, "zamanlayıcı yine çalıştı", "ikinci kez gitmez", F.sent.filter((x) => x.payload?.tag === `test-${id}`).length === 1);
  const a = s[0].payload.ack;
  await quiet(ack)({ json: async () => a });
  add(G, "telefon bildirimi aldı (onay)", "\"Ulaştı\" zamanı yazılır", !!own().pushTests[id].got);
  const before = own().pushTests[id].got;
  await quiet(ack)({ json: async () => ({ ...a, s: ackSig("own", "pushTests", id, "ali") }) });
  await quiet(ack)({ json: async () => ({ ...a, i: "baska" }) });
  add(G, "imzası tutmayan onay", "kabul edilmez", own().pushTests[id].got === before && !own().pushTests.baska);

  // 1 saat önce hatırlatması: plan ~1 saat 1 dk sonra; hatırlatma zamanı gelince gerçek kuralla gider
  F.sent.length = 0;
  const rm = pt.newTest("remind", { id: "r1", now: new Date(Date.now() - 150e3) });
  put("users/own", { ...own(), pushTests: { r1: rm }, pushTestAt: rm.due });
  const fresh = pt.newTest("remind", { id: "r2" });
  add(G, "\"1 saat önce\" denemesi oluşturuldu", "planın saati 61-62 dk sonra, hatırlatma 30-120 sn içinde", (() => { const w = (Date.parse(fresh.due) - Date.now()) / 1000; return w >= 25 && w <= 120; })());
  add(G, "hatırlatma zamanından önce", "gitmez", pt.testDue(fresh) === false);
  await run();
  const rs = F.sent.find((x) => x.payload?.tag === "test-r1");
  add(G, "hatırlatma zamanı geldi, zamanlayıcı çalıştı", "\"1 saat sonra: Deneme planı\" gider", !!rs && /^1 saat sonra: Deneme planı$/.test(rs.payload.title) && own().pushTests.r1.via === "zamanlayıcı");
  const gone = pt.newTest("remind", { id: "r3", now: new Date(Date.now() - 2 * 3600e3) });
  put("users/own", { ...own(), pushTests: { ...own().pushTests, r3: gone }, pushTestAt: gone.due });
  await run();
  add(G, "plan saati geçti, hatırlatma gitmemişti", "kayda nedeni yazılır, gönderilmez", !!own().pushTests.r3.err && !F.sent.some((x) => x.payload?.tag === "test-r3"));

  put("users/own", { ...own(), pushTests: { ...own().pushTests, eski: { kind: "task", at: new Date(Date.now() - 4 * 3600e3).toISOString(), due: "x", sent: "x" } } });
  await quiet(async () => api.POST({ uid: "own", json: async () => ({ kind: "chat" }) }))();
  add(G, "3 saatten eski deneme", "yeni deneme açılınca silinir", !own().pushTests.eski);
  const rid = (await quiet(async () => (await api.POST({ uid: "own", json: async () => ({ kind: "receipt" }) })).body)()).id;
  F.sent.length = 0;
  await quiet(async () => api.POST({ uid: "own", json: async () => ({ run: rid }) }))();
  add(G, "uygulama açık, 30 sn dolmadan sayfa göndermek istedi", "erken gitmez", !F.sent.some((x) => x.payload?.tag === `test-${rid}`));
  put("users/own", { ...own(), pushTests: { ...own().pushTests, [rid]: { ...own().pushTests[rid], due: new Date(Date.now() - 6000).toISOString() } } });
  await quiet(async () => api.POST({ uid: "own", json: async () => ({ run: rid }) }))();
  await quiet(async () => api.POST({ uid: "own", json: async () => ({ run: rid }) }))();
  add(G, "30 sn geçti, gitmemişti, uygulama açık", "sayfa ister, bir kez gider (yol \"uygulama\")", F.sent.filter((x) => x.payload?.tag === `test-${rid}`).length === 1 && own().pushTests[rid].via === "uygulama");
  const beat = get("system/scheduler") || {};
  add(G, "zamanlayıcı çalıştı", "başlangıç ve bitiş saati yazılır (sayfada \"Zamanlayıcı\" satırı)", !!beat.start && !!beat.end && beat.end >= beat.start);
  const gb = (await quiet(async () => api.GET({ uid: "own" }))()).body;
  add(G, "Bildirim testi sayfası açıldı", "zamanlayıcının son çalışması okunur", gb.end === beat.end);
  await quiet(async () => api.DELETE({ uid: "own" }))();
  add(G, "\"Kaydı temizle\"", "tüm deneme kayıtları silinir", !own().pushTests && !own().pushTestAt);
  add(G, "gerçek planlar", "denemeler plan listesine yazılmaz", ![...F.store.keys()].some((k) => k.startsWith("orgs/own/plans/")));
}

for (const [g, cases] of Object.entries(rows)) group(g)(cases.map(([say, desc, got, ok]) => [say, { desc, fn: () => got, ok }]));
