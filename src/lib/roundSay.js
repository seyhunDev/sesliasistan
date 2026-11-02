// Şamandıra dönüşlerini sesle girme (Seyhun 2026-11-01): kayıt listesi (yarışa katılan bütün tekneler) ve söylenen
// numaraların listeye işlenmesi. Saf işlevler, testleri scripts/asistan-test/yerel/yaris.mjs.
// - Kayıt listesi: { sail yalnız rakam, name, club, cls }. Organizasyonun PDF/fotoğraf/Excel listesinden yapay zeka okur.
// - Söylenen her şey yapay zekaya gider (api/round-say) ve komutlara çevrilir; yapay zeka yoksa yalnız rakamlar sırayla eklenir.
// - Dönüşler canlı ekranın kaydına yazılır (lib/raceRounds.js: rounds[startId] = { route, legs }).
// - Komutlar: add (sona ekle), set (N. sırayı değiştir), del (N. sırayı sil), ins (N'den sonra ekle), move (N'yi M'ye taşı),
//   next/prev (sonraki/önceki şamandıra), route (parkuru değiştir), grp (startın grubu: "sarı grup"), pen (ceza: "OCS 512").
// - Her numara kayıt listesiyle denetlenir: listede yoksa en yakın numaralar önerilir, aynı şamandırada iki kez varsa uyarılır.
//   Ses tanımanın birleştirdiği numaralar ("24 3542" → "243542") kayıt listesine göre ayrılır.

import { groupOf } from "./roundScore";
import { PEN_CODES } from "./raceRounds";

const digits = (s) => String(s ?? "").replace(/\D/g, "");
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export const sailOf = (s) => digits(s).replace(/^0+(?=\d)/, "").slice(0, 6);

// Kayıt listesi temizliği: rakamsız satır atılır, aynı sınıfta aynı numara bir kez
export function cleanEntries(list) {
  const seen = new Set();
  const out = [];
  for (const r of Array.isArray(list) ? list : []) {
    const sail = sailOf(r?.sail);
    const cls = S(r?.cls, 30);
    const born = (String(r?.born ?? "").match(/\b(19|20)\d\d\b/) || [""])[0];
    const key = `${cls.toLowerCase()}|${sail}`;
    if (!sail || seen.has(key)) continue;
    seen.add(key);
    const sex = /^(k|f|w|kız|kiz|female|girl)/i.test(String(r?.sex || "")) ? "K" : /^(e|m|erkek|male|boy)/i.test(String(r?.sex || "")) ? "E" : "";
    const x = { sail, name: S(r?.name, 60), club: S(r?.club, 60), cls };
    if (born) x.born = born;
    if (sex) x.sex = sex;
    if (S(r?.cat, 12)) x.cat = S(r.cat, 12);
    if (groupOf(r?.grp)) x.grp = groupOf(r.grp);
    out.push(x);
    if (out.length >= 600) break;
  }
  return out;
}
// Kayıt listesinin sınıfları (en kalabalık önce)
export function entryClasses(list) {
  const n = new Map();
  for (const r of list || []) n.set(r.cls || "", (n.get(r.cls || "") || 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]).map(([cls, c]) => ({ cls, n: c }));
}
export const entriesOf = (list, cls) => (list || []).filter((r) => !cls || (r.cls || "") === cls);
// İki listeyi birleştir (yeni okunan eskinin üstüne; adı boş gelen eskisini korur)
export function mergeEntries(old, add) {
  const key = (r) => `${(r.cls || "").toLowerCase()}|${r.sail}`;
  const m = new Map((old || []).map((r) => [key(r), r]));
  for (const r of cleanEntries(add)) {
    const o = m.get(key(r));
    m.set(key(r), o ? { ...o, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v)) } : r);
  }
  return cleanEntries([...m.values()]);
}

// Birleşik rakamları bilinen numaralara ayır ("243542" → ["24","3542"]). Bilinen numara ise dokunulmaz; ayrılamazsa olduğu gibi.
export function splitRun(run, known) {
  const s = sailOf(run);
  const set = known instanceof Set ? known : new Set(known || []);
  if (!s || set.has(s) || !set.size) return s ? [s] : [];
  // En az parçaya bölme (dinamik programlama); her parça bilinen numara olmalı
  const best = new Array(s.length + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < s.length; i++) {
    if (!best[i]) continue;
    for (let j = i + 1; j <= Math.min(s.length, i + 6); j++) {
      const p = s.slice(i, j);
      if (p[0] === "0" || !set.has(p)) continue;
      if (!best[j] || best[j].length > best[i].length + 1) best[j] = [...best[i], p];
    }
  }
  return best[s.length] && best[s.length].length > 1 ? best[s.length] : [s];
}

