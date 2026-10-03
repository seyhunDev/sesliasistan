// Asistanla kişi ekleme testleri (assistPerson.js): tanıma, alanlar, eksik soru, cevap, mükerrer, özet, hesap.
import { suite } from "./ortak.mjs";

const { group } = suite("asistan");
const PA = await import("@/features/people/assistPerson");
const WP = (want) => ({ desc: want ? "kişi ekleme" : "kişi ekleme değil", fn: (s) => PA.wantsPerson(s), ok: (r) => r === want });
group("Kişi ekleme (tanıma)")([
  ["Kişi ekle: Ayşe Yılmaz, eşim, 0532 123 45 67", WP(true)], ["Annem Fatma Yıldız'ı aileye ekle, doğum günü 12 Mart", WP(true)],
  ["Ali Kaya'yı çalışan olarak ekle, antrenör", WP(true)], ["yeni aile bireyi ekle", WP(true)], ["yeni kişi: Ege Demir", WP(true)],
  ["Mehmet'i rehbere kaydet", WP(true)], ["Zeynep Kara'yı veli olarak ekle", WP(true)],
  ["Mehmet'i de ekle", WP(false)], ["listeye süt ekle", WP(false)], ["D'Azur yarışına Ali'yi ekle", WP(false)],
  ["yarın saat 10'da antrenman ekle", WP(false)], ["Ali'yi gruba ekle", WP(false)], ["kişi nasıl eklenir?", WP(false)],
  ["Annemin doğum günü 12 Mart", WP(false)], ["ekibe mesaj gönder", WP(false)],
]);
const PP = (desc, ok) => ({ desc, fn: (s) => PA.parsePerson(s), ok });
group("Kişi ekleme (alanlar)")([
  ["Kişi ekle: Ayşe Yılmaz, eşim, 0532 123 45 67", PP("Ayşe Yılmaz · aile · Eş · telefon", (r) => r.name === "Ayşe Yılmaz" && r.kind === "family" && r.relation === "Eş" && PA.formatPhone(r.phone) === "0532 123 45 67")],
  ["Annem Fatma Yıldız'ı aileye ekle, doğum günü 12 Mart 1960", PP("Fatma Yıldız · Anne · 12.3.1960", (r) => r.name === "Fatma Yıldız" && r.relation === "Anne" && r.birth?.month === 3 && r.birth?.day === 12 && r.birth?.year === 1960 && !r.phone)],
  ["Ali Kaya'yı çalışan olarak ekle, antrenör", PP("Ali Kaya · çalışan · Antrenör", (r) => r.name === "Ali Kaya" && r.kind === "staff" && r.title === "Antrenör")],
  ["Ege Demir'i kişilere ekle e-posta ege et gmail nokta com", PP("e-posta ege@gmail.com", (r) => r.name === "Ege Demir" && r.email === "ege@gmail.com")],
  ["yeni kişi: Can Öz, telefon 5321234567", PP("telefon 10 hane → 0 eklenir", (r) => r.name === "Can Öz" && PA.validPhone(r.phone) && PA.formatPhone(r.phone) === "0532 123 45 67")],
  ["Kişi ekle: Deniz Ak, telefon 0532 12", PP("eksik telefon geçersiz", (r) => r.phone && !PA.validPhone(r.phone))],
]);
const NQ = (d, field) => ({ desc: field ? `sor: ${field}` : "eksik yok", fn: () => PA.nextQuestion(d)?.field || null, ok: (r) => r === (field || null) });
group("Kişi ekleme (eksik soru)")([
  ["ad yok", NQ({ kind: "family" }, "name")], ["soyad yok", NQ({ name: "Ayşe", kind: "family", relation: "Eş" }, "surname")],
  ["soyad yok dedi", NQ({ name: "Ayşe", noSurname: true, kind: "staff" }, null)], ["grup yok", NQ({ name: "Ali Kaya" }, "kind")],
  ["aile yakınlık yok", NQ({ name: "Ali Kaya", kind: "family" }, "relation")], ["hatalı telefon", NQ({ name: "Ali Kaya", kind: "staff", phone: "0532 12" }, "phone")],
  ["hatalı e-posta", NQ({ name: "Ali Kaya", kind: "staff", email: "ali@gmail" }, "email")], ["31 Şubat", NQ({ name: "Ali Kaya", kind: "staff", birth: { day: 31, month: 2 } }, "birth")],
  ["tamam", NQ({ name: "Ali Kaya", kind: "staff", phone: "05321234567" }, null)],
]);
const AA = (d, field, desc, ok) => ({ desc, fn: (s) => PA.applyAnswer(d, s, field), ok });
group("Kişi ekleme (cevap ve düzeltme)")([
  ["aile bireyi", AA({ name: "Ali Kaya" }, "kind", "family", (r) => r.kind === "family")],
  ["eşim", AA({ name: "Ali Kaya" }, "kind", "family + Eş", (r) => r.kind === "family" && r.relation === "Eş")],
  ["çalışan", AA({ name: "Ali Kaya" }, "kind", "staff", (r) => r.kind === "staff")],
  ["kardeşi", AA({ name: "Ali Kaya", kind: "family" }, "relation", "Kardeş", (r) => r.relation === "Kardeş")],
  ["Yılmaz", AA({ name: "Ayşe", kind: "family" }, "surname", "Ayşe Yılmaz", (r) => r.name === "Ayşe Yılmaz")],
  ["yok", AA({ name: "Ayşe" }, "surname", "soyadsız", (r) => r.noSurname === true && r.name === "Ayşe")],
  ["0533 765 43 21", AA({ name: "A B", phone: "0532" }, "phone", "yeni telefon", (r) => PA.formatPhone(r.phone) === "0533 765 43 21")],
  ["telefon yok", AA({ name: "A B", phone: "0532" }, "phone", "telefon silinir", (r) => !r.phone)],
  ["telefonu 0533 765 43 21 yap", AA({ name: "A B", kind: "staff", phone: "05321234567" }, "", "düzeltme", (r) => PA.formatPhone(r.phone) === "0533 765 43 21" && r.name === "A B")],
  ["doğum günü 3 Mayıs 1990", AA({ name: "A B", kind: "staff" }, "", "doğum günü eklenir", (r) => r.birth?.month === 5 && r.birth?.year === 1990)],
  ["soyadı Kara olsun", AA({ name: "Ayşe Yılmaz", kind: "staff" }, "", "Ayşe Kara", (r) => r.name === "Ayşe Kara")],
  ["e-postayı sil", AA({ name: "A B", email: "a@b.co" }, "", "e-posta silinir", (r) => !r.email)],
  ["bugün hava nasıl", AA({ name: "A B", kind: "staff" }, "", "değişiklik yok", (r) => !PA.changes({ name: "A B", kind: "staff" }, r))],
]);
const MEM = [
  { uid: "m1", name: "Ayşe Yılmaz", phone: "0532 123 45 67", kind: "family" },
  { uid: "m2", name: "Mehmet Demir", email: "mehmet@x.com", kind: "staff" },
  { uid: "m3", name: "Şükrü Öztürk", kind: "staff", status: "left" },
];
const DU = (d, want) => ({ desc: want.length ? `mükerrer: ${want.join(",")}` : "mükerrer yok", fn: () => PA.findDuplicates(d, MEM).map((x) => x.person.uid), ok: (r) => r.join(",") === want.join(",") });
group("Kişi ekleme (mükerrer)")([
  ["aynı ad", DU({ name: "Ayşe Yılmaz" }, ["m1"])], ["harf hatası", DU({ name: "Ayse Yilmaz" }, ["m1"])], ["benzer soyad", DU({ name: "Ayşe Yılmas" }, ["m1"])],
  ["aynı telefon", DU({ name: "Fatma Kaya", phone: "05321234567" }, ["m1"])], ["aynı e-posta", DU({ name: "Ali Veli", email: "MEHMET@x.com" }, ["m2"])],
  ["ayrılmış kişi", DU({ name: "Sukru Ozturk" }, ["m3"])], ["farklı kişi", DU({ name: "Ayşe Kara" }, [])], ["yalnız ad", DU({ name: "Mehmet" }, ["m2"])],
]);
const PS = (d, re) => ({ desc: String(re), fn: () => PA.summarySay(d), ok: (r) => re.test(r) });
group("Kişi ekleme (özet)")([
  ["tam", PS({ name: "Ayşe Yılmaz", kind: "family", relation: "Eş", phone: "05321234567", birth: { day: 12, month: 3, year: 1985 } }, /^Ayşe Yılmaz, aile bireyi, eş\. Telefon 0532 123 45 67\. Doğum günü 12 Mart 1985\. E-posta yok/)],
  ["boş alanlar", PS({ name: "Ali Kaya", kind: "staff", title: "Antrenör" }, /çalışan, antrenör\. Telefon, e-posta ve doğum günü yok/)],
  ["kayıt alanları", { desc: "hesapsız, biçimli telefon, ISO doğum", fn: () => PA.memberData({ name: "Ali Kaya", kind: "family", relation: "Eş", phone: "5321234567", birth: { day: 2, month: 3, year: 1990 } }, "t"), ok: (r) => r.account === false && r.status === "active" && r.phone === "0532 123 45 67" && r.birth === "1990-03-02" && r.relation === "Eş" && r.title === "" }],
]);

group("Kişi ekleme (hesap)")([
  ["e-postası olan", { desc: "e-posta giriş olur", fn: () => PA.suggestLogin({ name: "Ali Kaya", email: "Ali@x.com" }), ok: (r) => r === "ali@x.com" }],
  ["Türkçe ad", { desc: "şükrü.öztürk → sukru.ozturk", fn: () => PA.suggestLogin({ name: "Şükrü Öztürk" }), ok: (r) => r === "sukru.ozturk" }],
  ["alınmış", { desc: "ege.demir2", fn: () => PA.suggestLogin({ name: "Ege Demir" }, [{ loginName: "ege.demir" }]), ok: (r) => r === "ege.demir2" }],
  ["kullanıcı adı ege.d olsun", { desc: "ege.d", fn: (s) => PA.loginIn(s), ok: (r) => r === "ege.d" }],
  ["giriş ege@x.com olsun", { desc: "ege@x.com", fn: (s) => PA.loginIn(s), ok: (r) => r === "ege@x.com" }],
  ["evet aç", { desc: "giriş değişmez", fn: (s) => PA.loginIn(s), ok: (r) => r === "" }],
]);

