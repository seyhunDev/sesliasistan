// Yarış sitesinden belge alma (Seyhun 2026-11-03): izlenen yarışın (raceSite/{org}_{yarış}) sınıf sekmesindeki yeni belgeler
// (İlan Tahtası + Sonuçlar) indirilir, Storage'a konur (orgs/{org}/noticeFiles/site-…; kural storage.rules noticeFiles, ana hesap
// okur) ve orgs/{org}/raceLive/{yarış}/site/{anahtar} kaydı yazılır (state "new"; telefon yarış sayfası açılınca türüne göre
// işler, lib/siteDocs.js). Netlify zamanlı işlevi (netlify/functions/race-site.mjs) ve /api/race-site (ilk alma) kullanır.
// Yalnız göreli import (Netlify işlevi "@/" bilmez).
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { BOARD_URL, SITE, classesOf, legUrl, parseBoard } from "../siteBoard.js";
import { docKind, mergeSchedule, newDocs } from "../siteDocs.js";
import { cleanEntries, mergeEntries } from "../roundSay.js";
import { cleanGroups } from "../roundScore.js";

export const RESULTS_URL = `${SITE}/home/results/`;
export const resultsLegUrl = (n) => `${SITE}/Home/GetResultsLeg?legNumber=${encodeURIComponent(n)}`;
const UA = { "user-agent": "Mozilla/5.0 (Velora; kulup yaris belgeleri)" };
const MAX = 25 * 1024 * 1024;
const PER_RUN = 25; // bir çalışmada bir yarıştan en çok bu kadar belge (gerisi sonraki çalışmada)

async function getText(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.text();
}
// Aynı çalışmada aynı sayfa bir kez
export function pageCache() {
  const m = new Map();
  return (url) => {
    if (!m.has(url)) m.set(url, getText(url));
    return m.get(url);
  };
}

// Bir ayağın sınıfları, iki sayfadan (src: "board" | "results"). legNo boşsa şimdiki sezon (sayfanın içinde).
export async function legClasses(get, { season, n, legNo }) {
  const pick = (html) => {
    if (legNo) return classesOf(html);
    const s = parseBoard(html).seasons.find((x) => x.name === season);
    return s?.legs.find((l) => l.n === +n)?.classes || [];
  };
  const [b, r] = await Promise.all([get(legNo ? legUrl(legNo) : BOARD_URL), get(legNo ? resultsLegUrl(legNo) : RESULTS_URL).catch(() => "")]);
  const out = new Map();
  for (const [src, list] of [["board", pick(b)], ["results", r ? pick(r) : []]])
    for (const c of list) {
      const x = out.get(c.act) || { act: c.act, cls: c.cls, docs: [] };
      x.docs.push(...c.docs.map((d) => ({ ...d, src, kind: docKind(d.name, src) })));
      out.set(c.act, x);
    }
  return [...out.values()].map((c) => ({ ...c, docs: c.docs.sort((a, b) => b.at.localeCompare(a.at)) }));
}

// Sitenin yarış listesi: sezonlar ve seçilen sezonun ayakları, her ayakta sınıflar ve belgeleri (Siteden yarış al ekranı)
export async function siteList(get, season = "") {
  const board = parseBoard(await get(BOARD_URL));
  const seasons = board.seasons.map((s) => ({ id: s.id, name: s.name }));
  const s = board.seasons.find((x) => x.name === season) || board.seasons[0];
  if (!s) return { seasons, season: "", legs: [] };
  const legs = await Promise.all(s.legs.map(async (l) => ({ n: l.n, name: l.name, legNo: l.legNo, classes: await legClasses(get, { season: s.name, n: l.n, legNo: l.legNo }).catch(() => []) })));
  return { seasons, season: s.name, legs };
}