// Yazıdaki numaralar sırayla ("24, 3542 2 5 ve 734" → ["24","3542","2","5","734"]); birleşikler kayıt listesine göre ayrılır
export function sailsIn(text, known) {
  return (String(text || "").match(/\d+/g) || []).flatMap((r) => splitRun(r, known));
}

// İki numara arasındaki fark (bir rakam yanlış, eksik, fazla ya da yer değiştirmiş = 1)
function dist(a, b) {
  if (a === b) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
// Listede olmayan numaraya en yakın bilinen numaralar (en çok 3; önce aynı uzunluktakiler)
export function nearSails(sail, known, skip = []) {
  const s = sailOf(sail);
  const no = new Set(skip);
  return [...new Set(known || [])]
    .filter((k) => k !== s && !no.has(k))
    .map((k) => ({ k, d: dist(s, k) + (k.length === s.length ? 0 : 0.5) }))
    .filter((x) => x.d <= 1.5)
    .sort((a, b) => a.d - b.d || a.k.localeCompare(b.k, "tr", { numeric: true }))
    .slice(0, 3)
    .map((x) => x.k);
}

// Bir şamandıranın listesindeki her satırın durumu: ok (kayıtlı), near (öneriler), dup (aynı numara daha önce)
export function checkLeg(leg, known) {
  const set = new Set(known || []);
  const seen = new Set();
  return (leg || []).map((sail) => {
    const dup = seen.has(sail);
    seen.add(sail);
    const ok = !set.size || set.has(sail);
    return { sail, ok, dup, near: ok ? [] : nearSails(sail, set, leg) };
  });
}

const clampPos = (p, len) => Math.max(1, Math.min(len, Math.round(Number(p) || 0)));
const posOk = (p, len) => Number.isFinite(Number(p)) && Number(p) >= 1 && Number(p) <= len;

// Komutları uygula. state { legs: şamandıra başına dönüş listeleri (parkur sırasıyla), k: şu anki şamandıra (0'dan), route }.
// "sonraki şamandıra" k'yı ilerletir, ardından gelen numaralar yeni şamandıraya yazılır.
// Dönüş { legs, k, route, done: uygulanan komut sayısı, skip: uygulanamayanlar }
export function applySay(state, ops, known) {
  const legs = (state?.legs || []).map((l) => [...(l || [])]);
  let k = Math.max(0, Number(state?.k) || 0);
  let route = [...(state?.route || [])];
  let grp = state?.grp || "";
  const pen = { ...(state?.pen || {}) }; // ceza: { yelken: OCS | BFD | … } (Seyhun 2026-11-02 inceleme)
  const set = new Set(known || []);
  const split = (list) => (Array.isArray(list) ? list : [list]).flatMap((x) => splitRun(x, set)).filter(Boolean);
  let done = 0;
  const skip = [];
  const dup = []; // aynı şamandırada zaten yazılı olanlar (bir tekne bir noktayı bir kez döner)
  let leg = [];
  const fix = (list, keep = -1) =>
    split(list).filter((x, i, a) => {
      const twice = a.indexOf(x) !== i || leg.some((y, j) => y === x && j !== keep);
      if (twice) dup.push(x);
      return !twice;
    });
  for (const o of Array.isArray(ops) ? ops : []) {
    while (legs.length <= k) legs.push([]);
    leg = legs[k];
    const op = o?.op;
    if (op === "add") {
      const add = fix(o.sails);
      if (!add.length) skip.push(o);
      else leg.push(...add), done++;
    } else if (op === "set") {
      const v = posOk(o.pos, leg.length) ? fix(o.sails ?? o.sail, o.pos - 1) : [];
      if (!v.length) skip.push(o);
      else leg.splice(o.pos - 1, 1, ...v), done++;
    } else if (op === "del") {
      const i = posOk(o.pos, leg.length) ? o.pos - 1 : o.sails?.length ? leg.lastIndexOf(sailOf(o.sails[0])) : -1;
      if (i >= 0) leg.splice(i, 1), done++;
      else skip.push(o);
    } else if (op === "ins") {
      const v = fix(o.sails ?? o.sail);
      const after = Math.round(Number(o.after));
      if (!v.length || !(after >= 0 && after <= leg.length)) skip.push(o);
      else leg.splice(after, 0, ...v), done++;
    } else if (op === "move") {
      if (!posOk(o.pos, leg.length)) skip.push(o);
      else {
        const [x] = leg.splice(o.pos - 1, 1);
        leg.splice(clampPos(o.to, leg.length + 1) - 1, 0, x);
        done++;
      }
    } else if (op === "next" || op === "prev") {
      const last = Math.max(0, route.length - 1);
      k = op === "next" ? Math.min(last, k + 1) : Math.max(0, k - 1);
      done++;
    } else if (op === "route") {
      const r = cleanRoute(o.route);
      if (r.length) (route = r), (k = Math.min(k, r.length - 1)), done++;
      else skip.push(o);
    } else if (op === "pen") {
      const list = split(o.sails);
      if (!list.length || !(PEN_CODES.includes(o.code) || o.code === "-")) skip.push(o);
      else {
        for (const x of list) if (o.code === "-") delete pen[x];
        else pen[x] = o.code;
        done++;
      }
    } else if (op === "grp") {
      if (o.grp) (grp = o.grp), done++;
      else skip.push(o);
    } else if (o) skip.push(o);
  }
  while (legs.length > Math.max(route.length, 1) && !legs[legs.length - 1].length) legs.pop();
  return { legs, k, route, grp, pen, done, skip, dup: [...new Set(dup)] };
}

// Parkur: "1 4 1 2 3 finiş" → ["1","4","1","2","3","F"]; başlangıç/start yazılmaz
export function cleanRoute(list) {
  const src = Array.isArray(list) ? list : String(list || "").split(/[\s,·\-–>]+/);
  return src
    .map((x) => String(x ?? "").trim().toLocaleLowerCase("tr-TR"))
    .map((x) => (/^(f|fin|finiş|finish|bitiş|varış)$/.test(x) ? "F" : /^[1-9]\.?$/.test(x) ? x[0] : ""))
    .filter(Boolean)
    .slice(0, 20);
}

// Yapay zeka yokken: yalnız rakamlar sırayla eklenir (komut sözcüğü varsa uygulanmaz, kullanıcıya söylenir)
// Ceza sözcükleri: "OCS 512", "kara bayrak 88", "512 diskalifiye", "88'in cezası kalksın"
export function penOf(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  if (/ceza(sı|si)?\s*(kalk|sil|yok)|cezayı\s*(kaldır|sil)/.test(t)) return "-";
  const m = t.match(/\b(ocs|bfd|ufd|dsq|dnf|ret|dns)\b/);
  if (m) return m[1].toUpperCase();
  if (/kara\s*bayrak/.test(t)) return "BFD";
  if (/erken\s*(çıktı|start)/.test(t)) return "OCS";
  if (/diskalifiye/.test(t)) return "DSQ";
  if (/bitir(e)?medi|bırakt[ıi]|çekildi/.test(t)) return "RET";
  return "";
}
export function localSay(text, known) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  const pc = penOf(t);
  if (pc) {
    const sails = sailsIn(t.replace(/\b(ocs|bfd|ufd|dsq|dnf|ret|dns)\b/g, " "), known);
    return sails.length ? [{ op: "pen", code: pc, sails }] : null;
  }
  if (/sıra|sil|değiş|taşı|sonra|önce|sonraki|önceki|parkur|grup|yap\b/.test(t)) return null;
  const sails = sailsIn(t, known);
  return sails.length ? [{ op: "add", sails }] : null;
}

