"use client";

// Yarış sitesinden belgeler, telefon tarafı (Seyhun 2026-11-03 "seçtiğim yarışların belgelerini alıyoruz, yüklüyoruz, gösteriyoruz").
// Sunucu (/api/race-site, netlify/functions/race-site.mjs) sitedeki yeni belgeyi Storage'a koyar ve
// orgs/{org}/raceLive/{yarış}/site/{anahtar} kaydını "new" olarak yazar. Yarış sayfası açılınca burada türüne göre işlenir:
//   renk listesi / final grupları → o günün grupları (+ kayıt listesine eklenir), sporcu listesi → kayıt listesi,
//   sonuçlar → yarışın sonuçları (page.jsx, resultsImport.js). Listeler, talimat ve ek talimat çoğunlukla sunucuda hemen işlenir
//   (lib/server/raceSiteTake.js); burada yalnız sunucunun okuyamadığı listeler (yapay zekayla) ve sonuçlar işlenir.
// Her işlenen belge "used" olur ve öncesini (undo) saklar: "Geri al" eski hâline döndürür.
import { FieldPath, collection, deleteField, doc, getDocs, onSnapshot, runTransaction } from "firebase/firestore";
import { setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { getStored } from "@/lib/firebase/fileStore";
import { mergeEntries } from "@/lib/roundSay";
import { dayGroups } from "@/lib/roundScore";
import { dropSheet } from "@/lib/resultSheet";
import { colorOf, dayOf } from "@/lib/siteDocs";
import { loadEntryDoc, readEntryFile, saveEntries, saveGroups } from "@/features/rounds/roundsStore";
import { dropSheetDoc } from "./raceLiveStore";
import { raceGone, saveRaceResults } from "./races";

const col = (orgId, raceId) => collection(db, "orgs", orgId, "raceLive", raceId, "site");
const entryRef = (orgId, raceId) => doc(db, "orgs", orgId, "raceLive", raceId, "entries", "list");

async function ask(url, opts = {}) {
  const res = await authFetch(url, { timeout: 60000, ...opts });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Yarış sitesine ulaşılamadı.");
  return p;
}
// Sezonlar, ayaklar, sınıflar ve belgeleri
export const loadSiteList = (season = "") => ask(`/api/race-site${season ? `?season=${encodeURIComponent(season)}` : ""}`);
// Sitedeki belgenin kendisi (yarış ilanı) dosya olarak
export async function siteFile(d) {
  const res = await authFetch(`/api/race-site?file=${d.fid}`, { timeout: 60000 });
  if (!res.ok) throw new Error("Belge siteden alınamadı.");
  const b = await res.blob();
  return new File([b], `${d.name.replace(/\.pdf$/i, "")}.pdf`, { type: "application/pdf" });
}
const post = (body) => ask("/api/race-site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
export const followSite = (raceId, site) => post({ raceId, site });
export const unfollowSite = (raceId) => post({ raceId, off: true });
export const checkSite = (raceId) => post({ raceId, now: true });
// Siteden alınan yarışı var olan yarışa birleştir (sunucu taşır, kopya yarış silinir); dönüş birleşilen yarışın kimliği
export async function mergeSite(raceId, into) {
  const p = await post({ raceId, into });
  raceGone(raceId);
  return p.id || into;
}

// Yarışın sitedeki belgeleri, yeni yüklenen önce; canlı (sunucu belge alıp işledikçe liste kendiliğinden yenilenir)
const sorted = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.at).localeCompare(String(a.at)));
export const loadSiteDocs = (orgId, raceId) => getDocs(col(orgId, raceId)).then(sorted);
export const watchSiteDocs = (orgId, raceId, cb, onErr) => onSnapshot(col(orgId, raceId), (snap) => cb(sorted(snap)), onErr);
const mark = (orgId, raceId, key, patch) => setDoc(doc(col(orgId, raceId), key), patch, { merge: true });

// Alınmış belgenin kendisi: sunucu Storage'dan okur (/api/race-site?race&key). Telefondan doğrudan Storage indirmesi dakikalarca
// bekleyip "max retry" ile düşüyordu (Seyhun 2026-11-04); hata yazısı PdfViewer'da tam görünür.
export async function siteDocBlob(raceId, d) {
  const res = await authFetch(`/api/race-site?race=${encodeURIComponent(raceId)}&key=${encodeURIComponent(d.id || d.key)}`, { timeout: 60000 });
  if (res.status === 413 && d.file) return getStored(d.file, "application/pdf");
  if (!res.ok) {
    const p = await res.json().catch(() => ({}));
    throw new Error(p.error || `Belge açılamadı (${res.status}).`);
  }
  const b = await res.blob();
  return b.type === "application/pdf" ? b : new Blob([b], { type: "application/pdf" });
}
const fileOf = async (d, raceId) => new File([await siteDocBlob(raceId, d)], d.file?.name || `${d.name}.pdf`, { type: "application/pdf" });
export const LIST_KINDS = ["groups", "fleets", "entries"];

