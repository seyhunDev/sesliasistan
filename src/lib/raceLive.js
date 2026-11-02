// Yarış multimedya sayfası (/athletes/races/<id>/media) saf parçaları: rüzgâr kayıtları, startlar, fotoğraf/video künyeleri,
// genel sıralama süzgeci ve asistan cümleleri. Kayıt orgs/{org}/raceLive/{yarışId} belgesinde (raceLiveStore.js):
// { wind: [{ at, dir, kn, gust, src }], starts: [{ id, day, n, at, dir, kn, course, flag, note }], media: [{ id, kind, type, size, url, at, ath }] }
import { cleanAgenda } from "./raceProgram";
// (ath: fotoğrafta/videoda etiketlenen sporcuların id'leri; phase/sec/end: çekildiği an start sayacına göre, momentOf).
// Rüzgâr kaydının `src` alanı "elle" ya da ileride bağlanacak ölçüm cihazının adı: grafik ikisini aynı noktalarla çizer.

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, max) => (Number.isFinite(Number(v)) && v !== null && v !== "" && Number(v) >= 0 && Number(v) <= max ? Math.round(Number(v)) : null);
const ISO = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : "");
const ID = /^[\w-]{1,40}$/;
const cleanIds = (v) => [...new Set((Array.isArray(v) ? v : []).filter((x) => typeof x === "string" && ID.test(x)))].slice(0, 30);

// Sekiz yön: rüzgârın geldiği yön (derece)
export const DIRS = [["K", 0], ["KD", 45], ["D", 90], ["GD", 135], ["G", 180], ["GB", 225], ["B", 270], ["KB", 315]];
export const dirShort = (deg) => DIRS[Math.round((((Number(deg) % 360) + 360) % 360) / 45) % 8][0];

const pad = (n) => String(n).padStart(2, "0");
// Telefonun saatine göre gün ve saat ("2026-10-19", "13:05")
export const dayOf = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const hm = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
// "2026-10-19" + "13:05" → ISO (telefonun saat dilimi)
export const atOf = (day, time) => new Date(`${day}T${/^\d{2}:\d{2}$/.test(time || "") ? time : "12:00"}:00`).toISOString();

export function cleanWind(list) {
  return (Array.isArray(list) ? list : [])
    .map((w) => {
      const ckn = Number(w?.ckn);
      const cur = Number.isFinite(ckn) && ckn > 0 && ckn <= 10 ? Math.round(ckn * 10) / 10 : null;
      // Akıntı (Seyhun 2026-10-18): hız knot (ondalıklı) ve nereye aktığı; not: serbest ayrıntı
      return { at: ISO(w?.at), dir: num(w?.dir, 359), kn: num(w?.kn, 80), gust: num(w?.gust, 99), src: S(w?.src, 20) || "elle", ckn: cur, cdir: cur ? num(w?.cdir, 359) : null, note: S(w?.note, 200) };
    })
    .filter((w) => w.at && w.dir !== null && w.kn !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-500);
}

export const COURSES = ["Trapez", "Up-down", "Üçgen"];
// Bayrak: yarış geçerli kalır. Geçersiz sayılan yarış (VOIDS, Seyhun 2026-10-18): tehir, genel geri çağırma ya da iptal; numarası sıradaki
// yarışa geçer (tekrar koşulan yarış yine "2. yarış"), çekimlerinin başlığına sebep eklenir ("Genel geri çağırma · 2. yarış")
export const FLAGS = ["Bireysel geri çağırma"];
// Abandone (N bayrağı; Seyhun 2026-11-02 "abandone edilince yarış sayılmıyor, datası tutulur, aynı yarış tekrar start"): eskiden "İptal"
export const VOIDS = ["Tehir", "Genel geri çağırma", "Abandone"];
const OLD_VOID = { Ertelendi: "Tehir", "Genel geri çağırma": "Genel geri çağırma", İptal: "Abandone" }; // eskiden bayrak olarak yazılanlar
// Parkur noktaları (Seyhun 2026-10-19): Süre'de Start · Şamandıra 1 · Şamandıra 2 · Finish kareleri; şamandıra eklenip çıkarılır.
// Kareye dokununca o yarışın startından beri geçen saniye yazılır (yarış satırında marks: { "Şamandıra 1": 580 }).
export const BUOYS = ["Start", "Şamandıra 1", "Şamandıra 2", "Finish"];
export function cleanBuoys(list) {
  const mid = (Array.isArray(list) ? list : []).filter((b) => /^Şamandıra \d{1,2}$/.test(b || ""));
  return ["Start", ...(Array.isArray(list) ? mid : BUOYS.slice(1, -1)).slice(0, 6), "Finish"];
}
// + son şamandıradan sonra yenisi; − son şamandırayı çıkarır (Start ve Finish kalır)
export const addBuoy = (list) => (list.length >= 8 ? list : [...list.slice(0, -1), `Şamandıra ${list.length - 1}`, "Finish"]);
export const dropBuoy = (list) => (list.length <= 2 ? list : [...list.slice(0, -2), "Finish"]);
const cleanMarks = (m) =>
  Object.fromEntries(
    Object.entries(m && typeof m === "object" ? m : {})
      .filter(([k, v]) => /^(Start|Finish|Şamandıra \d{1,2})$/.test(k) && num(v, 36000) !== null)
      .slice(0, 8)
      .map(([k, v]) => [k, num(v, 36000)]),
  );
// Yarışın sıradaki noktası (çerçeveli kare): yazılmamış ilk nokta
export const nextBuoy = (buoys, s) => buoys.find((b) => s?.marks?.[b] == null) || "";
// Bizim sporcuların bitişi (Seyhun 2026-11-01, yeni akış "Bitiren kim?"): sırayla { id, name, t: startan beri sn }
const cleanFins = (l) => {
  const seen = new Set();
  return l
    .map((f) => ({ id: S(f?.id, 60), name: S(f?.name, 60), ...(num(f?.t, 36000) !== null ? { t: num(f.t, 36000) } : {}) }))
    .filter((f) => f.id && f.name && !seen.has(f.id) && seen.add(f.id))
    .slice(0, 40);
};
export function cleanStarts(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({
      id: ID.test(x?.id || "") ? x.id : "",
      day: /^\d{4}-\d{2}-\d{2}$/.test(x?.day || "") ? x.day : "",
      n: num(x?.n, 99) || 1,
      name: S(x?.name, 40),
      cd: ISO(x?.cd),
      at: ISO(x?.at),
      fin: ISO(x?.fin),
      dir: num(x?.dir, 359),
      kn: num(x?.kn, 80),
      course: S(x?.course, 30),
      flag: FLAGS.includes(x?.flag) ? x.flag : "",
      void: VOIDS.includes(x?.void) ? x.void : OLD_VOID[x?.void] || OLD_VOID[x?.flag] || "",
      note: S(x?.note, 200),
      // grp: startın grubu (Mavi, Sarı…; grup grup yarışta aynı yarışın her grubu ayrı start, numara ortak)
      ...(x?.grp ? { grp: S(String(x.grp).replace(/[^\p{L} ]/gu, ""), 20) } : {}),
      marks: cleanMarks(x?.marks),
      ...(Array.isArray(x?.fins) && x.fins.length ? { fins: cleanFins(x.fins) } : {}),
    }))
    .filter((x) => x.id && x.day && x.at)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-200);
}

