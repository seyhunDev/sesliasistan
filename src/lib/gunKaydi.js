// Gün kaydı (Seyhun 2026-11-26 "kimin ne yaptığını, kime ne yaptırıldığını oradan çıkaracağız… PDF"; örnek
// project-files/bilgi-ekrani/gun-kaydi/ornek.html): bir günün (bilgiKanal) bütün kaydı tek belgede. Saf hesap: girdi
// { kanal, log (bilgiLog, ch == gün), boats (katılan sporcular, izden) }, çıktı başlık, özet sayılar, sporcu tablosu ve saatli olaylar.
import { PEN } from "@/lib/bilgi";

const pad = (n) => String(n).padStart(2, "0");
export const hhmm = (t) => `${pad(new Date(t).getHours())}:${pad(new Date(t).getMinutes())}`;
const mss = (s) => `${Math.floor((s || 0) / 60)}:${pad(Math.round(s || 0) % 60)}`;
export function sure(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h} sa${m % 60 ? ` ${m % 60} dk` : ""}` : `${m} dk`;
}
const ST = { seen: "Görüldü", sent: "İletildi", part: "Kısmen görüldü", fail: "Ulaşmadı" };
const nameOf = (b) => [b?.sail, b?.name].filter(Boolean).join(" · ") || "Sporcu";

// Aynı cezanın birden çok Yönet ekranından gelen "kendiliğinden kalktı" kayıtları tek satır
function dedupe(log) {
  const out = [];
  for (const r of log) {
    if (r.kind === "ceza-off" && out.some((x) => x.kind === "ceza-off" && x.dev === r.dev && x.k === r.k && Math.abs((x.at || 0) - (r.at || 0)) < 10e3)) continue;
    out.push(r);
  }
  return out;
}

export function gunRows({ kanal = {}, log = [], boats = [] } = {}) {
  const rows = dedupe([...log].sort((a, b) => (a.at || 0) - (b.at || 0)));
  const start = kanal.at || rows[0]?.at || 0;
  const end = kanal.end || 0;
  const date = start ? new Date(start) : null;

  // Sporcular: izden katılanlar + kayıtta adı geçenler (tek kişiye giden mesaj, ceza, not)
  const ath = new Map();
  const add = (dev, label, extra = {}) => {
    if (!dev && !label) return null;
    const key = dev || label;
    if (!ath.has(key)) ath.set(key, { key, dev: dev || "", label: label || "Sporcu", tags: [], pen: [], sana: 0, not: 0, vid: [], ...extra });
    return ath.get(key);
  };
  for (const b of boats) add(b.dev, nameOf(b), { sail: b.sail || "", name: b.name || "" });
  for (const r of rows) if (["ceza", "ceza-off", "not"].includes(r.kind) && r.dev) add(r.dev, r.to);
  const byDev = (dev) => ath.get(dev) || [...ath.values()].find((a) => a.dev === dev);

  const ev = [];
  const coaches = new Set();
  if (start) ev.push({ at: start, who: "Hepsi", what: "Gün başladı", det: `${kanal.name || "Antrenman"}${ath.size ? ` · ${ath.size} sporcu katıldı` : ""}`, by: "" });
  for (const t of Array.isArray(kanal.starts) ? kanal.starts : []) ev.push({ at: t, who: "Hepsi", what: "Start", det: "Start işareti", by: "" });
  const starts = Array.isArray(kanal.starts) ? kanal.starts.length : 0;
  let pen = 0;
  let fd = 0;
  let msg = 0;
  let vid = 0;
  for (const r of rows) {
    const by = r.by || "";
    if (by) coaches.add(by);
    const st = ST[r.st] || "";
    const devs = String(r.dev || "")
      .split(",")
      .filter(Boolean);
    const one = devs.length === 1 ? byDev(devs[0]) : null;
    if (r.kind === "msg") {
      msg++;
      devs.forEach((d) => byDev(d) && byDev(d).sana++);
      ev.push({ at: r.at, who: r.to || "Hepsi", what: "Mesaj", det: [`"${r.text || ""}"`, st].filter(Boolean).join(" · "), by });
    } else if (r.kind === "ses") {
      msg++;
      devs.forEach((d) => byDev(d) && byDev(d).sana++);
      ev.push({ at: r.at, who: r.to || "Hepsi", what: r.kalip ? "Kalıp" : "Ses", det: [r.kalip ? `"${r.kalip}"` : r.yazi ? `"${r.yazi}"` : "", mss(r.dur), st].filter(Boolean).join(" · "), by });
    } else if (r.kind === "gelen") {
      msg++;
      ev.push({ at: r.at, who: `${r.from || "Sporcu"} →`, what: "Gelen ses", det: mss(r.dur), by: "" });
    } else if (r.kind === "ceza") {
      // Geri al ile geri gelen ceza yeni ceza sayılmaz
      if (!r.back) {
        if (r.k === "fd") fd++;
        else pen++;
        if (one) one.pen.push(r.k);
      }
      const p = PEN[r.k];
      ev.push({ at: r.at, who: r.to || one?.label || "Sporcu", what: r.k === "fd" ? "Fodepar" : r.k === "sb" ? "Sarı bayrak" : "Ceza", tag: r.k, det: [p?.t || "", r.back ? "Geri al ile geri geldi" : ""].filter(Boolean).join(" · "), by });
    } else if (r.kind === "ceza-off") {
      ev.push({ at: r.at, who: r.to || one?.label || "Sporcu", what: "Ceza kalktı", tag: "off", det: `${PEN[r.k]?.big || ""} · ${r.auto ? "5 sn sonra kendiliğinden" : "Elle kaldırıldı"}`, by: r.auto ? "" : by });
    } else if (r.kind === "not") {
      if (one) one.not++;
      ev.push({ at: r.at, who: r.to || one?.label || "Sporcu", what: "Sesli not", det: `${mss(r.dur)} · sporcu ekranında Notlar'da`, by });
    } else if (r.kind === "video") {
      vid++;
      const tags = Array.isArray(r.tags) ? r.tags : [];
      const hit = [...ath.values()].filter((a) => tags.some((t) => t && (t === a.name || t === a.sail || t === a.label)));
      const rest = tags.filter((t) => !hit.some((a) => t === a.name || t === a.sail || t === a.label));
      hit.forEach((a) => a.vid.push(rest.join(", ")));
      ev.push({ at: r.at, who: hit.length ? hit.map((a) => a.label).join(", ") : "—", what: "Video", det: [r.dur ? mss(r.dur) : "", rest.join(", ")].filter(Boolean).join(" · ") || "—", by });
    }
  }
  if (end) ev.push({ at: end, who: "Hepsi", what: "Gün bitti", det: start ? sure(end - start) : "", by: "" });
  ev.sort((a, b) => a.at - b.at);

  const athletes = [...ath.values()]
    .map((a) => ({
      label: a.label,
      pen: a.pen.map((k) => ({ k, t: PEN[k]?.big || k })),
      sana: a.sana,
      not: a.not,
      vid: a.vid.length ? `${a.vid.length}${a.vid.some(Boolean) ? ` (${[...new Set(a.vid.filter(Boolean))].join(", ")})` : ""}` : "",
    }))
    .sort((a, b) => b.pen.length + b.sana + b.not + (b.vid ? 1 : 0) - (a.pen.length + a.sana + a.not + (a.vid ? 1 : 0)) || a.label.localeCompare(b.label, "tr"));

  const dateTxt = date ? date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "";
  const wd = date ? date.toLocaleDateString("tr-TR", { weekday: "long" }) : "";
  const span = start ? `${hhmm(start)} – ${end ? `${hhmm(end)} (${sure(end - start)})` : "sürüyor"}` : "";
  return {
    title: [kanal.name || "Antrenman", dateTxt].filter(Boolean).join(" · "),
    sub: [wd, span].filter(Boolean).join(" · "),
    coach: [...coaches].join(", "),
    sum: [
      { n: ath.size, t: "Sporcu" },
      { n: starts, t: "Start" },
      { n: pen, t: "Ceza" },
      { n: fd, t: "FD" },
      { n: msg, t: "Mesaj / ses" },
      { n: vid, t: "Video" },
    ],
    athletes,
    events: ev.map((e) => ({ ...e, time: hhmm(e.at) })),
    file: `gun-kaydi-${kanal.day || (date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : "gun")}.pdf`,
  };
}