// Kaydedilmiş liste (Seyhun 2026-11-04 "listeyi bir kere kaydedelim, siteye sürekli istek atmayalım"): raceSite/_list-{sezon}
// ({ json, at }). Siteden ekranı buradan açılır; saatlik tarama (scanNew) şimdiki sezonu yeniler, eski kayıt 3 saatten eskiyse siteden okunur.
const LIST_TTL = 3 * 3600e3;
const listRef = (db, season) => db.collection("raceSite").doc(`_list-${season || "now"}`);
export async function saveList(db, season, list) {
  const json = JSON.stringify(list);
  if (json.length > 900000) return;
  await listRef(db, season).set({ json, at: new Date().toISOString() });
}
export async function cachedList(db, get, season = "") {
  const snap = await listRef(db, season).get().catch(() => null);
  const c = snap?.exists ? snap.data() : null;
  if (c?.json && Date.now() - (Date.parse(c.at) || 0) < LIST_TTL) return JSON.parse(c.json);
  try {
    const list = await siteList(get, season);
    await saveList(db, season, list).catch(() => {});
    return list;
  } catch (e) {
    // Site açılmazsa eski kayıt
    if (c?.json) return JSON.parse(c.json);
    throw e;
  }
}

const tokenUrl = (bucket, path, token) => `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

// Bir belgeyi indirir ve Storage'a koyar; künye { id, name, size, path, url, at } (noticeFile.js biçimi)
async function keep(bucket, orgId, raceId, d) {
  const res = await fetch(d.url, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`belge ${d.fid} ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > MAX) throw new Error(`belge ${d.fid} boyutu ${buf.length}`);
  const pdf = buf.subarray(0, 5).toString() === "%PDF-";
  const type = pdf ? "application/pdf" : res.headers.get("content-type") || "application/octet-stream";
  const id = `site-${raceId}-${d.key}`.slice(0, 140);
  const path = `orgs/${orgId}/noticeFiles/${id}`;
  const token = randomUUID();
  await bucket.file(path).save(buf, { contentType: type, metadata: { cacheControl: "private, max-age=31536000", metadata: { firebaseStorageDownloadTokens: token } } });
  const name = `${d.name.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 110)}${pdf ? ".pdf" : ""}`;
  return { file: { id, name, size: buf.length, path, url: tokenUrl(bucket, path, token), at: new Date().toISOString(), type }, buf };
}

// Yarış günü mü (başlangıçtan bir gün önce, bitişten bir gün sonra dahil): o zaman 10 dakikada bir, yoksa günde bir bakılır
const shift = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export function dueNow(e, now = new Date()) {
  const today = new Date(now.getTime() + 3 * 3600e3).toISOString().slice(0, 10); // Türkiye saati
  const live = e.startDate && today >= shift(e.startDate, -1) && today <= shift(e.endDate || e.startDate, 1);
  if (live) return true;
  const last = Date.parse(e.checkedAt || "") || 0;
  return now.getTime() - last >= 23.5 * 3600e3;
}

// Bir yarışın yeni belgeleri: indirir, kaydeder, raceSite kaydını günceller. Dönüş yeni belgeler [{ key, name, kind, … }]
// take(d, buf): belgeyi hemen kullanır (raceSiteTake.js), dönüş kaydın durumu { state, note, undo } ya da null (telefon işler)
export async function syncRace({ db, bucket, ref, entry, get, limit = PER_RUN, take = null }) {
  const { orgId, raceId } = entry;
  const classes = await legClasses(get, entry);
  const c = classes.find((x) => x.act === entry.act);
  const all = c ? newDocs(c.docs, entry.seen) : [];
  const fresh = all.slice(0, limit);
  const got = [];
  const site = db.collection("orgs").doc(orgId).collection("raceLive").doc(raceId).collection("site");
  // İndirme aynı anda 4 belge (Netlify isteğinin süresi kısa); kullanma sırayla, eskiden yeniye (aynı günün yeni listesi eskisinin yerine)
  for (let i = 0; i < fresh.length; i += 4) {
    const files = await Promise.all(
      fresh.slice(i, i + 4).map((d) =>
        keep(bucket, orgId, raceId, d).catch((e) => {
          console.warn("[yarış sitesi] belge alınamadı", d.name, e.message);
          return null;
        }),
      ),
    );
    for (const [j, k] of files.entries()) {
      if (!k) continue;
      const d = fresh[i + j];
      let done = null;
      if (take)
        try {
          done = await take(d, k.buf);
        } catch (e) {
          console.warn("[yarış sitesi] kullanılamadı", d.name, e.message);
          done = ["groups", "fleets", "entries", "results"].includes(d.kind) ? null : { state: "kept", note: "Okunamadı" };
        }
      const rec = { key: d.key, fid: d.fid, name: d.name, at: d.at, kind: d.kind, src: d.src, file: k.file, state: "new", ...(done || {}), got: new Date().toISOString() };
      await site.doc(d.key).set(rec);
      got.push(rec);
    }
  }
  got.sort((a, b) => a.at.localeCompare(b.at));
  const seen = [...new Set([...(entry.seen || []), ...got.map((d) => d.key)])].slice(-600);
  // Kalan varsa checkedAt yazılmaz: sonraki çalışma (10 dk) kalanları alır
  const more = all.length > fresh.length;
  await ref.set({ seen, missing: !c, ...(more ? {} : { checkedAt: new Date().toISOString() }) }, { merge: true });
  return got;
}

