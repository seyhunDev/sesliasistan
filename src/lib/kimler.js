// "Kimler" (Seyhun 2026-11-26): antrenman ve yarış planı herkese ya da yalnız bir takıma (A, B) ve/veya bir yelken sınıfına.
// Plan alanları: aud = { team: "A" | "B" | "", cls: sınıf id, clsName: sınıf adı } ve audUids = o an eşleşen sporcu/öğrenci
// hesapları + çocuğu eşleşen veliler (yazarken bir kez hesaplanır; sonradan takıma eklenen sporcu eski planları görmez).
// Takım listesi orgs/{org}/takim/liste ({ map: { sporcuId: "A" } }; features/athletes/takimlar.js). Saf işlevler, test elle.mjs.
export const TEAMS = ["A", "B"];

export const cleanAud = (a) => {
  const team = TEAMS.includes(a?.team) ? a.team : "";
  const cls = typeof a?.cls === "string" ? a.cls.slice(0, 60) : "";
  return team || cls ? { team, cls, clsName: cls ? String(a?.clsName || "").slice(0, 40) : "" } : null;
};

// "A takım · Optimist" / "Herkes"
export const audLabel = (a) => {
  const x = cleanAud(a);
  return x ? [x.team && `${x.team} takım`, x.clsName].filter(Boolean).join(" · ") : "Herkes";
};

// Sporcu (kulüp kaydı) bu kitleye uyuyor mu. teams: { sporcuId: "A" }
export const athleteFits = (aud, athlete, teams = {}) => {
  const x = cleanAud(aud);
  if (!x) return true;
  return (!x.team || teams[athlete?.id] === x.team) && (!x.cls || athlete?.currentClassId === x.cls);
};

// Planı görecek hesaplar: uyan sporcuya bağlı sporcu/öğrenci hesapları + çocuğu onlardan olan veliler
export function audUids(aud, { members = [], athletes = [], teams = {} }) {
  if (!cleanAud(aud)) return null;
  // Sporcu listesi yoksa (kulüp sitesine bağlanılamadı) yalnız takım seçimi takım listesinden çalışır
  const list = athletes.length ? athletes : cleanAud(aud).cls ? [] : Object.keys(teams).map((id) => ({ id }));
  const fit = new Set(list.filter((a) => athleteFits(aud, a, teams)).map((a) => a.id));
  const kids = members.filter((m) => m?.uid && (m.kind === "athlete" || m.kind === "student") && m.athleteId && fit.has(String(m.athleteId))).map((m) => m.uid);
  const set = new Set(kids);
  members.forEach((m) => m?.uid && m.kind === "parent" && (m.children || []).some((c) => set.has(c)) && set.add(m.uid));
  return [...set];
}

// Sporcu tarafı bu planı görür mü (kitlesiz plan herkese)
export const seesPlan = (p, uid) => !p?.aud || !Array.isArray(p.audUids) || p.audUids.includes(uid);
