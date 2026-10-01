// Kişi türleri, yakınlık ve kimin kimi gördüğü (sunucu ve istemci ortak; saf fonksiyonlar).
// Ana hesap herkesi yönetir. Hesabı olan diğer kişilerin users.role değeri "staff", türü users.kind'dadır.

export const KINDS = ["staff", "family", "athlete", "student", "parent", "other"];
export const KIND_LABEL = { owner: "Ana hesap", staff: "Çalışan", family: "Aile bireyi", athlete: "Sporcu", student: "Öğrenci", parent: "Veli", other: "Diğer" };
export const KIND_PLURAL = { staff: "Çalışanlar", family: "Aile", athlete: "Sporcular", student: "Öğrenciler", parent: "Veliler", other: "Diğer" };
export const RELATIONS = ["Eş", "Çocuk", "Anne", "Baba", "Kardeş", "Akraba", "Diğer"];

export const kindOf = (p) => (KINDS.includes(p?.kind) ? p.kind : "staff");
// Sporcu tarafı: sporcu, öğrenci, veli (antrenörler = çalışanlar)
export const isAthleteSide = (k) => k === "athlete" || k === "student" || k === "parent";
// Fiş ekleyebilenler (ödeme bekler)
export const canReceipts = (k) => k === "owner" || k === "staff" || k === "family";

// Sabit gruplar: Ekip (çalışanlar), Aile, Sporcular (sporcu tarafı + çalışanlar)
export const GROUPS = {
  team: { name: "Ekip", icon: "users", has: (k) => k === "staff" },
  family: { name: "Aile", icon: "home", has: (k) => k === "family" },
  athletes: { name: "Sporcular", icon: "anchor", has: (k) => isAthleteSide(k) || k === "staff" },
};
export const GROUP_IDS = Object.keys(GROUPS);
export const inGroup = (gid, k) => k === "owner" || !!GROUPS[gid]?.has(k);

// Birebir yazışma: ana hesap herkesle; çalışan çalışanla ve sporcu tarafıyla; aile aileyle; sporcu tarafı çalışanlarla
export function canTalk(a, b) {
  if (a === "owner" || b === "owner") return true;
  if (a === "staff" && b === "staff") return true;
  if (a === "family" && b === "family") return true;
  if ((a === "staff" && isAthleteSide(b)) || (b === "staff" && isAthleteSide(a))) return true;
  return false;
}

// Kişi kartında eksik bilgiler (doldurmayı hatırlatmak için)
export function missingOf(m) {
  const out = [];
  if (!m.phone) out.push("telefon");
  if (!m.email && !m.loginName) out.push("e-posta");
  if (!m.birth) out.push("doğum günü");
  if (kindOf(m) === "family" && !m.relation) out.push("yakınlık");
  return out;
}

// Kullanıcı adıyla giriş: e-postası olmayanlar (çocuk, sporcu) için sahte alan adına çevrilir
export const USER_DOMAIN = "kullanici.sesliasistan.app";
export const loginEmail = (s) => {
  const t = String(s || "").trim().toLocaleLowerCase("tr-TR");
  return t.includes("@") ? t : `${t}@${USER_DOMAIN}`;
};
export const shownLogin = (email) => String(email || "").replace(`@${USER_DOMAIN}`, "");
const TR = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
// "Ege Demir" → "ege.demir"
export const suggestUsername = (name) =>
  String(name || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => TR[c])
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
export const validUsername = (u) => /^[a-z0-9][a-z0-9._-]{2,29}$/.test(u);