// Birleştir (Seyhun 2026-11-07 "kendi kurduğum yarışla federasyondan aldığımı birleştirelim, belgeler oraya gelsin"):
// siteden alınan yarışın (from) site bağlantısı, belgeleri (raceLive/site), kayıt ve grup listesi, talimattan okunan program ve
// Yayın programı var olan yarışa (to) taşınır; to'nun sporcuları, evrakı, bütçesi olduğu gibi kalır. Sonra from yarışı ve canlı kaydı silinir.
// Storage'daki belge dosyalarına dokunulmaz (taşınan kayıtlar onları gösterir).
export async function mergeSite({ db, orgId, from, to }) {
  const races = db.collection("orgs").doc(orgId).collection("races");
  const [a, b] = await Promise.all([races.doc(from).get(), races.doc(to).get()]);
  if (!a.exists || !b.exists) throw new Error("Yarış bulunamadı.");
  const A = a.data();
  const B = b.data();
  if (!A.site?.act) throw new Error("Bu yarış siteden alınmamış.");
  if (B.site?.act && B.site.act !== A.site.act) throw new Error("Seçtiğin yarış başka bir site yarışına bağlı.");
  const live = db.collection("orgs").doc(orgId).collection("raceLive");
  // Belgeler
  const docs = await live.doc(from).collection("site").get();
  for (let i = 0; i < docs.docs.length; i += 400) {
    const batch = db.batch();
    for (const d of docs.docs.slice(i, i + 400)) batch.set(live.doc(to).collection("site").doc(d.id), d.data());
    await batch.commit();
  }
  // Kayıt listesi ve günlük gruplar (to'nunki önce, aynı gün varsa to'nunki kalır)
  const [ea, eb] = await Promise.all([live.doc(from).collection("entries").doc("list").get(), live.doc(to).collection("entries").doc("list").get()]);
  if (ea.exists) {
    const x = ea.data();
    const y = eb.exists ? eb.data() : {};
    const groups = { ...Object.fromEntries(Object.entries(cleanGroups(x.groups)).map(([d, l]) => [d, Object.fromEntries(l)])), ...Object.fromEntries(Object.entries(cleanGroups(y.groups)).map(([d, l]) => [d, Object.fromEntries(l)])) };
    const rows = mergeEntries(cleanEntries(y.rows), cleanEntries(x.rows)).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "grp")));
    await live.doc(to).collection("entries").doc("list").set({ rows, groups, at: new Date().toISOString() });
  }
  // Yayın programı: to'da yoksa from'unki
  const [la, lb] = await Promise.all([live.doc(from).get(), live.doc(to).get()]);
  const pa = la.exists ? la.data().plan || {} : {};
  const pb = lb.exists ? lb.data().plan || {} : {};
  if (pa.agenda && !Object.keys(pb.agenda || {}).length) {
    const keep = Object.fromEntries(["daily", "times", "off", "agenda"].filter((k) => pa[k] !== undefined).map((k) => [k, pa[k]]));
    await live.doc(to).set({ plan: keep }, { mergeFields: Object.keys(keep).map((k) => `plan.${k}`) });
  }
  // Yarış: site bağlantısı; talimat programı birleşir (to'nunki üstüne from'un satırları), talimat dosyası yoksa from'unki
  const na = A.notice && typeof A.notice === "object" ? A.notice : null;
  const nb = B.notice && typeof B.notice === "object" ? B.notice : null;
  const notice = na ? { ...na, ...(nb || {}), schedule: mergeSchedule(nb?.schedule, na.schedule) } : nb;
  await races.doc(to).update({ site: A.site, ...(notice ? { notice } : {}), ...(!B.noticeFile && A.noticeFile ? { noticeFile: A.noticeFile } : {}), updatedAt: FieldValue.serverTimestamp() });
  // İzleme kaydı to'ya
  const sa = await db.collection("raceSite").doc(`${orgId}_${from}`).get();
  if (sa.exists) await db.collection("raceSite").doc(`${orgId}_${to}`).set({ ...sa.data(), raceId: to, name: String(B.name || sa.data().name || "").slice(0, 120), startDate: B.startDate || sa.data().startDate || "", endDate: B.endDate || sa.data().endDate || "" });
  await db.collection("raceSite").doc(`${orgId}_${from}`).delete();
  // Kopya yarış ve canlı kaydı
  await db.recursiveDelete(live.doc(from));
  await races.doc(from).delete();
}

