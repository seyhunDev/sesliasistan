// UYGULAMA TESTİ: uygulamanın yapabildiği her şey, gerçek sisteme karşı (yerelde çalıştırılır).
//
//   node --no-warnings scripts/uygulama-test/calistir.mjs            yerel kurallar + canlı veri/izinler + sunucu uçları
//   ... --yz                                                         + gerçek yapay zekayla asistan cümleleri (~20 istek)
//   ... --sadece yerel | veri | sunucu                               yalnız bir bölüm
//   ... --site https://sesliasistan.netlify.app                      sunucu uçlarının adresi (varsayılan bu)
//
// Hesaplar sorulur (şifre ekranda görünmez, hiçbir yere yazılmaz): ana hesap (e-posta) ve bir çalışan (kullanıcı adı).
// İstersen ortamdan da verebilirsin: TEST_SAHIP, TEST_SAHIP_SIFRE, TEST_CALISAN, TEST_CALISAN_SIFRE.
// Testin oluşturduğu her şey "[TEST]" etiketlidir ve sonunda silinir. Sohbet mesajları silinmiş olarak kalır
// (sohbette "mesaj silindi" görünür; kurallar mesajın tamamen silinmesine izin vermez).
// Sonuç ekrana ve ~/Downloads/uygulama-test-<tarih>.txt dosyasına yazılır.
import { register } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";

register(new URL("../asistan-test/hooks.mjs", import.meta.url));

const args = process.argv.slice(2);
const only = args.includes("--sadece") ? args[args.indexOf("--sadece") + 1] : "";
const SITE = (args.includes("--site") ? args[args.indexOf("--site") + 1] : process.env.TEST_SITE || "https://sesliasistan.netlify.app").replace(/\/$/, "");
const withAI = args.includes("--yz");
const part = (p) => !only || only === p;

// ---- .env.local: Firebase istemci ayarları ve (yapay zeka testi için) anahtarlar; değerler yazılmaz ----
const env = { ...(process.env.TANI_EMU ? { NEXT_PUBLIC_FIREBASE_API_KEY: "demo", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-sa" } : {}) };
const envFile = new URL("../../.env.local", import.meta.url);
if (existsSync(envFile))
  for (const l of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);
    if (m && !(process.env.TANI_EMU && /^NEXT_PUBLIC_FIREBASE_/.test(m[1]))) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
for (const k of ["GEMINI_API_KEY", "GEMINI_MODEL", "GEMINI_FALLBACK_MODELS", "ANTHROPIC_API_KEY", "AI_PROVIDER", "AI_MODEL_TEXT"]) if (env[k] && !process.env[k]) process.env[k] = env[k];

// ---- Çıktı ----
const lines = [];
const log = (s = "") => (console.log(s), lines.push(s));
const results = []; // { group, name, ok, info }
let group = "";
const section = (t) => (log(""), log(t), (group = t));
async function test(name, fn) {
  try {
    const info = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error("zaman aşımı (20 sn)")), 20000))]);
    results.push({ group, name, ok: true, info: info || "" });
    log(`  ✓ ${name}${info ? ` · ${info}` : ""}`);
  } catch (e) {
    const msg = e?.code || e?.message || String(e);
    results.push({ group, name, ok: false, info: msg });
    log(`  ✗ ${name} · ${msg}`);
  }
}
// Reddedilmesi gereken işlem: permission-denied gelirse geçer
async function denied(name, fn) {
  await test(`${name} (reddedilmeli)`, async () => {
    try {
      await fn();
    } catch (e) {
      if (e?.code === "permission-denied") return "reddedildi";
      throw e;
    }
    throw new Error("İZİN VERİLDİ: kural açığı");
  });
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// ---- Sorular (şifre gizli) ----
async function ask(q, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : "");
  const a = await new Promise((r) => rl.question(q, r));
  rl.close();
  if (hidden) process.stdout.write("\n");
  return a.trim();
}
const loginEmail = (s) => (s.includes("@") ? s.toLocaleLowerCase("tr-TR") : `${s.toLocaleLowerCase("tr-TR")}@kullanici.sesliasistan.app`);