// Telefonda işlenecek belge (sonuç, sunucunun okuyamadığı liste): yarış sayfası (SiteDocs) ve Yayın › Belgeler (DocsTab) ikisi de
// açık olabilir; aynı belge iki kez işlenmesin diye önce kayıt "busy" yapılır (işlem). 5 dakikadan eski "busy" yarım kalmıştır, yeniden alınır.
const STALE = 5 * 60e3;
export const waiting = (d) => d.state === "new" || (d.state === "busy" && Date.now() - (Date.parse(d.busyAt || "") || 0) > STALE);
export async function claimDoc(orgId, raceId, key) {
  try {
    return await runTransaction(db, async (tx) => {
      const ref = doc(col(orgId, raceId), key);
      const snap = await tx.get(ref);
      if (!snap.exists() || !waiting(snap.data())) return false;
      tx.update(ref, { state: "busy", busyAt: new Date().toISOString() });
      return true;
    });
  } catch {
    return false;
  }
}

// Liste belgesi (renk, final grupları, sporcu): okunur, kayıt listesine eklenir; grup varsa o günün gruplarına yazılır.
// Dönüş kaydın yeni alanları { state, note, undo }
export async function applyList(orgId, raceId, d) {
  const rows = await readEntryFile(await fileOf(d, raceId));
  if (!rows.length) return { state: "kept", note: "Liste okunamadı" };
  const cur = await loadEntryDoc(orgId, raceId);
  const undo = { rows: cur.rows };
  let note = "";
  if (d.kind !== "entries") {
    const color = colorOf(d.name);
    const list = rows.map((r) => [r.sail, r.grp || color]).filter(([s, g]) => s && g);
    const day = dayOf(d.name, d.at) || String(d.at).slice(0, 10);
    if (list.length) {
      const old = cur.groups[day] || null;
      undo.day = day;
      undo.groups = old ? Object.fromEntries(old) : null;
      await saveGroups(orgId, raceId, day, dayGroups(old, list));
      note = `${list.length} teknenin grubu · ${+day.slice(8)} ${new Date(`${day}T12:00:00`).toLocaleDateString("tr-TR", { month: "short" })}`;
    }
  }
  const next = mergeEntries(cur.rows, rows);
  await saveEntries(orgId, raceId, next);
  const n = next.length - cur.rows.length;
  note = note || `${rows.length} tekne${n > 0 ? `, ${n} yeni` : ""}`;
  return { state: "used", note, undo };
}

// Geri al: kayıt listesi ve o günün grupları belgeden önceki hâline; sonuç belgesi sonuçlardan çıkar
export async function undoDoc(orgId, race, d) {
  const u = d.undo || {};
  if (d.kind === "results") {
    const fid = u.file;
    const res = dropSheet(race.results || { fleet: "", rows: {} }, fid);
    await saveRaceResults(orgId, race.id, res);
    if (fid) await dropSheetDoc(orgId, race.id, fid);
    await mark(orgId, race.id, d.id, { state: "undone", undo: deleteField() });
    return { results: res };
  }
  // Talimat / ek talimat: yarışın talimat bilgisi (program) ve Yayın programı öncesine döner
  if (u.notice) {
    await updateDoc(doc(db, "orgs", orgId, "races", race.id), { notice: u.notice });
    // Yayın programı da öncesine (raceLive plan alanları)
    if (u.plan) await updateDoc(doc(db, "orgs", orgId, "raceLive", race.id), Object.fromEntries(Object.entries(u.plan).map(([k, v]) => [`plan.${k}`, v])));
    await mark(orgId, race.id, d.id, { state: "undone", undo: deleteField() });
    return { notice: u.notice };
  }
  if (u.rows) await saveEntries(orgId, race.id, u.rows);
  if (u.day) {
    if (u.groups) await saveGroups(orgId, race.id, u.day, Object.entries(u.groups));
    else await updateDoc(entryRef(orgId, race.id), new FieldPath("groups", u.day), deleteField());
  }
  await mark(orgId, race.id, d.id, { state: "undone", undo: deleteField() });
  return {};
}
// Geri alınanı yeniden işle
export const redoDoc = (orgId, raceId, d) => mark(orgId, raceId, d.id, { state: "new" });
export const saveDocState = mark;