// Bir kişiye bildirim (bildirim kutusu + telefonları)
export async function notifyUser({ db, uid, payload, recordInbox, sendDevice }) {
  const ref = db.collection("users").doc(uid);
  const badge = await recordInbox(db, uid, payload);
  const push = (await ref.get()).data()?.push || {};
  let sent = 0;
  for (const [key, sub] of Object.entries(push)) {
    try {
      await sendDevice(sub, JSON.stringify({ ...payload, badge }), { TTL: 86400 });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await ref.update({ [`push.${key}`]: FieldValue.delete() }).catch(() => {});
      else console.warn("[yarış sitesi] bildirim gitmedi", e.statusCode || e.message);
    }
  }
  return sent;
}

// Yeni belgelerin bildirimi ana hesaba. Tek belge: "1. Ayak Optimist · Renk listesi (4 Kas) geldi" + ne yapıldığı
export async function notifyDocs({ db, entry, got, recordInbox, sendDevice, docNote }) {
  if (!got.length) return 0;
  const race = entry.name || entry.cls || "Yarış";
  const title = got.length === 1 ? docNote(race, got[0]) : `${race} · ${got.length} yeni belge geldi`;
  const body = got.length === 1 ? got[0].note || "" : got.map((d) => d.name).slice(0, 4).join(", ");
  return notifyUser({ db, uid: entry.orgId, payload: { title, body, tag: `site-${entry.raceId}`, url: `/athletes/races/${entry.raceId}?sec=site` }, recordInbox, sendDevice });
}

// Sitede yeni yarış var mı (saatte bir): sezonun sınıf sekmeleri raceSite/_known'daki bilinenlerle karşılaştırılır.
// İlk taramada yalnız kaydedilir. Bildirim Siteden ekranını açmış ya da yarış izleyen ana hesaplara.
export const KNOWN = "_known";
export async function scanNew({ db, get, recordInbox, sendDevice, newRaces, newRacesNote }) {
  const ref = db.collection("raceSite").doc(KNOWN);
  const k = (await ref.get()).data() || {};
  const list = await siteList(get, "");
  await Promise.all([saveList(db, "", list), saveList(db, list.season, list)]).catch(() => {});
  const acts = list.legs.flatMap((l) => (l.classes || []).map((c) => c.act));
  const fresh = Array.isArray(k.acts) ? newRaces(list.legs, k.acts) : [];
  const now = new Date().toISOString();
  const news = [...fresh.map((x) => ({ act: x.act, cls: x.cls, leg: x.leg, at: now })), ...(Array.isArray(k.news) ? k.news : [])].slice(0, 100);
  await ref.set({ season: list.season, acts: [...new Set([...(k.acts || []), ...acts])].slice(-3000), scanAt: now, ...(fresh.length ? { news } : {}) }, { merge: true });
  const note = newRacesNote(fresh, list.season);
  if (!note) return 0;
  const follow = await db.collection("raceSite").where("on", "==", true).get();
  const owners = [...new Set([...(k.owners || []), ...follow.docs.map((d) => d.data().orgId)])].filter(Boolean);
  for (const uid of owners) await notifyUser({ db, uid, payload: { ...note, tag: `site-new-${fresh[0].act}`, url: "/athletes/races/new" }, recordInbox, sendDevice }).catch(() => {});
  return fresh.length;
}
