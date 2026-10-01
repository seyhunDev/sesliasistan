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

// Kişiler sayfaları: Çalışanlar, Aile, Sporcular (sporcu, öğrenci, veli), Diğer
export const PEOPLE_GROUPS = {
  staff: { title: "Çalışanlar", icon: "users", kinds: ["staff"], add: "staff" },
  family: { title: "Aile", icon: "home", kinds: ["family"], add: "family" },
  athletes: { title: "Sporcular", icon: "anchor", kinds: ["athlete", "student", "parent"], add: "athlete" },
  other: { title: "Diğer", icon: "user", kinds: ["other"], add: "other" },
};
export const groupOfKind = (k) => Object.keys(PEOPLE_GROUPS).find((g) => PEOPLE_GROUPS[g].kinds.includes(k)) || "other";

// Türkiye cep numarası → WhatsApp biçimi (905321234567); geçersizse ""
export function waPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `90${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith("5")) d = `90${d}`;
  return d.length >= 11 ? d : "";
}

// Giriş bilgisi mesajı (WhatsApp)
export function loginMessage({ name, login, password, site, forName }) {
  const first = String(name || "").split(" ")[0];
  const who = forName ? `${String(forName).split(" ")[0]} için ` : "";
  return [
    `Merhaba ${first}, ${who}Sesli Asistan giriş bilgileri:`,
    site,
    `Kullanıcı adı: ${login}`,
    `Şifre: ${password}`,
    "Girdikten sonra şifreni Ayarlar'dan değiştirebilirsin.",
  ].filter(Boolean).join("\n");
}
