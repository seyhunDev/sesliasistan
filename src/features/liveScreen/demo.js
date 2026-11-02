"use client";

import { useEffect, useState } from "react";

// Örnek yarış (/canli/ornek; Seyhun 2026-11-02 "sarı grup, 3 yarış, şamandıra dönüşleri, genel sıralama, fazla sporcu koyma, tasarımı görmek
// için"): veritabanına dokunmaz, ekran adım adım oynar: yarış öncesi geri sayım → parkur kuruldu → start dizisi → start → dönüşler → video →
// alt yazı → rüzgâr değişti → yayına ara → sürdür → finiş → gün sonu. 1. ve 2. yarış dün yapılmış (genel sıralama onlardan), 3. yarış bugün.

const SAILS = [
  ["305", "Ece Kara", "Foça YK", "2011", "K"],
  ["712", "Deniz Aydın", "Dikili YK", "2013", "E"],
  ["1188", "Can Öz", "Ayvalık YK", "2011", "E"],
  ["24", "Ada Yılmaz", "Çeşme YK", "2014", "K"],
  ["94", "Mert Şen", "Dikili YK", "2012", "E"],
  ["918", "Elif Koç", "Urla YK", "2012", "K"],
  ["502", "Kaan Er", "Dikili YK", "2010", "E"],
  ["808", "Bora Ak", "Urla YK", "2013", "E"],
  ["77", "Lina Taş", "İzmir YK", "2013", "K"],
  ["1301", "Umut Can", "Bodrum YK", "2012", "E"],
  ["415", "Selin Ay", "Foça YK", "2011", "K"],
  ["62", "Arda Öz", "Çeşme YK", "2014", "E"],
  ["233", "Zeynep Su", "Ayvalık YK", "2012", "K"],
  ["1450", "Efe Tan", "Bodrum YK", "2011", "E"],
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
export const DEMO_STEPS = ["Yarış öncesi", "Parkur kuruldu", "Start dizisi", "Start", "1. şamandıra", "Video", "Alt yazı", "Rüzgâr değişti", "2. şamandıra", "Yayına ara", "Sürdür", "Finiş", "Gün sonu"];
const STEP_MS = 9000;

const iso = (ms) => new Date(ms).toISOString();
const ymd = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);
const hm = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(11, 16);

