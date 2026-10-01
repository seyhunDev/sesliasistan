// Mesajlaşma tanısı (canlı Firebase'e, bir hesabın gözünden): neyin izinli, neyin reddedildiğini adım adım gösterir.
//
//   node scripts/mesaj-tani.mjs <kullanıcı adı ya da e-posta> <şifre>            okuma testleri
//   node scripts/mesaj-tani.mjs <kullanıcı adı ya da e-posta> <şifre> --gonder   + Ekip grubuna "tanı" mesajı yazar
//   Sohbet seçmek için: --sohbet team | family | athletes | dm_<uid>_<uid>
//
// Ayarlar .env.local'daki NEXT_PUBLIC_FIREBASE_* değerlerinden okunur. Şifre hiçbir yere yazılmaz.
// Sonuç ekrana ve ~/Downloads/mesaj-tani-<tarih>.txt dosyasına yazılır; o dosyayı sohbete yükleyebilirsin.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection, connectFirestoreEmulator, deleteField, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where,
} from "firebase/firestore";
import { connectAuthEmulator } from "firebase/auth";

const lines = [];
const log = (s = "") => (console.log(s), lines.push(s));
const ok = (s) => log(`  ✓ ${s}`);
const bad = (s) => log(`  ✗ ${s}`);
const code = (e) => e?.code || e?.message || String(e);

const [, , who, pw, ...rest] = process.argv;
if (!who || !pw) {
  console.log("Kullanım: node scripts/mesaj-tani.mjs <kullanıcı adı ya da e-posta> <şifre> [--gonder] [--sohbet team]");
  process.exit(1);
}
const send = rest.includes("--gonder");
const cid = rest.includes("--sohbet") ? rest[rest.indexOf("--sohbet") + 1] : "team";
const email = who.includes("@") ? who.trim().toLocaleLowerCase("tr-TR") : `${who.trim().toLocaleLowerCase("tr-TR")}@kullanici.sesliasistan.app`;

