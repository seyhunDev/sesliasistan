// Sporcular sayfasının özet kartı ve satırları için saf hesaplar (test edilir).
// Yoklama sporcu listesinde a.att = { 2026: { "10-07": "present" } }, tek sporcu belgesinde attendance_2026 = { … }.

// Sporcunun bir yılın yoklaması (iki biçimi de okur)
export const attOf = (a, year) => a?.att?.[year] || a?.[`attendance_${year}`] || {};

// Bir sporcunun bir aydaki devamı: { present, absent, excused, total, pct } (izinli yüzdeye girmez); kayıt yoksa pct null
export function monthAtt(a, ym) {
  const [y, m] = ym.split("-");
  const c = { present: 0, absent: 0, excused: 0 };
  for (const [k, v] of Object.entries(attOf(a, y))) if (k.startsWith(`${m}-`) && c[v] != null) c[v]++;
  const counted = c.present + c.absent;
  return { ...c, total: counted + c.excused, pct: counted ? Math.round((c.present / counted) * 100) : null };
}

// Bir yılın devamı (izinli yüzdeye girmez); kayıt yoksa pct null
export function yearAtt(a, y) {
  const c = { present: 0, absent: 0, excused: 0 };
  for (const v of Object.values(attOf(a, y))) if (c[v] != null) c[v]++;
  const counted = c.present + c.absent;
  return { ...c, pct: counted ? Math.round((c.present / counted) * 100) : null };
}

// Bugünün yoklaması: { taken (en az bir kayıt var mı), present, absent, excused }
export function dayAtt(athletes, day) {
  const [y, m, d] = day.split("-");
  const c = { present: 0, absent: 0, excused: 0 };
  for (const a of athletes) {
    const v = attOf(a, y)[`${m}-${d}`];
    if (c[v] != null) c[v]++;
  }
  return { ...c, taken: c.present + c.absent + c.excused > 0 };
}

// Kulübün aylık devamı (etkin sporcuların toplamı); kayıt yoksa null
export function clubPct(athletes, ym) {
  let p = 0;
  let n = 0;
  for (const a of athletes) {
    const x = monthAtt(a, ym);
    p += x.present;
    n += x.present + x.absent;
  }
  return n ? Math.round((p / n) * 100) : null;
}

// Bu ay doğum günü olanlar, güne göre: [{ a, day, past }]
export function monthBirthdays(athletes, today) {
  const [, m, d] = today.split("-").map(Number);
  return athletes
    .map((a) => {
      const t = a.studentBirthDate ? new Date(a.studentBirthDate) : null;
      return t && !Number.isNaN(t.getTime()) && t.getMonth() + 1 === m ? { a, day: t.getDate(), past: t.getDate() < d } : null;
    })
    .filter(Boolean)
    .sort((x, y) => x.day - y.day);
}

// Listeyi sınıflara göre gruplar (sınıf sırası kulübün sırası; sınıfsızlar en sonda): [{ id, name, items }]
export function groupByClass(list, classes) {
  const groups = (classes || []).map((c) => ({ id: c.id, name: c.name, items: list.filter((a) => a.currentClassId === c.id) }));
  const known = new Set(groups.map((g) => g.id));
  const rest = list.filter((a) => !known.has(a.currentClassId));
  if (rest.length) groups.push({ id: "", name: "Sınıf atanmamış", items: rest });
  return groups.filter((g) => g.items.length);
}

// Ad soyadın baş harfleri (en çok 2)
export const initialsOf = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLocaleUpperCase("tr-TR");

// Devam yüzdesinin rengi
export const pctTone = (p) => (p == null ? "text-mut" : p >= 75 ? "text-ok" : p >= 50 ? "text-amber-600" : "text-rec");
