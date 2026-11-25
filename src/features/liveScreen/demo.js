"use client";

import { useEffect, useState } from "react";

// Örnek yarış (/canli/ornek; Seyhun 2026-11-02 "sarı grup, 3 yarış, şamandıra dönüşleri, genel sıralama, fazla sporcu koyma, tasarımı görmek
// için"): veritabanına dokunmaz, ekran adım adım oynar: yarış öncesi → parkur kuruldu → videolu bekleme → turuncu bayrak → start dizisi →
// start → dönüşler → rüzgâr değişti → finiş → gün sonu. 1. ve 2. yarış dün yapılmış (genel sıralama onlardan), 3. yarış bugün.
// Video (Seyhun 2026-11-02): gerçek bir start videosu; videonun 1:04'ünde start olur. Start dizisi video 0:00'dan başlarken sayaç 1:04'te
// olacak şekilde kurulur, start'tan 40 sn sonra video kalkar, dönüşler ve genel sıralama gelir.

const SAILS = [
  ["305", "Ece Kara", "Foça YK", "2011", "K"],
  ["712", "Deniz Aydın", "Dikili YK", "2013", "E"],
  ["1188", "Can Öz", "Ayvalık YK", "2011", "E"],
  ["24", "Ada Yılmaz", "Çeşme YK", "2014", "K"],
  ["94", "Mert Şen", "Dikili YK", "2012", "E"],
  ["918", "Elif Koç", "Urla YK", "2012", "K"],
  ["502", "Kaan Er", "Dikili Yelken Spor Kulübü", "2010", "E"],
  ["808", "Bora Ak", "Urla YK", "2013", "E"],
  ["77", "Lina Taş", "İzmir YK", "2013", "K"],
  ["1301", "Umut Can", "", "2012", "E"],
  ["415", "Selin Ay", "Foça YK", "2011", "K"],
  ["62", "Arda Öz", "Çeşme YK", "2014", "E"],
  ["233", "Zeynep Su", "Ayvalık YK", "2012", "K"],
  ["1450", "Efe Tan", "Bodrum Deniz ve Yelken Sporları Kulübü Derneği", "2011", "E"],
];
const ROUTE = ["1", "2", "3", "F"];
// Sıralamalar: bir sıradan başlayıp her şamandırada birkaç komşu yer değiştirir (gerçek yarış gibi)
const order0 = (seed) => {
  let x = seed;
  const r = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const a = SAILS.map((s) => s[0]);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const legsOf = (seed) => {
  let cur = order0(seed);
  return ROUTE.map((_, k) => {
    if (k) {
      cur = [...cur];
      for (let i = (seed + k) % 3; i + 1 < cur.length; i += 3 + ((seed * k) % 2)) [cur[i], cur[i + 1]] = [cur[i + 1], cur[i]];
    }
    return cur;
  });
};
const ORDER = legsOf(11);
export const DEMO_STEPS = ["Yarış öncesi", "Parkur kuruldu", "Videolu bekleme", "Turuncu bayrak", "Start dizisi", "Start", "1. şamandıra", "Rüzgâr değişti", "2. şamandıra", "3. şamandıra", "Finiş", "Gün sonu"];
export const DEMO_S = { PRE: 0, COURSE: 1, VID: 2, ORANGE: 3, SEQ: 4, START: 5, M1: 6, WIND: 7, M2: 8, M3: 9, FIN: 10, END: 11 };
const S = DEMO_S;
// adımların süresi: start dizisi videonun startına (1:04) kadar, start adımı start'tan 40 sn sonrasına kadar
const STEP_MS = [9000, 12000, 10000, 10000, 64000, 40000, 9000, 9000, 9000, 9000, 9000, 12000];
export const DEMO_VIDEO = "https://www.youtube.com/watch?v=uapbv0UL-G4";
const VID_START = 64e3; // videoda start anı
// yarışta her adımın başında yarışın kaçıncı dakikasında olunduğu (dönüşler 8,5 dk arayla)
const RACE_MIN = { [S.M1]: 9.5, [S.WIND]: 12, [S.M2]: 18, [S.M3]: 26.5, [S.FIN]: 35 };

const iso = (ms) => new Date(ms).toISOString();
const ymd = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);
const hm = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(11, 16);