// ph: yalnız çekildiği telefonda duran büyük video (Seyhun 2026-11-02 "belli boyutun üstündeyse sadece telefonda tutalım"):
// adresi yok, küçük resmi buluttadır; istenince "Buluta yükle" ile url gelir, ph kalkar
export function cleanMedia(list) {
  return (Array.isArray(list) ? list : [])
    .map((m) => ({ id: ID.test(m?.id || "") ? m.id : "", kind: m?.kind === "video" ? "video" : "photo", type: S(m?.type, 40), size: Number(m?.size) || 0, url: /^https:\/\//.test(m?.url || "") ? S(m.url, 600) : "", at: ISO(m?.at), ...(/^https:\/\//.test(m?.thumb || "") ? { thumb: S(m.thumb, 600) } : {}), ath: cleanIds(m?.ath), ...(Number(m?.dur) > 0 ? { dur: Math.min(600, Math.round(m.dur)) } : {}), ...(Number(m?.w) > 0 && Number(m?.h) > 0 ? { w: Math.min(8000, Math.round(m.w)), h: Math.min(8000, Math.round(m.h)) } : {}), ...(typeof m?.asset === "string" && m.asset ? { asset: S(m.asset, 120) } : {}), ...(m?.ph === true && !/^https:\/\//.test(m?.url || "") ? { ph: true } : {}), ...cleanMoment(m) }))
    .filter((m) => m.id && (m.url || m.ph) && m.at)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-400);
}

// Elle eklenen günler (antrenman: yarıştan önce ya da sonra; Seyhun 2026-10-18)
export const cleanDays = (list) => [...new Set((Array.isArray(list) ? list : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "")))].sort().slice(0, 60);
// Günün programı (Seyhun 2026-11-01 "ilk yönetim sayfası günün start saatini belirlemek"): day günü, at ilk start saati ("11:00"),
// order yapılacak startlar [{ cls, grp, prep }] (Başlat ilkini kullanır ve listeden düşer; 2026-11-01), status: "" bekleniyor · "ap" ertelendi · "none" bugün yarış yok · "done" gün bitti (ekranda özet),
// next yarının günü ve ilk start saati, showAt ekranın yeni güne geçeceği saat (varsayılan 06:00). Herkese açık ekranın evresi buna göre (livePhase).
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const PLAN_STATUS = ["", "ap", "none", "done"];
export function cleanPlan(p) {
  const hm = (v, d = "") => (HM.test(v || "") ? v : d);
  const day = DAY.test(p?.day || "") ? p.day : "";
  const order = (Array.isArray(p?.order) ? p.order : [])
    .map((o) => ({ cls: String(o?.cls || "").slice(0, 20), grp: String(o?.grp || "").slice(0, 20), prep: String(o?.prep || "").slice(0, 8) }))
    .filter((o) => o.cls || o.grp)
    .slice(0, 24);
  const next = p?.next && DAY.test(p.next.day || "") ? { day: p.next.day, at: hm(p.next.at) } : null;
  const status = PLAN_STATUS.includes(p?.status) ? p.status : "";
  // Tehir (Seyhun 2026-11-01 "bir sebep belirterek tehir basabilirim, bir saatlik"): from eski saat, why sebep; at yeni saat (belirsizse boş)
  // down (Seyhun 2026-11-02 "1 dk sonra indir, 5 dk sonra indir ya da belirsiz"): AP'nin ineceği an (ISO; "" belirsiz). İnince 1 dk sonra
  // uyarı işareti, yani geri sayım: warn o an (ISO), warnBy kuran cihaz (geri sayımı o başlatır, aynı anda iki start açılmasın)
  const iso = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v.slice(0, 30) : "");
  const ap = status === "ap" && p?.ap ? { from: hm(p.ap.from), why: String(p.ap.why || "").slice(0, 60), down: iso(p.ap.down), land: !!p.ap.land } : null;
  const warn = status === "ap" ? "" : iso(p?.warn);
  const warnBy = warn ? String(p?.warnBy || "").slice(0, 12) : "";
  // Günün grupları (Seyhun 2026-11-02 "startlar-yeni"): bir kez seçilir, "+ Yarış" bunlarla bir yarışın startlarını ekler
  const grps = [...new Set((Array.isArray(p?.grps) ? p.grps : []).map((g) => String(g || "").slice(0, 20)).filter(Boolean))].slice(0, 6);
  // Birden çok sınıf (Seyhun 2026-11-02 "bir iki sınıf seçerim, sınıf seçiliyse grup seçerek başlarım"): sets [{ cls, grps }]; yoksa cls + grps
  const sets = (Array.isArray(p?.sets) ? p.sets : [])
    .map((x) => ({ cls: String(x?.cls || "").slice(0, 20), grps: [...new Set((Array.isArray(x?.grps) ? x.grps : []).map((g) => String(g || "").slice(0, 20)).filter(Boolean))].slice(0, 6) }))
    .filter((x) => x.cls)
    .slice(0, 6);
  // Günler (Seyhun 2026-11-02 "her gün startı 11 yapacağım"): daily her günün ilk start saati, times[gün] o güne özel saat, off yarış olmayan günler
  const times = Object.fromEntries(Object.entries(p?.times && typeof p.times === "object" ? p.times : {}).filter(([d, v]) => DAY.test(d) && HM.test(v || "")).slice(0, 20));
  const off = [...new Set((Array.isArray(p?.off) ? p.off : []).filter((d) => DAY.test(d || "")))].slice(0, 20);
  // Turuncu bayrak (Seyhun 2026-11-02 "turuncu bayrak basılınca artık start öncesi"): çekildiği an (ISO); "" indi. Ekran yalnız o gün ve gün bitmemişken sayar
  const orange = typeof p?.orange === "string" && !Number.isNaN(Date.parse(p.orange)) ? p.orange.slice(0, 30) : "";
  return { day, at: hm(p?.at), order, status, next, showAt: hm(p?.showAt, "06:00"), ap, grps, sets, cls: String(p?.cls || "").slice(0, 20), prep: String(p?.prep || "").slice(0, 8), daily: hm(p?.daily), times, off, orange, warn, warnBy, agenda: cleanAgenda(p?.agenda) };
}
// Tehir cümlesi: "Start 12:00'a ertelendi (11:00) · Rüzgâr yok" ya da "Start ertelendi, yeni saat belli değil · Fırtına"
export function apText(plan) {
  if (!plan || plan.status !== "ap") return "";
  const why = plan.ap?.why || "";
  // Start saati yazılmaz (Seyhun 2026-11-02 "orada yanlış bilgi veriliyor"): denizde inişten 1 dk sonra, karada çok sonra start olabilir
  const base = plan.ap?.down
    ? `Tehir iniş ${trHm(plan.ap.down)}`
    : plan.at ? `Start ${plan.at}'a ertelendi${plan.ap?.from ? ` (${plan.ap.from})` : ""}` : "Start ertelendi, yeni saat belli değil";
  return [base, plan.ap?.land ? "Karada" : "", why].filter(Boolean).join(" · ");
}
// ISO an → Türkiye saatiyle "12:31"
export const trHm = (iso) => (Date.parse(iso || "") ? new Date(Date.parse(iso) + 3 * 3600e3).toISOString().slice(11, 16) : "");
// Tehir (AP) çekilir: down dakika sonra iner (0 = belirsiz). Start saati belli değil (at boş). land: karada tehir (AP üstünde H; Seyhun
// 2026-11-02 "karada çekiliyorsa indikten bir saat sonra, denizde bir dakika sonra start verilebilir"). Döndürür plan yaması.
export function apRaise(plan, now, min, why, land = false) {
  const down = min ? new Date(now + min * 60e3).toISOString() : "";
  return { status: "ap", at: "", ap: { from: plan?.ap?.from || plan?.at || "", why, down, land: !!land }, warn: "" };
}
// Tehir iner (zamanı gelince kendiliğinden ya da "Tehiri indir"). Denizde: 1 dk sonra uyarı işareti, geri sayım kendiliğinden başlar;
// start saati o an belli olur. Karada: geri sayım kendiliğinden başlamaz, start saati yazılmaz (komite denize çıkınca Başlat).
export function apLower(now, dur = 300, by = "", land = false) {
  if (land) return { status: "", ap: null, warn: "", at: "" };
  const warn = new Date(now + 60e3).toISOString();
  return { status: "", ap: null, warn, warnBy: by, at: trHm(new Date(now + 60e3 + dur * 1000).toISOString()) };
}
// İnişi gelmiş tehir / gelmiş uyarı işareti
export const apDue = (plan, now) => plan?.status === "ap" && !!plan.ap?.down && Date.parse(plan.ap.down) <= now;
export const warnDue = (plan, now) => !!plan?.warn && Date.parse(plan.warn) <= now;
// Tehirin inişi: 1 dk, 5 dk… sonra (Seyhun 2026-11-02); 1 dk: geri sayımda tehir (AP inince 1 dk sonra uyarı işareti; Seyhun 2026-11-02 "geri sayımda tehir 1 dakikalık olmalı")
export const AP_MIN = [1, 5, 15, 30, 60];
export const AP_WHY = ["Rüzgâr yok", "Çok rüzgâr", "Yağış", "Fırtına", "Diğer"];
// Saate dakika ekler: "11:00" + 60 → "12:00" (23:59'u aşmaz)
export const addMin = (at, min) => {
  if (!HM.test(at || "")) return "";
  const t = Math.min(23 * 60 + 59, +at.slice(0, 2) * 60 + +at.slice(3) + min);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
export const planLabel = (o) => [o.cls, o.grp].filter(Boolean).join(" · ");
// Ekranın günü (Seyhun 2026-11-02 "ekran yeni güne geçer'i 22.10 yaptım, geçmedi"): "Ekran yeni güne geçer" öğleden sonra bir saatse
// (ör. 22:10) o saatten sonra ekran ertesi güne geçer (bugün yarış yok ya da gün bittiyse yarının programı, saati, rüzgârı); sabah bir
// saatse (06:00) gün bittikten sonra ertesi sabah o saatte geçer (livePhase). Sayaç sürerken geçmez.
export function screenDay(plan, now, timer = null) {
  const tr = new Date(now + 3 * 3600e3).toISOString();
  const today = tr.slice(0, 10);
  const sa = cleanPlan(plan).showAt || "06:00";
  if (sa < "12:00" || tr.slice(11, 16) < sa) return today;
  if (timer && ((timer.end != null && now < timer.end + 3600e3) || timer.left != null)) return today;
  return new Date(Date.parse(`${today}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
}
// Ekranın evresi: "race" sayaç sürüyor ya da bugün start var; "summary" gün bitti (ertesi gün showAt'e kadar); "wait" start bekleniyor
export function livePhase({ plan, starts, timer, today, now = Date.now() }) {
  const pl = plan || cleanPlan({});
  const racing = (timer && timer.end != null) || (starts || []).some((x) => x.day === today && !x.void);
  if (pl.status === "done" && pl.day) {
    const nextDay = pl.next?.day || "";
    const flip = nextDay ? Date.parse(`${nextDay}T${pl.showAt || "06:00"}:00+03:00`) : NaN;
    return nextDay && now >= flip ? "wait" : "summary";
  }
  return racing ? "race" : "wait";
}
// Bekleme ekranının saydığı start: bugünün planı ya da yarınki (gün bittiyse next)
export function planStartMs(plan, today) {
  const pl = plan || cleanPlan({});
  const pick = pl.status === "done" && pl.next ? pl.next : pl.day && pl.day >= today ? { day: pl.day, at: pl.at } : null;
  return pick?.day && pick.at ? Date.parse(`${pick.day}T${pick.at}:00+03:00`) : null;
}
export const cleanLive = (d) => ({ wind: cleanWind(d?.wind), starts: cleanStarts(d?.starts), media: cleanMedia(d?.media), days: cleanDays(d?.days), buoys: cleanBuoys(d?.buoys), plan: cleanPlan(d?.plan) });

// Günün kayıtları
// Sayfadaki günler: yarışın günleri + çekim ya da start olan başka günler (deneme, erteleme). Yoksa o gün çekilen kaydedilir ama
// hiçbir gün seçilemediği için görünmezdi (Seyhun 2026-10-18: "kaydet dediğimde kaydedilmedi").
// Startan beri ileri sayım en çok 59:59 (Seyhun 2026-10-18: "bir saatlik limit olsun, 59:59'da bitsin"); sayaç 60. dakikada kendiliğinden durur (TimerSound)
export const UP_MAX = 3599;
// Cihazlar arası sayaç (useLiveSync): belgeye yazılan alanlar ve uzaktaki sayacın bu cihaza yazılıp yazılmayacağı.
// Sayfa ilk açılırken (first) yalnız süren sayaç alınır; durmuş eski kayıt buradaki antrenman sayacını durdurmaz.
// Denemeleri sıfırla (Seyhun 2026-10-19): elle eklenen günler, yarışlar (süreler, şamandıra zamanları), rüzgâr kayıtları, parkur noktaları
// ve sayaç; fotoğraf/video yalnız istenirse. Yarışın kendisi, sonuçlar, evrak ve bütçe yarış belgesinde durur, dokunulmaz.
// Yayın da sıfırlanır (Seyhun 2026-11-02 "denemeden sonra grupları, yarışları sıfırlayabilmeliyim"): program (bekleyen startlar, gruplar,
// tehir), dönüşler ve ekrandaki görüntü/yazı da baştan başlar. Kayıt listesi (tekneler), parkur kartları ve canlı yayın linki kalır.
export const resetCounts = (l) => ({ days: l?.days?.length || 0, starts: l?.starts?.length || 0, wind: l?.wind?.length || 0, media: l?.media?.length || 0, plan: l?.plan?.order?.length || 0 });
// Yayını sıfırla (Seyhun 2026-11-02 "yayınla ilgili yaptığım her şey sıfırlanmalı, hazırladığımız her şey aynı kalıyor"): video linki,
// gösterim de baştan; keep.plan verilirse programın günleri ve saatleri (daily, times, off, showAt) ve yarışın kurulumu (sınıflar, gruplar) kalır
// keep.drone, keep.sources: drone ve canlı kaynak bağlantıları sıfırlamada kalır (Seyhun 2026-11-02 "sadece bağlanması kalsın")
export function resetPatch(media, now, keep = {}) {
  const kp = keep.plan ? { daily: keep.plan.daily, times: keep.plan.times, off: keep.plan.off, showAt: keep.plan.showAt, agenda: keep.plan.agenda, sets: keep.plan.sets, cls: keep.plan.cls, grps: keep.plan.grps } : {};
  const p = { days: [], starts: [], wind: [], buoys: cleanBuoys(), timer: { ...pickTimer({}), at: now }, plan: cleanPlan(kp), rounds: {}, screen: { kind: "", mid: "", loop: false, pause: false, caption: "", at: new Date(now).toISOString() }, stream: { url: "", drone: keep.drone || "", sources: (keep.sources || []).filter((x) => x && x.id) }, courseShow: { auto: true, at: "", one: "" } };
  if (media) p.media = [];
  return p;
}
export const pickTimer = (t) => ({ dur: t?.dur ?? 300, end: t?.end ?? null, left: t?.left ?? null, mode: t?.mode || "", rid: t?.rid || "", zero: t?.zero ?? null, own: t?.own || "", where: t?.where || "" });
// Sayacın sahibi (Seyhun 2026-10-21: "süreyi başlatıyorum, diğer yarışın sayımını açıyor"): sayaç telefonda tek, ama her sayfa yalnız kendi
// başlattığını gösterir. own = sayacın sayfası (yol, antrenmanda ?id=plan). Biri planlı biri plansız antrenman adresiyse yol yeter (asistan
// "/training/day" yazar, sayfa "?id=" ile açılmış olabilir). own'u olmayan eski kayıt her sayfanındır.
export function ownedBy(own, here) {
  if (!own || own === here) return true;
  const [a, qa] = String(own).split("?");
  const [b, qb] = String(here || "").split("?");
  return a === b && (!qa || !qb);
}
export function takeTimer(remote, mine, first, now) {
  if (!remote) return false;
  if (JSON.stringify(pickTimer(remote)) === JSON.stringify(pickTimer(mine))) return false;
  // Açılışta: yalnız süren sayaç; bu telefonda ondan sonra (ör. antrenmanda Bitir) yazılmış sayaç varsa eski kayıt geri gelmez
  if (first) return remote.end != null && now < remote.end + (UP_MAX + 1) * 1000 && !((mine?.at || 0) > (remote.at || 0));
  return true;
}
// Start dizisi şeridi (Yarış Kuralları 26): 5 dk'da uyarı, 4'te hazırlık, 1'de son dakika, 0'da start. Süre kısaysa olmayanlar düşer.
export function seqSteps(dur) {
  const top = Math.round((dur || 0) / 60);
  const name = { 4: "Hazırlık", 1: "Son dk", 0: "Start" };
  return [...new Set([top, 4, 1, 0])].filter((m) => m <= top).sort((a, b) => b - a).map((m) => ({ m, name: m === top && m > 4 ? "Uyarı" : name[m] || "Uyarı" }));
}
// Kalan saniyeye göre: geçen işaretler (done), son geçilen (now)
export function seqState(steps, rem, running) {
  if (!running) return steps.map(() => "");
  const passed = steps.map((x) => rem <= x.m * 60);
  const last = passed.lastIndexOf(true);
  return steps.map((_, i) => (i === last ? "now" : passed[i] ? "done" : ""));
}

export const upSec = (end, now) => Math.min(UP_MAX, Math.max(0, Math.floor((now - end) / 1000)));
export const liveDays = (days, live) =>
  [...new Set([...(days || []), ...(live?.days || []), ...[...(live?.media || []), ...(live?.starts || [])].map((x) => dayOf(x.at)).filter((d) => /^\d{4}-/.test(d))])].sort();
// Bugün listede yoksa da gösterilir (Seyhun 2026-10-19: "açtığım zaman bugün gösterilmesi lazım"; dün eklenen antrenman günü
// varken sayfa son yarış gününü açıyordu). Yarışın ilk gününden 14 gün öncesine ve son gününden 1 gün sonrasına kadar.
const plus = (d, n) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export function withToday(days, rdays, today) {
  if (!today || days.includes(today) || !rdays?.length) return days;
  if (today < plus(rdays[0], -14) || today > plus(rdays[rdays.length - 1], 1)) return days;
  return [...days, today].sort();
}
// Gün adları: yarış günleri "1. gün" (tek günse "Yarış"), diğerleri tarih sırasıyla "Antrenman 1", "Antrenman 2" (öncesi ve sonrası)
export function dayNames(rdays, days) {
  let k = 0;
  return Object.fromEntries(
    (days || []).map((d) => {
      const i = (rdays || []).indexOf(d);
      return [d, i >= 0 ? (rdays.length > 1 ? `${i + 1}. gün` : "Yarış") : `Antrenman ${++k}`];
    }),
  );
}
export const windOn = (wind, day) => (wind || []).filter((w) => dayOf(w.at) === day);
export const startsOn = (starts, day) => (starts || []).filter((x) => x.day === day);

// Saatlik grafikte noktalar: satırlar 00..23 ise saat + dakika/60 sıradaki yer. rows: [{ hh }]
export function marksFor(rows, wind) {
  if (!rows?.length) return [];
  const h0 = +rows[0].hh;
  const last = rows.length - 1;
  return (wind || [])
    .map((w) => {
      const d = new Date(w.at);
      return { i: d.getHours() + d.getMinutes() / 60 - h0, kn: w.kn, dir: w.dir, hh: pad(d.getHours()) };
    })
    .filter((m) => m.i >= 0 && m.i <= last);
}

// Sayaç 0 olunca yeni start (sayaç yarışa bağlı değilse): serinin sıradaki numarası, o anki rüzgâr (son 90 dakikadaki elle kayıt, yoksa tahmin)
export function newStart(starts, at, wind = [], forecast = null, rdays = null) {
  const day = dayOf(at);
  const t = Date.parse(at);
  if ((starts || []).some((x) => Math.abs(Date.parse(x.at) - t) < 5000)) return null; // aynı start iki kez yazılmaz
  const near = [...windOn(wind, day)].reverse().find((w) => Date.parse(w.at) <= t + 60e3 && t - Date.parse(w.at) < 90 * 60e3);
  const w = near || forecast;
  const n = nextRaceNo(starts, day, rdays);
  return { id: `s${t.toString(36)}`, day, n, name: "", cd: "", at: new Date(t).toISOString(), fin: "", dir: w?.dir ?? null, kn: w?.kn ?? w?.wind ?? null, course: "", flag: "", note: "", void: "" };
}
// Yarışlar bütün seri boyunca sırayla numaralanır (Seyhun 2026-10-18: ilk gün 3 yarış yapıldıysa ikinci gün 4. yarışla başlar)
// Geçersiz yarış numara almaz: sıradaki geçerli yarışın numarasını taşır (tekrar koşulan yarışla aynı numara)
// rdays (yarışın günleri) verilirse yarış dışındaki günler (antrenman) kendi içinde 1'den başlar, yarış serisini kaydırmaz
const group = (day, rdays) => (rdays?.length && !rdays.includes(day) ? day : "seri");
// Grup grup yarış (Seyhun 2026-11-02 inceleme): Sarı ve Mavi aynı "3. yarış"ı ayrı startlarla koşar. Gruplu start, aynı gün hemen
// önceki startlar gruplu ve bu grup o numarada henüz yoksa önceki numarayı paylaşır (Sarı 3, Mavi 3, Sarı 4, Mavi 4).
export function renumber(starts, rdays = null) {
  const st = {};
  return cleanStarts(starts).map((x) => {
    const g = group(x.day, rdays);
    const s = (st[g] ||= { n: 0, used: new Set(), day: "" });
    const share = !!x.grp && s.n > 0 && s.day === x.day && s.used.size > 0 && !s.used.has("") && !s.used.has(x.grp);
    const n = share ? s.n : s.n + 1;
    if (!x.void) {
      if (!share) {
        s.n = n;
        s.used = new Set();
      }
      s.used.add(x.grp || "");
      s.day = x.day;
    }
    return { ...x, n };
  });
}
// Yarışın adı: elle verilen ad, yoksa "4. yarış"
export const raceName = (s) => (s ? s.name || `${s.n}. yarış` : "");
// Başlık: geçersiz yarışın önüne sebebi ("Genel geri çağırma · 2. yarış")
export const raceTitle = (s) => (s?.void ? `${s.void} · ${raceName(s)}` : raceName(s));
// Serinin sıradaki yarışının numarası
// grp verilirse o grubun sıradaki startı (aynı yarışın diğer grubu numarayı paylaşır)
export function nextRaceNo(starts, day = "", rdays = null, grp = "") {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : dayOf(new Date().toISOString());
  const at = new Date(Math.max(Date.now(), ...(starts || []).map((x) => Date.parse(x.at) || 0)) + 60e3).toISOString();
  const all = renumber([...(starts || []), { id: "zzznext", day: d, at, ...(grp ? { grp } : {}) }], rdays);
  return all.find((x) => x.id === "zzznext")?.n || 1;
}

// ---- Yarış akışı (Süre sekmesi): Başlat yarışı açar (geri sayım), 0'da yarış başlar, "Yarışı bitir" bitirir ----
// Her adım yeni liste döndürür; çağıran kaydeder ve önceki listeyi "Geri al" için saklar.
// Başlat: geri sayım başlar, yarış satırı açılır (at: planlanan start anı, cd: geri sayımın başladığı an)
export function beginRace(starts, nowMs, endMs, rdays = null, grp = "") {
  const id = `s${Math.round(endMs).toString(36)}`;
  const s = { id, day: dayOf(new Date(endMs).toISOString()), n: 1, name: "", cd: new Date(nowMs).toISOString(), at: new Date(endMs).toISOString(), fin: "", dir: null, kn: null, course: "", flag: "", note: "", ...(grp ? { grp } : {}) };
  return { id, starts: renumber([...(starts || []).filter((x) => x.id !== id), s], rdays) };
}
// +30 sn / +1 dk: start anı kayar
export const shiftRace = (starts, id, endMs, rdays = null) =>
  renumber((starts || []).map((x) => (x.id === id ? { ...x, at: new Date(endMs).toISOString(), day: dayOf(new Date(endMs).toISOString()) } : x)), rdays);
// 0: yarış başladı; o anki rüzgâr (son elle kayıt) yazılır. Bağlı satır yoksa (sayaç başka yerden başlatıldı) yeni satır açılır
export function zeroRace(starts, id, endMs, wind = [], rdays = null) {
  const at = new Date(endMs).toISOString();
  const s = (starts || []).find((x) => x.id === id);
  if (!s) {
    const add = newStart(starts, at, wind, null, rdays);
    return add ? renumber([...(starts || []), add], rdays) : starts;
  }
  const w = newStart([], at, wind);
  return renumber((starts || []).map((x) => (x.id === id ? { ...x, at, dir: x.dir ?? w.dir, kn: x.kn ?? w.kn } : x)), rdays);
}
export const finishRace = (starts, id, finMs, rdays = null) => renumber((starts || []).map((x) => (x.id === id ? { ...x, fin: new Date(finMs).toISOString() } : x)), rdays);
export const dropRace = (starts, id, rdays = null) => renumber((starts || []).filter((x) => x.id !== id), rdays);
// Yarışı geçersiz say (tehir / genel geri çağırma / iptal): bitiş = iptal anı (çekimleri o ana kadar bu yarışa düşer); reason boşsa geri geçerli
export const voidRace = (starts, id, reason, atMs, rdays = null) =>
  renumber((starts || []).map((x) => (x.id !== id ? x : reason ? { ...x, void: reason, fin: x.fin || new Date(atMs).toISOString() } : { ...x, void: "" })), rdays);
// Süre: "42:10" (start → bitiş)
export const raceTime = (s) => (s?.fin && s?.at && !s.void ? clock(Math.max(0, Math.round((Date.parse(s.fin) - Date.parse(s.at)) / 1000))) : "");

// Çekildiği anın start sayacına göre yeri (Seyhun 2026-10-18): sayaç yarış dizisinde geri sayarken "pre" (start öncesi) ya da son 60 saniyede
// "last" (son 1 dakika), 0'dan sonra "race" (startan beri). sec: starta göre saniye (öncesi eksi), end: sayacın 0 anı (o yarışın startı).
// timer: Countdown kaydı { end, mode }. Sayaç yoksa, antrenman sayacıysa ya da çok uzaksa (15 dk önce / 3 saat sonra) null.
export const PHASES = { pre: "Start öncesi", last: "Son 1 dakika", race: "Yarış sırasında", after: "Yarış sonrası" };
// Çekildiği anın yarışı ve evresi, yarış satırlarından (Süre sekmesinde Başlat ile açılan): geri sayım başladıktan sonra start öncesi /
// son 1 dakika, startan bitişe kadar yarış sırasında, bitişten sonra 30 dakika yarış sonrası. Dönüş { rid, phase, sec, end } ya da null
export function momentAt(at, starts) {
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return null;
  const s = [...(starts || [])].reverse().find((x) => (x.cd ? Date.parse(x.cd) : Date.parse(x.at) - 900e3) <= t + 1000);
  if (!s) return null;
  const st = Date.parse(s.at);
  const fin = s.fin ? Date.parse(s.fin) : null;
  const sec = Math.round((t - st) / 1000);
  if (s.void && fin != null && t > fin + 1000) return null; // iptalden sonra çekilen bu yarışa düşmez
  const phase = sec < -60 ? "pre" : sec < 0 ? "last" : fin == null ? (sec <= 3 * 3600 ? "race" : "") : t <= fin ? "race" : t - fin <= 1800e3 ? "after" : "";
  return phase ? { rid: s.id, phase, sec, end: s.at } : null;
}
export function momentOf(at, timer) {
  if (timer?.end == null || timer.mode !== "start") return null;
  const sec = Math.round((Date.parse(at) - timer.end) / 1000);
  if (!Number.isFinite(sec) || sec < -900 || sec > 3 * 3600) return null;
  return { phase: sec < -60 ? "pre" : sec < 0 ? "last" : "race", sec, end: new Date(timer.end).toISOString() };
}
function cleanMoment(m) {
  const sec = Number(m?.sec);
  if (!PHASES[m?.phase] || !Number.isFinite(sec) || !ISO(m?.end)) return {};
  return { phase: m.phase, sec: Math.round(sec), end: ISO(m.end), ...(ID.test(m?.rid || "") ? { rid: m.rid } : {}) };
}
const clock = (sec) => `${Math.floor(Math.abs(sec) / 60)}:${pad(Math.abs(sec) % 60)}`;
// Kısa rozet (küçük resmin köşesi): "−3:12" start öncesi, "+12:30" startan beri
export const momentBadge = (m) => (m?.phase ? `${m.sec < 0 ? "−" : "+"}${clock(m.sec)}` : "");
// Yarışa çevrilmemiş düz start (Seyhun 2026-10-22: "yarış olarak saymasam da start verdim, starttan sonra çekmişim"): an sayaçtan
// (momentOf), yarış satırı yok; o güne o anda start yoksa "Start 10:42 · Startan sonra" diye ayrı gruplanır, "Start öncesi"ne düşmez
export function freeStart(m, starts) {
  if (!m?.phase || m.rid || !starts) return false;
  const t = Date.parse(m.end);
  return !startsOn(starts, dayOf(m.end)).some((x) => Math.abs(Date.parse(x.at) - t) < 5000);
}
// Uzun yazı (büyük açılınca, fotoğrafın üstüne basılan): "Son 1 dakika · 0:42 kala", "Startan beri 12:30"
export const momentText = (m, starts) =>
  !m?.phase ? "" : m.phase === "race" ? `${freeStart(m, starts) ? "Startan beri" : "Yarış sırasında"} · ${clock(m.sec)}` : m.phase === "after" ? PHASES.after : `${PHASES[m.phase]} · ${clock(m.sec)} kala`;
// Çekilenin yarışının adı: bağlı yarış satırı (rid), yoksa 0 anına denk gelen start, yoksa o andan önceki startların sırası + 1
export const momentRaceName = (m, starts) => {
  const s = m?.rid && (starts || []).find((x) => x.id === m.rid);
  return s ? raceTitle(s) : freeStart(m, starts) ? `Start ${hm(m.end)}` : `${momentRace(m, starts)}. yarış`;
};
export function momentRace(m, starts) {
  const r = m?.rid && (starts || []).find((x) => x.id === m.rid);
  if (r) return r.n;
  const t = Date.parse(m.end);
  const day = dayOf(m.end);
  const st = startsOn(starts, day);
  const hit = st.find((x) => Math.abs(Date.parse(x.at) - t) < 5000);
  return hit ? hit.n : st.filter((x) => Date.parse(x.at) < t).length + 1;
}

// Fotoğraf/video gruplanır: yarışa ve ana göre ("4. yarış · Son 1 dakika"). Anı kayıtlı olan kendi yarışına ve evresine düşer;
// anı olmayan, çekildiği saatten önceki son startın "Yarış sırasında" grubuna (start yoksa "Start öncesi").
// Dönüş [{ key, title, items }]: en son yarış en üstte, yarış içinde sonrası · sırasında · son 1 dakika · öncesi; içerik yeniden eskiye
export function mediaGroups(media, starts, day) {
  const st = startsOn(starts, day);
  const order = { after: 0, race: 1, last: 2, pre: 3 };
  const groups = new Map();
  for (const m of (media || []).filter((x) => dayOf(x.at) === day)) {
    let n = 0;
    let name = "";
    let phase = "pre";
    let id = "";
    let at = "";
    // Düz startta saat yazılmaz (Seyhun 2026-10-22: "Start 14:33 bu ne? saati mi veriyor?"): yalnız evre
    if (m.phase && freeStart(m, starts)) (phase = m.phase), (id = `free${m.end}`), (at = m.end);
    else if (m.phase) (n = momentRace(m, starts)), (name = momentRaceName(m, starts)), (phase = m.phase), (id = m.rid || ""), (at = m.end);
    else {
      const s = [...st].reverse().find((x) => x.at <= m.at);
      if (s) (n = s.n), (name = raceTitle(s)), (phase = "race"), (id = s.id), (at = s.at);
    }
    // Aynı numaralı iki yarış (geçersiz sayılan ve tekrarı) ayrı gruplarda: anahtar yarışın kendisi
    const key = `${id || n}-${phase}`;
    const title = n ? `${name} · ${PHASES[phase]}` : name ? `${name} · ${phase === "race" ? "Startan sonra" : PHASES[phase]}` : id ? (phase === "race" ? "Startan sonra" : PHASES[phase]) : PHASES.pre;
    // race/rname: galeride yarışa göre birleştirmek için (mediaByRace)
    const rname = n || name ? name : id ? "" : "Diğer";
    if (!groups.has(key)) groups.set(key, { key, n, at, rank: order[phase], title, race: id || (n ? `n${n}` : ""), rname, items: [] });
    groups.get(key).items.push(m);
  }
  return [...groups.values()]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)) || (b.n || 0) - (a.n || 0) || a.rank - b.rank)
    .map(({ key, title, race, rname, items }) => ({ key, title, race, rname, items: items.reverse() }));
}

// Galeri (Seyhun 2026-10-22, örnek yaris-tasarim/medya/galeri-iphone.png): evreler değil yarışlar gruplanır ("1. yarış", "Startan sonra",
// "Diğer"); evre her karede ("−0:42" / "+3:10"). Yarış içinde çekiliş sırasıyla (eskiden yeniye), en son yarış en üstte.
export function mediaByRace(media, starts, day) {
  const out = [];
  for (const g of mediaGroups(media, starts, day)) {
    const k = g.race || `x${g.rname}`;
    const last = out.find((x) => x.key === k);
    if (last) last.items.push(...g.items);
    else out.push({ key: k, free: g.race.startsWith("free"), title: g.rname, items: [...g.items] });
  }
  return out.map(({ key, free, title, items }) => {
    const sorted = items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return { key, title: free ? (sorted.every((m) => m.phase === "race" || m.phase === "after") ? "Startan sonra" : "Start") : title || "Diğer", items: sorted };
  });
}

// Sonradan düzeltme (büyük açınca "Düzelt"): çekimin yarışı ve anı değişir; mom null: yarışsız. Dönüş yeni liste
export function fixMedia(media, id, mom) {
  return cleanMedia(
    (media || []).map((m) => {
      if (m.id !== id) return m;
      const { phase: _p, sec: _s, end: _e, rid: _r, ...rest } = m;
      return mom ? { ...rest, ...mom } : rest;
    }),
  );
}
// Sporcu etiketi: dokunulan sporcu varsa çıkar, yoksa ekler. Dönüş yeni liste
export function tagMedia(media, id, athId) {
  return cleanMedia((media || []).map((m) => (m.id !== id ? m : { ...m, ath: m.ath?.includes(athId) ? m.ath.filter((x) => x !== athId) : [...(m.ath || []), athId] })));
}
// Süzgeç: yalnız o sporcunun etiketli olduğu fotoğraf/videolar ("" = hepsi)
export const mediaOf = (media, athId) => (athId ? (media || []).filter((m) => m.ath?.includes(athId)) : media || []);

// Gün sonu özeti (veliye / Instagram'a paylaşılan kart ve yazı). rows: yarış yerinin saatlik tahmini (yoksa null);
// elle/cihazla yazılan rüzgâr varsa o, yoksa tahminin start saatleri (yoksa 10–18) arası kullanılır.
// ours: [{ id, studentName }]; sıra yarış sonucundan (race.results.rows), en iyi sıradan.
export function daySummary({ race, day, live, ours = [], rows = null, obs = null, line = null }) {
  const st = startsOn(live?.starts, day);
  const wl = windOn(live?.wind, day);
  const most = (dirs) => {
    const c = {};
    for (const d of dirs) c[dirShort(d)] = (c[dirShort(d)] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  };
  // Yarış saatleri (ilk startın saati .. son startın bir saat sonrası); yarış yoksa 10..18
  const h0 = st.length ? +hm(st[0].at).slice(0, 2) : 10;
  const h1 = st.length ? +hm(st[st.length - 1].at).slice(0, 2) + 1 : 18;
  const span = (list) => (list || []).filter((x) => +x.hh >= h0 && +x.hh <= h1 && x.wind != null && x.dir != null);
  const fromRows = (r, src) => {
    const kn = r.map((x) => Math.round(x.wind));
    const g = r.map((x) => x.gust).filter((x) => x != null);
    return { lo: Math.min(...kn), hi: Math.max(...kn), gust: g.length ? Math.round(Math.max(...g)) : null, dir: most(r.map((x) => x.dir)), src, pts: r.map((x) => ({ hh: `${x.hh}:00`, kn: Math.round(x.wind) })) };
  };
  // Önce elle yazılan kayıt (eski Hava sekmesi), sonra en yakın istasyonun ölçümü, yoksa tahmin (Seyhun 2026-10-28)
  let wind = null;
  if (wl.length) {
    const kn = wl.map((w) => w.kn);
    const g = wl.map((w) => w.gust).filter((x) => x !== null);
    wind = { lo: Math.min(...kn), hi: Math.max(...kn), gust: g.length ? Math.max(...g) : null, dir: most(wl.map((w) => w.dir)), src: "ölçülen", pts: wl.map((w) => ({ hh: hm(w.at), kn: w.kn })) };
  } else if (span(obs).length) wind = fromRows(span(obs), "ölçülen");
  else if (span(rows).length) wind = fromRows(span(rows), "tahmin");
  // Grafik (Seyhun 2026-10-29 "beklenti neydi, gerçekleşen ne oldu"): yarış saatlerinin bir saat önce/sonrası; beklenen = tahmin,
  // gelen = elle kayıt ya da istasyon ölçümü. h ondalıklı saat; yarışların startı çizgiyle.
  const c0 = h0 - 1, c1 = h1 + 1;
  const inC = (h) => h >= c0 && h <= c1;
  const hr = (iso) => { const t = hm(iso); return +t.slice(0, 2) + +t.slice(3, 5) / 60; };
  const fc = (rows || []).filter((x) => x.wind != null && inC(+x.hh)).map((x) => ({ h: +x.hh, kn: Math.round(x.wind), g: x.gust != null ? Math.round(x.gust) : null }));
  const ob = wl.length
    ? wl.map((w) => ({ h: hr(w.at), kn: w.kn })).filter((x) => inC(x.h))
    : (obs || []).filter((x) => x.wind != null && inC(+x.hh)).map((x) => ({ h: +x.hh, kn: Math.round(x.wind) }));
  const rng = (l) => (l.length ? [Math.min(...l.map((x) => x.kn)), Math.max(...l.map((x) => x.kn))] : null);
  const chart = fc.length || ob.length ? { from: c0, to: c1, fc, ob, exp: rng(fc.filter((x) => x.h >= h0 && x.h <= h1)), got: rng(ob.filter((x) => x.h >= h0 && x.h <= h1)), starts: st.map((x) => ({ n: x.n, h: hr(x.at), flag: !!(x.void || x.flag) })) } : null;
  const res = race?.results?.rows || {};
  const team = ours
    .map((a) => ({ name: a.studentName || a.name || "", place: res[a.id]?.place || 0, line: res[a.id]?.place ? (line ? line(res[a.id]) : `${res[a.id].place}.`) : "" }))
    .filter((a) => a.name)
    .sort((a, b) => (a.place || 999) - (b.place || 999) || a.name.localeCompare(b.name, "tr"));
  const date = new Date(`${day}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  const sub = [race?.district || race?.city, date].filter(Boolean).join(" · ");
  const windText = wind ? `${wind.dir} ${wind.lo === wind.hi ? wind.hi : `${wind.lo}–${wind.hi}`} kn${wind.gust ? `, sağanak ${wind.gust} kn` : ""}${wind.src === "tahmin" ? " (tahmin)" : ""}` : "";
  const starts = st.map((x) => ({ n: x.n, time: hm(x.at), wind: x.kn !== null && x.dir !== null ? `${dirShort(x.dir)} ${x.kn} kn` : "", course: x.course, flag: x.void || x.flag }));
  const ranked = team.filter((a) => a.place);
  const text = [
    race?.name || "Yarış",
    sub,
    windText && `Rüzgâr: ${windText}`,
    starts.length && `Yarışlar: ${starts.map((x) => `${x.n}. ${x.time}${x.flag ? ` (${x.flag.toLocaleLowerCase("tr-TR")})` : ""}`).join(" · ")}`,
    ranked.length && `Bizimkiler:\n${ranked.map((a) => `${a.place}. ${a.name}${a.line && a.line !== `${a.place}.` ? ` · ${a.line}` : ""}`).join("\n")}`,
  ].filter(Boolean).join("\n");
  return { title: race?.name || "Yarış", sub, wind, windText, starts, team, text, chart };
}

// Sayaç bipleri. Yarış (start dizisi): başlatınca, 4:00 ve 1:00 kala (süre ondan uzunsa), son 10 saniye her saniye, 0'da uzun.
// Antrenman: son 5 saniye her saniye, 0'da uzun. Dönüş: "" | "short" | "mid" | "long"
export function beepAt(left, mode = "") {
  if (left === 0) return "long";
  if (mode === "start") {
    if (left === 240 || left === 60) return "mid";
    return left > 0 && left <= 10 ? "short" : "";
  }
  return left > 0 && left <= 5 ? "short" : "";
}

// Genel sıralama: sınıfın satırları süzülür (Genel, Junior, Bambino, Kızlar), sıra süzgeç içinde yeniden verilir
// Süzgeçler: all (Genel), grp:Altın / grp:Gümüş … (final grupları), Junior, Bambino, girls (Kızlar), Junior-girls (Junior Kızlar), Bambino-girls
const SUB_CATS = ["Junior", "Bambino"];
const GRPS = ["Altın", "Gümüş", "Bronz", "Zümrüt"];
export function sheetRows(fleet, filter = "all") {
  const rows = (fleet?.rows || []).map((r, i) => ({ ...r, i })); // i: sınıf listesindeki yeri (bizimkiler bununla işaretlenir)
  if (filter.startsWith("grp:")) return rows.filter((r) => r.grp === filter.slice(4)).map((r, k) => ({ ...r, pos: k + 1 }));
  const [cat, girls] = filter === "girls" ? ["", true] : filter.endsWith("-girls") ? [filter.slice(0, -6), true] : [SUB_CATS.includes(filter) ? filter : "", false];
  const pick = filter === "all" ? rows : rows.filter((r) => (!cat || r.cat === cat) && (!girls || r.sex === "K"));
  return pick.map((r, k) => ({ ...r, pos: k + 1 }));
}
export function sheetFilters(fleet) {
  const rows = fleet?.rows || [];
  const cats = SUB_CATS.filter((c) => rows.some((r) => r.cat === c));
  const girls = rows.some((r) => r.sex === "K");
  return [
    ["all", "Genel"],
    ...GRPS.filter((g) => rows.some((r) => r.grp === g)).map((g) => [`grp:${g}`, g]),
    ...cats.map((c) => [c, c]),
    ...(girls ? [["girls", "Kızlar"]] : []),
    ...cats.filter((c) => rows.some((r) => r.cat === c && r.sex === "K")).map((c) => [`${c}-girls`, `${c} Kızlar`]),
  ];
}
// Her satırın genel dışındaki sıraları (Sonuçlar 3. satır): { i: [["Gümüş", 5, 40], ["Junior", 1, 18], ["Kızlar", 2, 12], ["Junior Kızlar", 1, 6]] }
export function rowRanks(fleet) {
  const out = {};
  const add = (filter, label) => {
    const l = sheetRows(fleet, filter);
    for (const r of l) (out[r.i] ||= []).push([label, r.pos, l.length]);
  };
  for (const g of GRPS) add(`grp:${g}`, g);
  for (const c of SUB_CATS) add(c, c);
  add("girls", "Kızlar");
  for (const c of SUB_CATS) add(`${c}-girls`, `${c} Kızlar`);
  return out;
}
// Genel listede satırın kısa işareti: "Junior kız", "Junior", "Kız" (Senior ve erkekte boş)
export const sheetTag = (r) => [SUB_CATS.includes(r?.cat) ? r.cat : "", r?.sex === "K" ? "kız" : ""].filter(Boolean).join(" ").replace(/^kız$/, "Kız");

// ---- Asistan ----
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const WORD_DIR = [
  [/kuzey\s*bat[ıi]|karayel|\bkb\b/, 315], [/kuzey\s*do[gğ]u|poyraz|\bkd\b/, 45], [/g[uü]ney\s*bat[ıi]|lodos|\bgb\b/, 225], [/g[uü]ney\s*do[gğ]u|ke[sş]i[sş]leme|\bgd\b/, 135],
  [/kuzey|y[ıi]ld[ıi]z|\bk\b/, 0], [/g[uü]ney|k[ıi]ble|\bg\b/, 180], [/bat[ıi]|batı|\bb\b/, 270], [/do[gğ]u|\bd\b/, 90],
];
const NUMS = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30 };
export function numberIn(s, unit) {
  const m = s.match(new RegExp(`(\\d{1,2})\\s*(?:${unit})`));
  if (m) return +m[1];
  const w = s.match(new RegExp(`\\b(on|yirmi|otuz)?\\s*(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz)?\\s*(?:${unit})`));
  if (w && (w[1] || w[2])) return (NUMS[w[1]] || 0) + (NUMS[w[2]] || 0);
  return null;
}

// "rüzgar 15 knot kuzeybatı", "rüzgarı yaz karayel 12 knot", "kuzeybatıdan 14 knot esiyor yaz" → { kn, dir, gust }
export function windCommand(raw) {
  const s = low(raw);
  if (!/r[uü]zg[aâ]r|esiyor|\bkn\b|knot/.test(s)) return null;
  if (/\?|\bkaç\b|\bne\b|nasıl|olacak|tahmin|yarın/.test(s)) return null;
  const kn = numberIn(s, "knot|kn|not\\b|deniz mili");
  if (kn === null || kn > 60) return null;
  const rest = s.replace(/sağanak\s*\d+/, " ");
  const hit = WORD_DIR.find(([re]) => re.test(rest));
  if (!hit) return null;
  const g = s.match(/sağanak\s*(\d{1,2})/);
  return { kn, dir: hit[1], gust: g ? +g[1] : null };
}

// "5 dakikalık sayacı başlat", "sayacı başlat", "geri sayımı başlat 2 dakika", "start sayacını başlat" → { sec }
export function timerCommand(raw) {
  const s = low(raw);
  if (!/(saya[cç]|geri\s*say[ıi]m|start\s*say)/.test(s) || !/ba[sş]la/.test(s)) return null;
  const min = numberIn(s, "dakika|dk");
  const sec = min && min <= 30 ? min * 60 : 300;
  return { sec };
}

// Sesle kaydedilen rüzgâr hangi yarışa: açık yarış, yoksa bugün süren yarış
export function liveRace(races, today, cur = "") {
  if (cur) return (races || []).find((r) => r.id === cur) || null;
  const on = (r) => r.startDate && r.startDate <= today && (r.endDate || r.startDate) >= today;
  return (races || []).find(on) || null;
}

// Yayın sayfasının "Bugün" listesi yarış yarış (Seyhun 2026-11-02 tasarım startlar-yeni): bugünün startları (biten, süren, abandone) ve
// programda bekleyenler (plan.order) yarış numarasına göre toplanır. Bekleyenlerin numarası sırayla eklenmiş gibi hesaplanır
// (grup grup yarışta aynı yarışın grupları ortak numara). Satır: { key, grp, state: done|live|void|next|wait, start?, i? (order sırası), retry }
// Yarış: { n, state: done|live|"" , rows }
export function dayRaces({ starts = [], order = [], grpOf = (x) => x.grp || "", liveIds = [], today = "", rdays = null }) {
  const todays = starts.filter((x) => x.day === today);
  const rows = todays.map((x) => {
    const grp = grpOf(x);
    const state = x.void ? "void" : liveIds.includes(x.id) || !x.fin ? "live" : "done";
    return { key: x.id, n: x.n, grp, state, start: x };
  });
  let acc = [...starts];
  order.forEach((o, i) => {
    const n = nextRaceNo(acc, today, rdays, o.grp || "");
    const at = new Date(Math.max(Date.now(), ...acc.map((x) => Date.parse(x.at) || 0)) + 60e3).toISOString();
    acc = [...acc, { id: `zzp${i}`, day: today, at, ...(o.grp ? { grp: o.grp } : {}) }];
    rows.push({ key: `p${i}`, n, grp: o.grp || "", state: i === 0 ? "next" : "wait", i, plan: o });
  });
  // aynı yarışta aynı grubun abandone'dan sonraki startı "tekrar"
  rows.forEach((r, k) => {
    r.retry = rows.slice(0, k).some((p) => p.n === r.n && p.grp === r.grp && p.state === "void");
  });
  const ns = [...new Set(rows.map((r) => r.n))].sort((a, b) => a - b);
  return ns.map((n) => {
    const rs = rows.filter((r) => r.n === n);
    const state = rs.some((r) => r.state === "live") ? "live" : rs.every((r) => r.state === "done" || r.state === "void") && rs.some((r) => r.state === "done") ? "done" : "";
    return { n, state, rows: rs };
  });
}
// "+ Yarış": günün gruplarıyla bir sonraki yarışın startları (grup yoksa tek start)
export const raceOrder = (plan) => {
  const sets = plan?.sets?.length ? plan.sets : [{ cls: plan?.cls || "Optimist", grps: plan?.grps || [] }];
  return sets.flatMap((x) => (x.grps.length ? x.grps : [""]).map((grp) => ({ cls: x.cls || "Optimist", grp, prep: plan?.prep || "P" })));
};

// Bir günün ilk start saati: o güne özel saat, yoksa her günün saati
export const dayTime = (plan, d) => plan?.times?.[d] || plan?.daily || "";
// Yeni güne geçiş: plan eski bir günde kaldıysa bugünün planı (ilk start günün saatinden, bekleyenler düşer; yarış yok günü "none").
// Sunucu (/api/canli) ve Yayın sayfası kullanır; böylece Yayın açılmadan da ekran bugünün saatini sayar.
export function rollPlan(plan, today) {
  const pl = cleanPlan(plan);
  if (!today || (pl.day && pl.day >= today)) return pl;
  const status = pl.off.includes(today) ? "none" : "";
  return { ...pl, day: today, at: dayTime(pl, today) || (pl.next?.day === today ? pl.next.at : ""), order: pl.day ? [] : pl.order, status, next: null, ap: null };
}

// Manuel girilen rüzgâr (Seyhun 2026-11-02): Yayın/parkurda o saat için girilen ölçüm (parkur rüzgâr kaydı ya da canlı rüzgâr)
// istasyonun yerine o saatin sütunu olur; saat başına son ölçüm. Saat ve gün Türkiye saatiyle.
export function windByHour(data, now) {
  const day = new Date(now + 3 * 3600e3).toISOString().slice(0, 10);
  const obs = (data.course?.obs || []).filter((o) => o.kind === "wind").map((o) => ({ at: o.at, dir: o.deg, kn: o.kn }));
  const out = {};
  for (const x of [...(data.wind || []), ...obs]) {
    if (x?.kn == null || !x.at || Number.isNaN(Date.parse(x.at))) continue;
    const t = new Date(Date.parse(x.at) + 3 * 3600e3).toISOString();
    if (t.slice(0, 10) !== day) continue;
    const hh = t.slice(11, 13);
    if (!out[hh] || out[hh].at < x.at) out[hh] = { at: x.at, wind: Math.round(x.kn), dir: x.dir ?? null };
  }
  return out;
}
// Bugün girilen tüm manuel rüzgâr ölçümleri (Seyhun 2026-11-02 "daha sık saat aralığı varsa onu da gösterelim"): grafikte
// kendi dakikasına nokta; h = Türkiye saatiyle kesirli saat (14.5 = 14:30)
export function windPoints(data, now) {
  const day = new Date(now + 3 * 3600e3).toISOString().slice(0, 10);
  const obs = (data.course?.obs || []).filter((o) => o.kind === "wind").map((o) => ({ at: o.at, kn: o.kn }));
  return [...(data.wind || []), ...obs]
    .filter((x) => x?.kn != null && x.at && !Number.isNaN(Date.parse(x.at)))
    .map((x) => ({ t: new Date(Date.parse(x.at) + 3 * 3600e3).toISOString(), kn: Math.round(x.kn) }))
    .filter((x) => x.t.slice(0, 10) === day)
    .map((x) => ({ h: +x.t.slice(11, 13) + +x.t.slice(14, 16) / 60, kn: x.kn }))
    .sort((a, b) => a.h - b.h);
}
// Saat eşleme (NTP gibi): ölçümlerden en kısa gidiş-dönüşlü olanın ortası; { off: sunucu − cihaz (ms), rtt }
export function bestOffset(samples) {
  const ok = samples.filter((x) => x && Number.isFinite(x.server) && x.t1 >= x.t0);
  if (!ok.length) return null;
  const b = ok.reduce((a, x) => (x.t1 - x.t0 < a.t1 - a.t0 ? x : a));
  return { off: Math.round(b.server - (b.t0 + b.t1) / 2), rtt: b.t1 - b.t0 };
}

// Yarışa günler varken (Seyhun 2026-11-02 "6 gün sonra bir yarış; kaç gün kaldı, o tarihlerdeki beklenen rüzgâr"): yarış günleri
// (başlangıç–bitiş, programda yarış olmayan günler düşer) ve her gün ilk start saatinden 4 saat boyunca beklenen ortalama rüzgâr, en sert sağanak, start'taki yön.
// hourly [{ t: "2026-11-08T11", wind, gust, dir }] (open-meteo); tahmini olmayan gün yine listelenir (wind null).
export function raceDays(start, end, plan) {
  if (!DAY.test(start || "")) return [];
  const off = new Set(plan?.off || []);
  const out = [];
  const last = DAY.test(end || "") && end >= start ? end : start;
  for (let d = start; d <= last && out.length < 10; d = plus(d, 1)) if (!off.has(d)) out.push(d);
  return out;
}
export function aheadWind(hourly, days, plan) {
  const at = (d) => plan?.times?.[d] || plan?.daily || "";
  return days.map((day) => {
    const a = at(day);
    const h0 = a ? +a.slice(0, 2) : 11;
    const win = (hourly || []).filter((r) => r.t?.slice(0, 10) === day && +r.t.slice(11, 13) >= h0 && +r.t.slice(11, 13) <= h0 + 4 && r.wind != null);
    const first = win.find((r) => +r.t.slice(11, 13) === h0) || win[0];
    const gs = win.map((r) => r.gust).filter((g) => g != null);
    return { day, at: a, wind: win.length ? Math.round(win.reduce((s, r) => s + r.wind, 0) / win.length) : null, gust: gs.length ? Math.max(...gs) : null, dir: first?.dir ?? null };
  });
}
// Bugünden yarışın ilk gününe kaç gün (Türkiye günü); geçtiyse 0
export const daysUntil = (day, today) => (DAY.test(day || "") && DAY.test(today || "") ? Math.max(0, Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5)) : 0);

// Turuncu bayrak çekili mi (bugün, gün bitmemiş): canlı ekran "Start öncesi"ne geçer
export const orangeUp = (plan, today) => !!plan?.orange && plan.status !== "done" && new Date(Date.parse(plan.orange) + 3 * 3600e3).toISOString().slice(0, 10) === today;
// "Bugün yarış yok" ekranı (Seyhun 2026-11-02 örnek A): bugünden sonraki ilk yarış günü ve ilk start saati (yarış yok günleri atlanır)
export function nextRaceDay(plan, today, start, end) {
  const d = raceDays(start, end, plan).find((x) => x > today);
  return d ? { day: d, at: dayTime(plan, d) || plan?.at || "" } : null;
}