const env = { ...(process.env.TANI_EMU ? { NEXT_PUBLIC_FIREBASE_API_KEY: "demo", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-sa" } : {}) };
const envFile = new URL("../.env.local", import.meta.url);
if (existsSync(envFile))
  for (const l of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*(NEXT_PUBLIC_FIREBASE_[A-Z_]+)\s*=\s*(.*)\s*$/.exec(l);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
const cfg = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
if (!cfg.apiKey || !cfg.projectId) {
  console.log(".env.local içinde NEXT_PUBLIC_FIREBASE_* bulunamadı.");
  process.exit(1);
}

log(`Mesajlaşma tanısı · ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`);
log(`Proje: ${cfg.projectId} · hesap: ${email.replace(/@kullanici\.sesliasistan\.app$/, "")} · sohbet: ${cid}${send ? " · deneme mesajı gönderilecek" : ""}`);
log("");

const app = initializeApp(cfg);
const db = getFirestore(app);
// Yalnız geliştirme: emülatöre bağlan (canlıda bu değişkenler yoktur)
if (process.env.TANI_EMU) {
  connectFirestoreEmulator(db, "127.0.0.1", 8089);
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", { disableWarnings: true });
}
let uid, orgId, kind, role;

// 1) Giriş
log("1) Giriş");
try {
  uid = (await signInWithEmailAndPassword(getAuth(app), email, pw)).user.uid;
  ok(`giriş yapıldı (uid ${uid.slice(0, 6)}…)`);
} catch (e) {
  bad(`giriş olmadı: ${code(e)}`);
  finish();
}

// 2) Profil
log("2) Profil (users belgesi)");
try {
  const p = (await getDoc(doc(db, "users", uid))).data();
  if (!p) bad("users belgesi yok: hesap uygulamada kurulmamış");
  role = p?.role || "owner";
  orgId = p?.orgId || uid;
  kind = role === "staff" ? p?.kind || "staff (alan yok, varsayılan)" : "owner";
  ok(`rol: ${role} · tür: ${kind} · kurum: ${orgId === uid ? "kendisi (ana hesap)" : orgId.slice(0, 6) + "…"}`);
} catch (e) {
  bad(`profil okunamadı: ${code(e)}`);
  finish();
}
const org = doc(db, "orgs", orgId);

// 3) Kişi adları (grupta gönderenin adı buradan gelir)
log("3) Kişi adları (directory)");
const names = {};
try {
  const s = await getDocs(collection(org, "directory"));
  s.forEach((d) => (names[d.id] = d.data().name));
  s.size ? ok(`${s.size} kişi okundu`) : bad("hiç kişi yok: grupta adlar görünmez (uygulamayı bir kez açan kişiler buraya yazılır)");
  if (!names[uid]) bad("bu hesabın adı listede yok (uygulama açılınca yazılır)");
} catch (e) {
  bad(`okunamadı: ${code(e)} → grupta adlar görünmez`);
}

// 4) Sohbetler
log("4) Sohbet listesi");
try {
  const s = await getDocs(query(collection(org, "chats"), where("members", "array-contains", uid)));
  ok(`üyesi olduğu (birebir/özel grup) sohbet: ${s.size}`);
} catch (e) {
  bad(`birebir/grup listesi okunamadı: ${code(e)}`);
}
let chat = null;
try {
  const c = await getDoc(doc(org, "chats", cid));
  chat = c.exists() ? c.data() : null;
  chat ? ok(`“${cid}” sohbeti var · ${chat.seq || 0} mesaj · son: ${chat.last?.by === uid ? "bu hesap" : names[chat.last?.by] || chat.last?.by || "-"}`) : log(`  · “${cid}” sohbeti henüz yok (ilk mesajla oluşur)`);
} catch (e) {
  bad(`“${cid}” okunamadı: ${code(e)} → bu hesap bu sohbeti göremiyor (kural ya da tür)`);
}

// 5) Mesajlar ve taraflar
log("5) Mesajlar (son 15) ve hangi tarafta durdukları");
if (chat) {
  try {
    const s = await getDocs(query(collection(org, "chats", cid, "messages"), orderBy("at", "desc"), limit(15)));
    const list = s.docs.map((d) => d.data()).reverse();
    ok(`${list.length} mesaj okundu`);
    for (const m of list) {
      const side = m.by === uid ? "SAĞ (kendisi)" : "SOL";
      const name = m.by === uid ? "" : names[m.by] || `ADI YOK (${String(m.by).slice(0, 6)}…)`;
      log(`     ${side.padEnd(13)} ${name ? name + ": " : ""}${String(m.text || (m.deleted ? "[silindi]" : "")).slice(0, 50)}`);
    }
  } catch (e) {
    bad(`mesajlar okunamadı: ${code(e)}`);
  }
}

// 6) Canlı dinleme: 15 sn boyunca kaç güncelleme geliyor (ekranın "yenilenmesi")
log("6) Canlı dinleme (15 sn)");
await new Promise((res) => {
  let n = 0, errs = 0, firstErr = "";
  const stops = [];
  const watch = (ref, opts = {}) =>
    stops.push(onSnapshot(ref, opts, () => n++, (e) => (errs++, (firstErr ||= code(e)))));
  watch(doc(org, "chats", cid), { includeMetadataChanges: true });
  if (chat) watch(query(collection(org, "chats", cid, "messages"), orderBy("at", "desc"), limit(50)), { includeMetadataChanges: true });
  watch(collection(org, "directory"));
  setTimeout(() => {
    stops.forEach((s) => s());
    (errs ? bad : ok)(`${n} güncelleme, ${errs} hata${firstErr ? ` (${firstErr})` : ""}${n > 12 ? " → çok sık güncelleme: ekran yenileniyor gibi görünür" : ""}`);
    res();
  }, 15000);
});

// 7) Gönderme (isteğe bağlı): uygulamanın yaptığının aynısı
if (send) {
  log("7) Deneme mesajı gönderme");
  try {
    const cref = doc(org, "chats", cid);
    const mref = doc(collection(cref, "messages"));
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(cref);
      const n = (snap.exists() ? snap.data().seq || 0 : 0) + 1;
      const last = { text: "Tanı mesajı", by: uid, at: serverTimestamp() };
      if (!snap.exists()) tx.set(cref, { type: "team", seq: n, last, read: { [uid]: n }, createdAt: serverTimestamp() });
      else tx.update(cref, { seq: n, last, [`read.${uid}`]: n, [`typing.${uid}`]: deleteField() });
      tx.set(mref, { by: uid, text: "Tanı mesajı (silebilirsin)", at: serverTimestamp(), n });
    });
    ok("gönderildi");
  } catch (e) {
    bad(`gönderilemedi: ${code(e)}${code(e) === "permission-denied" ? " → kurallar izin vermiyor (firestore.rules yayınlandı mı? tür doğru mu?)" : ""}`);
  }
}

finish();

function finish() {
  const dir = join(homedir(), "Downloads");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, `mesaj-tani-${new Date().toISOString().slice(0, 10)}.txt`);
  writeFileSync(file, lines.join("\n") + "\n");
  console.log(`\nSonuç dosyası: ${file}`);
  process.exit(0);
}