// Bir adımın verisi: t0 örneğin başladığı an, s0 adımın başladığı an, now şimdi; v0 videonun 0:00'ı, vt videonun açıldığı saniye
export function demoData(step, t0, s0, now, v0 = s0, vt = 0) {
  const today = ymd(now);
  const yday = ymd(now - 864e5);
  const tom = ymd(now + 864e5);
  const entries = SAILS.map(([sail, name, club, born, sex]) => ({ sail, name, club, cls: "Optimist", born, sex, cat: +born >= 2013 ? "J" : "" }));
  const grp = Object.fromEntries([yday, today].map((d) => [d, SAILS.map((s) => [s[0], "Sarı"])]));
  const r1 = { id: "r1", day: yday, at: `${yday}T08:00:00.000Z`, fin: `${yday}T08:38:00.000Z`, n: 1 };
  const r2 = { id: "r2", day: yday, at: `${yday}T09:10:00.000Z`, fin: `${yday}T09:45:00.000Z`, n: 2 };
  // her noktada ilk teknenin saati (lider ve dönüş saati şeritte)
  const times = (t, n) => Array.from({ length: n }, (_, k) => iso(t + (k + 1) * 8.5 * 60e3));
  const done = (legs, t) => ({ route: ROUTE, legs, at: times(t, 4), grp: "Sarı", cls: "Optimist", prep: "P" });
  const rounds = {
    r1: done(legsOf(3), Date.parse(`${yday}T08:00:00.000Z`)),
    r2: done(legsOf(7), Date.parse(`${yday}T09:10:00.000Z`)),
  };
  const rows = Array.from({ length: 24 }, (_, h) => ({ hh: String(h).padStart(2, "0"), wind: Math.max(2, Math.round(5 + 7 * Math.sin((h - 7) / 5) + (h > 12 ? 2 : 0))), gust: Math.max(4, Math.round(8 + 9 * Math.sin((h - 7) / 5) + (h > 12 ? 3 : 0))), dir: 285 + h * 2, code: h < 13 ? 1 : h < 16 ? 3 : h < 18 ? 61 : 2, t: Math.round(17 + 6 * Math.sin((h - 9) / 5)), mm: h >= 16 && h < 18 ? 0.6 : 0, pop: h < 13 ? 5 : h < 16 ? 30 : h < 18 ? 70 : 20 }));
  const nowH = +hm(now).slice(0, 2);
  const obs = rows.filter((r) => +r.hh >= 6 && +r.hh <= nowH).map((r) => ({ hh: r.hh, wind: r.wind + 1, gust: r.gust + 2, dir: r.dir, temp: r.t + 1, code: +r.hh < 9 ? 0 : 1, rain: +r.hh % 3 === 0 ? { mm: 0, h: 3 } : null }));
  // start: start dizisinde ve start adımında videodaki start anı, sonra adımın başından yarışın o dakikası kadar önce
  const start = step === S.SEQ || step === S.START ? v0 + VID_START : s0 - (RACE_MIN[step] || 0) * 60e3;
  const done_ = step >= S.END;
  const plan = { day: today, at: hm(now + 3 * 60e3 + 59e3), order: [...(step < S.START ? [{ cls: "Optimist", grp: "Sarı", prep: "P" }] : []), ...(!done_ ? [{ cls: "Optimist", grp: "Mavi", prep: "P" }, { cls: "Optimist", grp: "Mavi", prep: "P" }, { cls: "ILCA 6", grp: "", prep: "P" }] : [])], status: done_ ? "done" : "", next: done_ ? { day: tom, at: "11:00" } : null, showAt: "06:00", ap: null, orange: step >= S.ORANGE && !done_ ? iso(now) : "", agenda: { [today]: [{ at: "09:00", text: "Kayıt ve ölçüm" }, { at: "10:00", text: "Antrenörler toplantısı" }, { at: "11:00", text: "İlk start" }, { at: "18:00", text: "Ödül töreni" }], [tom]: [{ at: "11:00", text: "İlk start" }] } };
  // parkur: komite parkuru 300°'ye attı (eksen), rüzgâr 295°
  const cAt = iso(step === S.COURSE ? s0 : t0 - 700e3);
  const course = step >= S.COURSE ? { pts: {}, obs: [{ id: "w1", kind: "wind", deg: 295, kn: 12, at: cAt, by: "ben", ref: "" }, { id: "a1", kind: "axis", deg: 300, at: cAt, by: "ben", ref: "" }, { id: "l1", kind: "line", ref: "pin", deg: 32, at: cAt, by: "ben" }], len: { orsa: 900 }, cards: [{ id: "A", route: ROUTE }, { id: "B", route: ["1", "4", "1", "2", "3", "F"] }], sel: "A" } : { pts: {}, obs: [], len: {} };
  if (step >= S.WIND) course.obs.push({ id: "w2", kind: "wind", deg: 298, kn: 14, range: [285, 312], at: iso(step === S.WIND ? s0 : t0 - 600e3), by: "ben", ref: "" });
  const legs = step >= S.FIN ? ORDER : step >= S.M3 ? ORDER.slice(0, 3) : step >= S.M2 ? ORDER.slice(0, 2) : step >= S.M1 ? ORDER.slice(0, 1) : [];
  const starts = [r1, r2];
  // start kaydı start anında açılır (Yayın'daki gibi); start dizisinde sayaç ve bayraklar plan.order'ın ilkinden
  if (step >= S.START && !done_) starts.push({ id: "r3", day: today, at: iso(start), n: 3, ...(step >= S.FIN ? { fin: iso(now - 10e3) } : {}) });
  if (done_) starts.push({ id: "r3", day: today, at: iso(now - 40 * 60e3), fin: iso(now - 5 * 60e3), n: 3 });
  if (step >= S.START) {
    const at = times(done_ ? now - 40 * 60e3 : start, legs.length);
    // her teknenin dönüş anı (lidere fark): liderden birkaç saniye arayla
    const tm = legs.map((l, k) => Object.fromEntries(l.map((sl, i) => [sl, Date.parse(at[k]) + i * 6000 + i * i * 400])));
    rounds.r3 = { route: ROUTE, legs, at, tm, grp: "Sarı", cls: "Optimist", prep: "P", ...(step >= S.FIN ? { pen: { [ORDER[3][5]]: "DSQ" } } : {}) };
  }
  const video = step >= S.VID && step <= S.START;
  // start dizisinde video baştan açılır (bağlantıda t=); bekleme adımlarında da aynı video arkada
  return {
    race: { name: "Örnek Kupa", startDate: yday, endDate: tom, place: "Dikili, İzmir" },
    starts,
    cur: step >= S.SEQ && !done_ ? "r3" : "",
    timer: step >= S.SEQ && step < S.FIN ? { end: start, mode: "start", dur: 300 } : null,
    rounds,
    screen: video ? { kind: "live", caption: step === S.START ? "Sarı grup startı" : "" } : { kind: "" },
    stream: { url: video ? (step >= S.SEQ ? `${DEMO_VIDEO}&t=${vt}s` : DEMO_VIDEO) : "", sources: [{ id: "c1", name: "Kamera 1", kind: "camera", url: DEMO_VIDEO }, { id: "d1", name: "Drone 1", kind: "drone", url: DEMO_VIDEO }] },
    // izleyici görüntü seçimi (Seyhun 2026-11-05): Sarı grup Kamera 1'de, Drone 1 grupsuz
    camBy: { "Optimist|Sarı": "c1" },
    media: [{ id: "m1", kind: "photo", url: "/canli/ornek-deniz.svg", at: iso(t0), thumb: "" }],
    wind: [],
    day: today,
    course,
    fleets: [],
    entries,
    groups: grp,
    plan,
    forecast: { place: "Dikili", station: "Dikili", rows, obs, next: rows.map((r) => ({ ...r, wind: r.wind - 1 })) },
    forecastNext: step >= 12 ? { place: "Dikili", rows: rows.map((r) => ({ ...r, wind: r.wind - 2, gust: r.gust - 1 })) } : null,
    now,
  };
}