log(`Sesli Asistan · uygulama testi · ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`);
log(`Bölümler: ${only || "hepsi"}${withAI ? " + yapay zeka" : ""} · site: ${SITE}`);

// =====================================================================================
// 1) YEREL KURALLAR (yapay zekasız): sayfa açma, kayıt ekleme, özet, tamamlama, doğum günü, onaylar…
// =====================================================================================
if (part("yerel")) {
  section("1) YEREL TESTLER (asistan, ses, elle işlemler, yarış; yapay zekasız)");
  const { default: local } = await import("../asistan-test/yerel/hepsi.mjs");
  for (const g of [...new Set(local.map((r) => r.group))]) {
    const rs = local.filter((r) => r.group === g);
    const okN = rs.filter((r) => r.ok).length;
    results.push({ group, name: g, ok: okN === rs.length, info: `${okN}/${rs.length}` });
    log(`  ${okN === rs.length ? "✓" : "✗"} ${g} · ${okN}/${rs.length}`);
    for (const r of rs.filter((x) => !x.ok)) log(`      ✗ “${r.say}” → ${r.got} (beklenen: ${r.expect})`);
  }
}

// =====================================================================================
// 2) CANLI VERİ VE İZİNLER  ·  3) SUNUCU UÇLARI
// =====================================================================================
let O, C; // ana hesap ve çalışan: { app, db, uid, token(), kind }
const cleanup = []; // [{ who, ref }]
if (part("veri") || part("sunucu")) {
  const { initializeApp } = await import("firebase/app");
  const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
  const fs = await import("firebase/firestore");
  fs.setLogLevel("silent"); // reddedilmesi beklenen yazmaların gürültülü günlüğü çıkmasın
  const cfg = { apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, appId: env.NEXT_PUBLIC_FIREBASE_APP_ID };
  if (!cfg.apiKey || !cfg.projectId) {
    log("  ✗ .env.local içinde NEXT_PUBLIC_FIREBASE_* yok; canlı testler atlandı");
  } else {
    const sahip = process.env.TEST_SAHIP || (await ask("Ana hesap e-postası: "));
    const sahipPw = process.env.TEST_SAHIP_SIFRE || (await ask("Ana hesap şifresi: ", true));
    const calisan = process.env.TEST_CALISAN || (await ask("Çalışan kullanıcı adı (ya da e-posta): "));
    const calisanPw = process.env.TEST_CALISAN_SIFRE || (await ask("Çalışan şifresi: ", true));

    const connect = async (name, email, pw) => {
      const app = initializeApp(cfg, name);
      const auth = getAuth(app);
      const db = fs.getFirestore(app);
      // Yalnız geliştirme: emülatöre bağlan (canlıda bu değişken yoktur)
      if (process.env.TANI_EMU) {
        fs.connectFirestoreEmulator(db, "127.0.0.1", 8089);
        (await import("firebase/auth")).connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      }
      const u = (await signInWithEmailAndPassword(auth, loginEmail(email), pw)).user;
      return { app, db, auth, uid: u.uid, token: () => u.getIdToken() };
    };
    const now = () => new Date().toISOString();
    const today = now().slice(0, 10);
    const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const T = (s) => `[TEST] ${s}`;

    section("2a) HESAPLAR");
    await test("ana hesapla giriş", async () => {
      O = await connect("sahip", sahip, sahipPw);
      const p = (await fs.getDoc(fs.doc(O.db, "users", O.uid))).data() || {};
      expect((p.role || "owner") === "owner", `rol ${p.role}`);
      O.name = p.name || "Ana hesap";
      return `rol owner · ${O.name}`;
    });
    await test("çalışanla giriş", async () => {
      C = await connect("calisan", calisan, calisanPw);
      const p = (await fs.getDoc(fs.doc(C.db, "users", C.uid))).data() || {};
      expect(p.role === "staff", `rol ${p.role || "yok"}`);
      C.kind = p.kind || "staff";
      C.name = p.name || "Çalışan";
      if (!O) return `rol staff · ${C.name} (ana hesap girişi olmadığı için kurum kontrol edilemedi)`;
      expect(p.orgId === O.uid, "çalışan bu ana hesabın kurumunda değil");
      return `rol staff · tür ${C.kind} · ${C.name}`;
    });
    const ready = O && C;
    const org = (who) => fs.doc(who.db, "orgs", O.uid);
    const col = (who, c) => fs.collection(org(who), c);
    const ref = (who, c, id) => fs.doc(org(who), c, id);

    if (ready && part("veri")) {
      // ---------- Kayıtlar: plan, görev, not ----------
      section("2b) PLAN · GÖREV · NOT (atama, görüldü, yaptım, kayıt mesajı, düzenleme, silme isteği)");
      const ids = {};
      for (const [kind, c, extra] of [
        ["plan", "plans", { date: tomorrow, time: "10:00", durationMin: 60, place: "Kulüp iskelesi", cat: "Antrenman" }],
        ["task", "tasks", { due: tomorrow, done: false }],
        ["note", "notes", { body: "Test notu" }],
      ]) {
        await test(`ana hesap çalışana ${kind} verir`, async () => {
          const r = fs.doc(col(O, c));
          await fs.setDoc(r, { title: T(`${kind} ataması`), ...extra, people: [O.uid, C.uid], assignees: [C.uid], createdByUid: O.uid, createdAt: now() });
          cleanup.push({ who: O, c, id: r.id });
          ids[kind] = r.id;
        });
        await test(`çalışan kendisine verilen ${kind}ı görür`, async () => {
          const d = (await fs.getDoc(ref(C, c, ids[kind]))).data();
          expect(d?.title?.startsWith("[TEST]"), "okunamadı");
        });
        await test(`çalışan "görüldü" yazar`, () => fs.updateDoc(ref(C, c, ids[kind]), { [`ack.${C.uid}.r`]: now() }));
        await test(`çalışan kayda mesaj yazar`, () => fs.updateDoc(ref(C, c, ids[kind]), { [`replies.${C.uid}`]: [{ at: now(), text: "Test mesajı" }] }));
        await test(`çalışan "${{ plan: "gerçekleşti", task: "yaptım", note: "okudum" }[kind]}" der`, () => fs.updateDoc(ref(C, c, ids[kind]), { [`doneBy.${C.uid}`]: now() }));
        await denied(`çalışan ana hesabın verdiği ${kind}ın başlığını değiştirir`, () => fs.updateDoc(ref(C, c, ids[kind]), { title: "değişti" }));
        await denied(`çalışan sorumluları değiştirir`, () => fs.updateDoc(ref(C, c, ids[kind]), { assignees: [] }));
        await test(`ana hesap ${kind}ı düzenler`, () => fs.updateDoc(ref(O, c, ids[kind]), { title: T(`${kind} düzenlendi`), updatedAt: now() }));
      }
      await test("ana hesap kendi özel notunu ekler", async () => {
        const r = fs.doc(col(O, "notes"));
        await fs.setDoc(r, { title: T("özel not"), body: "yalnız ana hesap", people: [O.uid], assignees: [], createdByUid: O.uid, createdAt: now() });
        cleanup.push({ who: O, c: "notes", id: r.id });
        ids.private = r.id;
      });
      await denied("çalışan ana hesabın özel notunu okur", () => fs.getDoc(ref(C, "notes", ids.private)));
      await test("çalışan kendi görevini ekler", async () => {
        const r = fs.doc(col(C, "tasks"));
        await fs.setDoc(r, { title: T("çalışanın görevi"), due: today, done: false, people: [C.uid], assignees: [C.uid], createdByUid: C.uid, createdAt: now() });
        cleanup.push({ who: O, c: "tasks", id: r.id });
        ids.own = r.id;
      });
      await test("çalışan kendi görevini düzenler ve tamamlar", () => fs.updateDoc(ref(C, "tasks", ids.own), { title: T("çalışanın görevi (bitti)"), done: true }));
      await denied("çalışan kendi görevini siler (silme isteği gerekir)", () => fs.deleteDoc(ref(C, "tasks", ids.own)));
      await test("çalışan silme isteği gönderir", () => fs.updateDoc(ref(C, "tasks", ids.own), { deleteReq: { by: C.uid, at: now() } }));
      await denied("çalışan başkası adına kayıt ekler", () => fs.setDoc(fs.doc(col(C, "tasks")), { title: T("sahte"), people: [C.uid], assignees: [C.uid], createdByUid: O.uid }));
      await denied("çalışan ana hesabı da gören kayıt ekler", () => fs.setDoc(fs.doc(col(C, "tasks")), { title: T("sahte"), people: [C.uid, O.uid], assignees: [C.uid], createdByUid: C.uid }));

      // ---------- Fişler ----------
      section("2c) FİŞ VE ÖDEME");
      const canReceipt = ["staff", "family"].includes(C.kind);
      if (canReceipt) {
        await test("çalışan fiş ekler (ödeme bekliyor)", async () => {
          const r = fs.doc(col(C, "receipts"));
          await fs.setDoc(r, { merchant: T("Marin Yedek Parça"), date: today, total: 12.5, items: [], people: [C.uid], assignees: [C.uid], createdByUid: C.uid, createdAt: now(), payStatus: "pending" });
          cleanup.push({ who: O, c: "receipts", id: r.id });
          ids.receipt = r.id;
        });
        await denied("çalışan kendi fişini ödendi yapar", () => fs.updateDoc(ref(C, "receipts", ids.receipt), { payStatus: "paid" }));
        await test("ana hesap ödenmeyi bekleyen fişi görür", async () => {
          const d = (await fs.getDoc(ref(O, "receipts", ids.receipt))).data();
          expect(d?.payStatus === "pending", `durum ${d?.payStatus}`);
        });
        await test("ana hesap fişi öder", () => fs.updateDoc(ref(O, "receipts", ids.receipt), { payStatus: "paid", paidAt: now(), paidBy: { name: O.name }, paySeenAt: null }));
        await test("çalışan ödendiğini görür ve 'gördüm' der", async () => {
          const d = (await fs.getDoc(ref(C, "receipts", ids.receipt))).data();
          expect(d?.payStatus === "paid", `durum ${d?.payStatus}`);
          await fs.updateDoc(ref(C, "receipts", ids.receipt), { paySeenAt: now() });
        });
      } else log(`  · bu çalışanın türü (${C.kind}) fiş ekleyemez; fiş testleri atlandı`);

      // ---------- Doğum günleri ----------
      section("2d) DOĞUM GÜNÜ (kişiye özel)");
      await test("ana hesap doğum günü ekler", async () => {
        const r = fs.doc(col(O, "birthdays"));
        await fs.setDoc(r, { name: T("Annem"), month: 3, day: 12, createdByUid: O.uid, createdAt: now() });
        cleanup.push({ who: O, c: "birthdays", id: r.id });
      });
      await test("çalışan kendi doğum gününü ekler", async () => {
        const r = fs.doc(col(C, "birthdays"));
        await fs.setDoc(r, { name: T("Kardeşim"), month: 5, day: 4, people: [C.uid], assignees: [C.uid], createdByUid: C.uid, createdAt: now() });
        ids.cbday = r.id;
      });
      await denied("ana hesap çalışanın doğum gününü okur", () => fs.getDoc(ref(O, "birthdays", ids.cbday)));
      await test("çalışan kendi doğum gününü siler", () => fs.deleteDoc(ref(C, "birthdays", ids.cbday)));

      // ---------- Ders programı ----------
      section("2e) DERS PROGRAMI");
      await test("çalışan ders ekler", async () => {
        const r = fs.doc(col(C, "lessons"));
        await fs.setDoc(r, { title: T("Fizik"), day: 2, start: "13:00", end: "13:45", place: "B-204", people: [C.uid], assignees: [C.uid], createdByUid: C.uid, createdAt: now() });
        cleanup.push({ who: O, c: "lessons", id: r.id });
      });

      // ---------- Alışveriş listesi ----------
      section("2f) ALIŞVERİŞ LİSTESİ");
      const myList = C.kind === "family" ? "family" : C.kind === "staff" ? "team" : "";
      if (myList) {
        await test(`çalışan ${myList === "team" ? "Ekip" : "Aile"} listesine ekler`, async () => {
          const r = fs.doc(col(C, "shop"));
          await fs.setDoc(r, { text: T("süt"), list: myList, done: false, by: C.uid, at: now() });
          ids.shop = r.id;
        });
        await test("işaretler (alındı)", () => fs.updateDoc(ref(C, "shop", ids.shop), { done: true, doneBy: C.uid, doneAt: now() }));
        await test("ana hesap listeyi görür", async () => expect((await fs.getDoc(ref(O, "shop", ids.shop))).exists(), "görünmüyor"));
        await test("siler", () => fs.deleteDoc(ref(C, "shop", ids.shop)));
        await denied("çalışan öbür listeye ekler", () => fs.setDoc(fs.doc(col(C, "shop")), { text: T("x"), list: myList === "team" ? "family" : "team", done: false, by: C.uid, at: now() }));
      } else log(`  · bu türün (${C.kind}) alışveriş listesi yok; atlandı`);

      // ---------- Mesajlaşma ----------
      section("2g) MESAJLAŞMA (Ekip grubu, birebir, düzenleme, silme, tepki)");
      const sendMsg = async (who, cid, text, create) => {
        const cref = ref(who, "chats", cid);
        const mref = fs.doc(fs.collection(cref, "messages"));
        await fs.runTransaction(who.db, async (tx) => {
          const snap = await tx.get(cref);
          const n = (snap.exists() ? snap.data().seq || 0 : 0) + 1;
          const last = { text: text.slice(0, 140), by: who.uid, at: fs.serverTimestamp() };
          if (!snap.exists()) tx.set(cref, { ...create, seq: n, last, read: { [who.uid]: n }, createdAt: fs.serverTimestamp() });
          else tx.update(cref, { seq: n, last, [`read.${who.uid}`]: n, [`typing.${who.uid}`]: fs.deleteField() });
          tx.set(mref, { by: who.uid, text, at: fs.serverTimestamp(), n });
        });
        return mref.id;
      };
      await test("herkes kişi adlarını okur (çalışan)", async () => `${(await fs.getDocs(col(C, "directory"))).size} kişi`);
      const teamOk = C.kind === "staff";
      if (teamOk) {
        await test("çalışan Ekip grubuna yazar", async () => (ids.tm = await sendMsg(C, "team", T("Ekip mesajı"), { type: "team" })) && "");
        await test("ana hesap çalışanın mesajını görür", async () => {
          const d = (await fs.getDoc(fs.doc(ref(O, "chats", "team"), "messages", ids.tm))).data();
          expect(d?.by === C.uid, "mesaj yok");
        });
        await test("ana hesap tepki bırakır", () => fs.updateDoc(fs.doc(ref(O, "chats", "team"), "messages", ids.tm), { [`reactions.${O.uid}`]: "👍" }));
        await test("çalışan mesajını düzenler (15 dk içinde)", () => fs.updateDoc(fs.doc(ref(C, "chats", "team"), "messages", ids.tm), { text: T("Ekip mesajı (düzenlendi)"), editedAt: fs.serverTimestamp() }));
        await denied("ana hesap çalışanın mesajını düzenler", () => fs.updateDoc(fs.doc(ref(O, "chats", "team"), "messages", ids.tm), { text: "x", editedAt: fs.serverTimestamp() }));
        await test("çalışan mesajını siler", () => fs.updateDoc(fs.doc(ref(C, "chats", "team"), "messages", ids.tm), { deleted: true, text: "" }));
        await test("okundu bilgisi yazılır", async () => {
          const seq = (await fs.getDoc(ref(O, "chats", "team"))).data()?.seq || 0;
          await fs.updateDoc(ref(O, "chats", "team"), { [`read.${O.uid}`]: seq });
        });
      } else log(`  · bu türün (${C.kind}) Ekip grubu yok; Ekip testleri atlandı`);
      await denied("çalışan başkası adına mesaj yazar", async () => {
        const cid = teamOk ? "team" : C.kind === "family" ? "family" : "athletes";
        await fs.setDoc(fs.doc(fs.collection(ref(C, "chats", cid), "messages")), { by: O.uid, text: "sahte", at: fs.serverTimestamp(), n: 1 });
      });
      const dm = `dm_${[O.uid, C.uid].sort().join("_")}`;
      const dmCreate = { type: "dm", members: [O.uid, C.uid].sort() };
      await test("ana hesap çalışana birebir yazar", async () => (ids.dm1 = await sendMsg(O, dm, T("Birebir mesaj"), dmCreate)) && "");
      await test("çalışan birebir mesajı görür ve cevaplar", async () => {
        expect((await fs.getDoc(fs.doc(ref(C, "chats", dm), "messages", ids.dm1))).exists(), "görünmüyor");
        ids.dm2 = await sendMsg(C, dm, T("Birebir cevap"), dmCreate);
      });
      await test("birebir test mesajları silinir", async () => {
        await fs.updateDoc(fs.doc(ref(O, "chats", dm), "messages", ids.dm1), { deleted: true, text: "" });
        await fs.updateDoc(fs.doc(ref(C, "chats", dm), "messages", ids.dm2), { deleted: true, text: "" });
      });

      // ---------- Diğer ----------
      section("2h) DİĞER (son görülme, öğrenme verisi, sporcu yoklama kopyası)");
      await test("çalışan 'son görülme' yazar", async () => {
        const m = await fs.getDoc(ref(O, "members", C.uid));
        if (!m.exists()) return "üye kaydı yok (atlandı)";
        await fs.updateDoc(ref(C, "members", C.uid), { lastSeen: fs.serverTimestamp() });
      });
      await test("çalışan kendi öğrenme verisini yazar", () => fs.setDoc(ref(C, "learn", `${C.uid}_${today.slice(0, 7)}`), { uid: C.uid }, { merge: true }));
      await denied("çalışan başkasının sporcu yoklama kopyasını okur", () => fs.getDoc(ref(C, "athleteAtt", O.uid)));
    }

    // ---------- Sunucu uçları ----------
    if (ready && part("sunucu")) {
      section(`3) SUNUCU UÇLARI (${SITE})`);
      const call = async (who, path, body) => {
        const res = await fetch(SITE + path, {
          method: body ? "POST" : "GET",
          headers: { authorization: `Bearer ${await who.token()}`, ...(body ? { "content-type": "application/json" } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`${res.status} ${data.reason || ""} ${data.error || ""}`.trim());
        return data;
      };
      await test("sağlık kontrolü", async () => {
        const res = await fetch(SITE + "/api/health");
        expect(res.ok, `${res.status}`);
        const d = await res.json().catch(() => ({}));
        return Object.entries(d).filter(([, v]) => v === false).map(([k]) => `${k}: kapalı`).join(", ") || "tamam";
      });
      await test("çalışanın günlük hakları", async () => {
        const d = await call(C, "/api/usage");
        return Object.entries(d).filter(([, q]) => q && q.limit).map(([k, q]) => `${k} ${q.left}/${q.limit}`).join(" · ") || "sınırsız";
      });
      await test("kayıt yorumlama (yarın 10'da antrenman ekle)", async () => {
        const d = await call(O, "/api/interpret", { text: "yarın saat 10'da antrenman ekle", today: new Date().toISOString().slice(0, 10), name: "Test" });
        expect(d.items?.[0]?.type === "plan", "plan çıkmadı");
        return `${d.items[0].title} ${d.items[0].time} · ${d.source}`;
      });
      await test("asistan (bu hafta neler var)", async () => {
        const d = await call(O, "/api/assistant", { text: "bu hafta neler var", name: "Test", digest: "## BUGÜN\n(yok)", history: [], contacts: ["Ekip (grup)"] });
        return `${d.intent} · ${d.provider || ""} · ${d.ms || "?"} ms`;
      });
      await test("mesaj yanıt önerileri", async () => {
        const d = await call(C, "/api/replies", { messages: [{ me: false, name: "Seyhun", text: "Yarın 9'da iskelede olabilir misin?" }], name: "Test", group: "Ekip" });
        return d.replies?.length ? d.replies.join(" | ") : "öneri boş (yapay zeka anahtarı ya da kota)";
      });
      await test("bildirim gönderimi (atama)", async () => {
        const r = fs.doc(col(O, "tasks"));
        await fs.setDoc(r, { title: T("bildirim denemesi"), due: tomorrow, done: false, people: [O.uid, C.uid], assignees: [C.uid], createdByUid: O.uid, createdAt: now() });
        cleanup.push({ who: O, c: "tasks", id: r.id });
        const d = await call(O, "/api/notify", { kind: "task", id: r.id });
        if (d.skipped) throw new Error(`gönderilmedi: ${d.skipped} (VAPID/Firebase yönetici anahtarları Netlify'da tanımlı mı?)`);
        return d.sent ? `${d.sent} cihaza gitti` : "gönderildi ama çalışanın kayıtlı cihazı yok (bildirim izni verilmemiş)";
      });
    }

    // ---------- Temizlik ----------
    if (ready && cleanup.length) {
      section("TEMİZLİK");
      let n = 0;
      for (const { who, c, id } of cleanup) await fs.deleteDoc(ref(who, c, id)).then(() => n++, (e) => log(`  ✗ silinemedi ${c}/${id}: ${e.code}`));
      log(`  ✓ ${n}/${cleanup.length} test kaydı silindi`);
    }
  }
}

// =====================================================================================
// 4) GERÇEK YAPAY ZEKA (isteğe bağlı)
// =====================================================================================
if (withAI) {
  section("4) GERÇEK YAPAY ZEKA (asistan cümleleri)");
  const { default: runAI } = await import("../asistan-test/yapay-zeka.mjs");
  const ai = await runAI(() => {});
  for (const r of ai) {
    results.push({ group, name: r.say, ok: r.ok, info: r.got });
    log(`  ${r.ok ? "✓" : "✗"} “${r.say}” (${(r.ms / 1000).toFixed(1)} sn)${r.ok ? "" : `\n      beklenen: ${r.expect}\n      gelen: ${r.got}`}`);
  }
}

// ---- Özet ----
section("ÖZET");
const groups = [...new Set(results.map((r) => r.group))];
for (const g of groups) {
  const rs = results.filter((r) => r.group === g);
  log(`  ${rs.every((r) => r.ok) ? "✓" : "✗"} ${g.replace(/^\S+\)\s*/, "")}: ${rs.filter((r) => r.ok).length}/${rs.length}`);
}
const okAll = results.filter((r) => r.ok).length;
log(`  TOPLAM: ${okAll}/${results.length} geçti`);
const dir = join(homedir(), "Downloads");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const file = join(dir, `uygulama-test-${new Date().toISOString().slice(0, 10)}.txt`);
writeFileSync(file, lines.join("\n") + "\n");
console.log(`\nSonuç dosyası: ${file}`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