// Bir adımın verisi: t0 örneğin başladığı an, s0 adımın başladığı an, now şimdi
export function demoData(step, t0, s0, now) {
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
  const rows = Array.from({ length: 24 }, (_, h) => ({ hh: String(h).padStart(2, "0"), wind: Math.max(2, Math.round(5 + 7 * Math.sin((h - 7) / 5) + (h > 12 ? 2 : 0))), gust: Math.max(4, Math.round(8 + 9 * Math.sin((h - 7) / 5) + (h > 12 ? 3 : 0))), dir: 285 + h * 2, code: 1 }));
  const nowH = +hm(now).slice(0, 2);
  const obs = rows.filter((r) => +r.hh >= 6 && +r.hh <= nowH).map((r) => ({ hh: r.hh, wind: r.wind + 1, gust: r.gust + 2, dir: r.dir }));
  const ahead = step >= 3 ? (step - 3) * 4 * 60e3 : 0; // her adım yarışta ~4 dk ilerler
  const shift = (ms) => ms - ahead;
  const start = step === 2 ? s0 + 65e3 : shift(s0 - 1000); // start dizisinde 1:05 kalır; sonraki her adım süreyi ~4 dk ileri gösterir
  const plan = { day: today, at: hm(now + 3 * 60e3 + 59e3), order: [...(step < 2 ? [{ cls: "Optimist", grp: "Sarı", prep: "P" }] : []), ...(step < 12 ? [{ cls: "Optimist", grp: "Mavi", prep: "P" }, { cls: "Optimist", grp: "Mavi", prep: "P" }] : [])], status: step >= 12 ? "done" : "", next: step >= 12 ? { day: tom, at: "11:00" } : null, showAt: "06:00", ap: null };
  const course = step >= 1 ? { pts: {}, obs: [{ id: "w1", kind: "wind", deg: 295, kn: 12, at: iso(step === 1 ? s0 : t0 - 700e3), by: "ben", ref: "" }, { id: "a1", kind: "axis", deg: 300, at: iso(step === 1 ? s0 : t0 - 700e3), by: "ben", ref: "" }, { id: "l1", kind: "line", ref: "pin", deg: 32, at: iso(step === 1 ? s0 : t0 - 700e3), by: "ben" }], len: { orsa: 900 }, cards: [{ id: "A", route: ROUTE }, { id: "B", route: ["1", "4", "1", "2", "3", "F"] }], sel: "A" } : { pts: {}, obs: [], len: {} };
  if (step >= 7) course.obs.push({ id: "w2", kind: "wind", deg: 298, kn: 14, range: [285, 312], at: iso(step === 7 ? s0 : t0 - 600e3), by: "ben", ref: "" });
  const legs = step >= 11 ? ORDER : step >= 10 ? ORDER.slice(0, 3) : step >= 8 ? ORDER.slice(0, 2) : step >= 4 ? ORDER.slice(0, 1) : [];
  const starts = [r1, r2];
  if (step >= 2 && step < 12) starts.push({ id: "r3", day: today, at: iso(start), n: 3, ...(step >= 11 ? { fin: iso(now - 10e3) } : {}) });
  if (step >= 12) starts.push({ id: "r3", day: today, at: iso(now - 40 * 60e3), fin: iso(now - 5 * 60e3), n: 3 });
  if (step >= 2) {
    const at = times(step >= 12 ? now - 40 * 60e3 : start, legs.length);
    // her teknenin dönüş anı (lidere fark): liderden birkaç saniye arayla
    const tm = legs.map((l, k) => Object.fromEntries(l.map((sl, i) => [sl, Date.parse(at[k]) + i * 6000 + i * i * 400])));
    rounds.r3 = { route: ROUTE, legs, at, tm, grp: "Sarı", cls: "Optimist", prep: "P", ...(step >= 11 ? { pen: { [ORDER[3][5]]: "DSQ" } } : {}) };
  }
  const video = step >= 5 && step < 12;
  return {
    race: { name: "Örnek Kupa", startDate: yday, endDate: tom, place: "Dikili, İzmir" },
    starts,
    cur: step >= 2 && step < 12 ? "r3" : "",
    timer: step === 2 ? { end: start, mode: "start", dur: 300 } : step >= 3 && step < 11 ? { end: start, mode: "start", dur: 300 } : null,
    rounds,
    screen: video ? { kind: "rec", mid: "m1", loop: true, pause: step === 9, caption: step >= 6 ? (step >= 8 ? "Rüzgâr sola döndü, sol taraf kazançlı" : "1. şamandıra dönüşleri") : "" } : { kind: "" },
    stream: { url: "" },
    media: [{ id: "m1", kind: "photo", url: "/canli/ornek-deniz.svg", at: iso(t0), thumb: "" }],
    wind: [],
    day: today,
    course,
    fleets: [],
    entries,
    groups: grp,
    plan,
    forecast: { place: "Dikili", station: "Dikili", rows, obs },
    forecastNext: step >= 12 ? { place: "Dikili", rows: rows.map((r) => ({ ...r, wind: r.wind - 2, gust: r.gust - 1 })) } : null,
    now,
  };
}

// Adım adım oynatıcı: 9 sn'de bir sonraki adım; ‹ › ile elle, ❚❚ ile durdur
export function useDemo(on) {
  const [st, setSt] = useState(() => ({ step: 0, t0: Date.now(), s0: Date.now(), play: true }));
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
    const t = setTimeout(() => setSt((s) => (s.step >= DEMO_STEPS.length - 1 ? { ...s, play: false } : { ...s, step: s.step + 1, s0: Date.now() })), STEP_MS - (Date.now() - st.s0));
    return () => clearTimeout(t);
  }, [on, st]);
  const go = (d) => setSt((s) => ({ ...s, step: Math.max(0, Math.min(DEMO_STEPS.length - 1, s.step + d)), s0: Date.now() }));
  const ctl = { step: st.step, name: DEMO_STEPS[st.step], n: DEMO_STEPS.length, play: st.play, prev: () => go(-1), next: () => go(1), toggle: () => setSt((s) => ({ ...s, play: !s.play, s0: Date.now() })), restart: () => setSt({ step: 0, t0: Date.now(), s0: Date.now(), play: true }) };
  return { data: on && now ? demoData(st.step, st.t0, st.s0, now) : null, ctl };
}