// Komutların temizliği (yapay zekadan gelen)
export function cleanOps(list) {
  const OPS = ["add", "set", "del", "ins", "move", "next", "prev", "route", "grp", "pen"];
  return (Array.isArray(list) ? list : [])
    .filter((o) => OPS.includes(o?.op))
    .map((o) => {
      const sails = (Array.isArray(o.sails) ? o.sails : o.sail != null ? [o.sail] : []).map(sailOf).filter(Boolean).slice(0, 200);
      const n = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : undefined);
      return Object.fromEntries(Object.entries({ op: o.op, sails: sails.length ? sails : undefined, pos: n(o.pos), after: n(o.after), to: n(o.to), route: o.op === "route" ? cleanRoute(o.route) : undefined, grp: o.op === "grp" ? groupOf(o.grp) || undefined : undefined, code: o.op === "pen" ? ([...PEN_CODES, "-"].includes(String(o.code || "").toUpperCase()) ? String(o.code).toUpperCase() : undefined) : undefined }).filter(([, v]) => v !== undefined));
    })
    .slice(0, 30);
}

// Şamandırada henüz geçmeyenler: önceki noktayı dönen (ilk noktada bütün kayıtlılar) ama bu noktada olmayanlar
export function notYet(legs, k, known) {
  const prev = k > 0 ? legs?.[k - 1] || [] : known || [];
  const here = new Set(legs?.[k] || []);
  return [...new Set(prev)].filter((s) => !here.has(s));
}