// Adıma geçiş: start dizisinden kendiliğinden starta geçince video sürer (aynı bağlantı); elle starta atlanırsa video 1:04'ten açılır
const toStep = (s, n, auto) => {
  const now = Date.now();
  const keep = auto && s.step === S.SEQ && n === S.START;
  return { ...s, step: n, s0: now, v0: keep ? s.v0 : n === S.START ? now - VID_START : now, vt: keep ? s.vt : n === S.START ? VID_START / 1000 : 0 };
};

// Adım adım oynatıcı: adım süresi dolunca sonraki adım; ‹ › ile elle, ❚❚ ile durdur
export function useDemo(on) {
  const [st, setSt] = useState(() => ({ step: 0, t0: Date.now(), s0: Date.now(), play: true, v0: Date.now(), vt: 0 }));
  // sunucuda çizilmez (saat farkı hidrasyon hatası verir): ilk tıkta açılır
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const t0 = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => (clearTimeout(t0), clearInterval(t));
  }, [on]);
  useEffect(() => {
    if (!on || !st.play) return undefined;
    const t = setTimeout(() => setSt((s) => (s.step >= DEMO_STEPS.length - 1 ? { ...s, play: false } : toStep(s, s.step + 1, true))), STEP_MS[st.step] - (Date.now() - st.s0));
    return () => clearTimeout(t);
  }, [on, st]);
  // durdurunca video durmaz: start dizisi ve start saatle sürer (s0 korunur)
  const go = (d) => setSt((s) => toStep(s, Math.max(0, Math.min(DEMO_STEPS.length - 1, s.step + d)), false));
  const ctl = { step: st.step, name: DEMO_STEPS[st.step], n: DEMO_STEPS.length, play: st.play, prev: () => go(-1), next: () => go(1), toggle: () => setSt((s) => ({ ...s, play: !s.play, s0: s.step === S.SEQ || s.step === S.START ? s.s0 : Date.now() })), restart: () => setSt({ step: 0, t0: Date.now(), s0: Date.now(), play: true, v0: Date.now(), vt: 0 }) };
  return { data: on && now ? demoData(st.step, st.t0, st.s0, now, st.v0, st.vt) : null, ctl };
}
