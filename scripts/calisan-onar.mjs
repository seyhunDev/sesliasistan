// Çalışan kayıtlarını onarır: geliştirme kısayoluyla (DEV_SKIP_AUTH) "dev" işletmesine yazılmış çalışanları
// ana hesabın işletmesine taşır ve her çalışanın orgs/{ana-hesap}/members kaydının olduğundan emin olur.
//
// Kullanım (proje klasöründe):
//   node --env-file=.env.local scripts/calisan-onar.mjs ana@hesap.com          -> yalnızca ne yapılacağını gösterir
//   node --env-file=.env.local scripts/calisan-onar.mjs ana@hesap.com --yaz    -> değişiklikleri uygular
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, flag] = process.argv.slice(2);
const write = flag === "--yaz";
const need = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"].filter((k) => !process.env[k]);
if (!email) {
  console.log("Ana hesabın e-postasını yaz: node --env-file=.env.local scripts/calisan-onar.mjs ana@hesap.com");
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
const db = getFirestore();
const auth = getAuth();

const owner = await auth.getUserByEmail(email.trim().toLowerCase()).catch(() => null);
if (!owner) {
  console.log(`Bu e-postayla hesap bulunamadı: ${email}`);
  process.exit(1);
}
const O = owner.uid;
console.log(`Ana hesap: ${owner.email} (${O})`);
console.log(`DEV_SKIP_AUTH: ${process.env.DEV_SKIP_AUTH || "(yok)"}\n`);

// Özet: tüm profiller (çalışan kayıt ekranından açıldıysa "owner" görünür; o zaman çalışan değil ayrı hesaptır)
const all = await db.collection("users").get();
console.log("Profiller:");
all.forEach((u) => {
  const d = u.data();
  console.log(`  ${u.id === O ? "*" : " "} ${(d.name || "-").padEnd(18)} ${(d.email || "-").padEnd(28)} role=${d.role || "-"}  orgId=${d.orgId === O ? "(ana hesap)" : d.orgId || "-"}`);
});
console.log("");

const ops = [];
const now = new Date().toISOString();

// Ana hesabın profili
const me = await db.collection("users").doc(O).get();
const md = me.exists ? me.data() : null;
if (!md || md.role !== "owner" || md.orgId !== O) {
  ops.push([`users/${O}: role=owner, orgId=${O} yapılacak (şu an: ${md ? `role=${md.role}, orgId=${md.orgId}` : "profil yok"})`, (b) =>
    b.set(db.collection("users").doc(O), { role: "owner", orgId: O, name: md?.name || owner.displayName || "", email: owner.email }, { merge: true })]);
}

// Çalışanlar: bu işletmeye ya da "dev"e bağlı (ya da işletmesi boş) olanlar
const staff = await db.collection("users").where("role", "==", "staff").get();
const members = db.collection("orgs").doc(O).collection("members");
let found = 0;
for (const s of staff.docs) {
  const d = s.data();
  if (d.orgId && d.orgId !== O && d.orgId !== "dev") {
    console.log(`- ${d.name || s.id}: başka bir işletmeye bağlı (${d.orgId}), dokunulmadı`);
    continue;
  }
  found++;
  if (d.orgId !== O) ops.push([`users/${s.id} (${d.name}): orgId "${d.orgId || ""}" -> ${O}`, (b) => b.update(s.ref, { orgId: O })]);
  const m = await members.doc(s.id).get();
  if (!m.exists) {
    ops.push([`orgs/${O}/members/${s.id} (${d.name}) oluşturulacak`, (b) =>
      b.set(members.doc(s.id), { uid: s.id, name: d.name || "", email: d.email || "", role: "staff", createdAt: d.createdAt || now })]);
  }
}

// "dev" işletmesindeki eski çalışan listesi temizlenir
const devMembers = await db.collection("orgs").doc("dev").collection("members").get();
devMembers.forEach((m) => ops.push([`orgs/dev/members/${m.id} silinecek (taşındı)`, (b) => b.delete(m.ref)]));

console.log(`Bulunan çalışan: ${found}`);
if (!ops.length) {
  console.log("Yapılacak bir şey yok: kayıtlar doğru görünüyor.");
  process.exit(0);
}
ops.forEach(([t]) => console.log(`• ${t}`));
if (!write) {
  console.log("\nHiçbir şey değiştirilmedi. Uygulamak için komutun sonuna --yaz ekle.");
  process.exit(0);
}
const batch = db.batch();
ops.forEach(([, f]) => f(batch));
await batch.commit();
console.log(`\nTamam: ${ops.length} değişiklik uygulandı.`);
process.exit(0);
