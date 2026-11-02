"use client";

// Canlı ekranın işleri: hem uygulamadaki "Canlı ekran" penceresi hem asistan (isler/canliEkran.js) bunları kullanır (sesle = elle).
import { authFetch } from "@/lib/authFetch";
import { loadRoundsOf, saveCourseShow, savePlan, saveRounds, saveScreen, saveStream } from "@/features/athletes/raceLiveStore";
import { momentRace, momentRaceName, raceName } from "@/lib/raceLive";
import { applyRound, currentStart, markName, recTitle, roundCommand, routeCommand, screenCommand, setRoute, ytEmbed } from "@/lib/raceRounds";

export const liveUrl = (raceId) => `${window.location.origin}/canli/${raceId}`;

// Yarışı herkese açık ekrana açar (bir kez yeter; sunucu canliEkran/{yarış} yazar)
const opened = new Set();
export async function ensurePublic(raceId) {
  if (opened.has(raceId)) return true;
  const res = await authFetch("/api/canli", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ race: raceId }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Canlı ekran açılamadı.");
  opened.add(raceId);
  return true;
}

// Ekranda oynayacak kaydın yarış numarası (çekim anı kayıtlıysa ondan, değilse çekildiği saatten önceki son start)
const raceNo = (m, starts) => (m.phase ? momentRace(m, starts) : [...(starts || [])].filter((x) => !x.void && x.at <= m.at).at(-1)?.n || 0);
// Kaydın ekrandaki adı ("1. yarış startı")
export const recName = (m, starts) => recTitle(m, m.phase ? momentRaceName(m, starts) : raceNo(m, starts) ? `${raceNo(m, starts)}. yarış` : "");

// Son dönüş yazımı (hemen ardından "geri al")
let last = null; // { t, org, id, sid, prev, cur }
export const UNDO_MS = 3 * 60 * 1000;
export const roundJust = () => !!last && Date.now() - last.t < UNDO_MS;
export const roundAt = () => last?.t || 0;
export async function roundUndo() {
  if (!last) return false;
  const w = last;
  last = null;
  await saveRounds(w.org, w.id, w.sid, w.prev, w.cur);
  return true;
}

// "1. şamandıra 1302 1287", "finish 1287", "parkur 1 4 1 2 3 finish" → { text } | { fail } | null (benim değil)
export async function roundSay(orgId, raceId, s) {
  const rc = routeCommand(s);
  const rd = rc ? null : roundCommand(s);
  if (!rc && !rd) return null;
  const L = await loadRoundsOf(orgId, raceId);
  const st = currentStart(L.starts, L.timer);
  if (!st) return { fail: "Önce yarışı başlat, dönüşler o yarışa yazılır." };
  const prev = L.rounds[st.id] || { route: [], legs: [] };
  if (rc) {
    const e = setRoute(prev, rc.route);
    await saveRounds(orgId, raceId, st.id, e, prev);
    last = { t: Date.now(), org: orgId, id: raceId, sid: st.id, prev, cur: e };
    ensurePublic(raceId).catch(() => {});
    return { text: `${raceName(st)} parkuru: ${e.route.map((m) => (m === "F" ? "Finish" : m)).join(", ")}.` };
  }
  const r = applyRound(prev, rd.mark, rd.sails);
  if (!r.added.length) return { fail: `${rd.sails.join(", ")} bu noktada zaten yazılı.` };
  await saveRounds(orgId, raceId, st.id, r.entry, prev);
  last = { t: Date.now(), org: orgId, id: raceId, sid: st.id, prev, cur: r.entry };
  ensurePublic(raceId).catch(() => {});
  const skip = r.skipped.length ? ` ${r.skipped.join(", ")} zaten yazılıydı.` : "";
  return { text: `${markName(rd.mark)}: ${r.added.map((a) => a[1]).join(", ")}.${skip}` };
}

// Ekrandaki kaydı seç: { kind: "live" } | { kind: "drone" } | { kind: "rec", mid, loop } | { kind: "" }
export async function showOnScreen(orgId, raceId, s) {
  await saveScreen(orgId, raceId, s);
  ensurePublic(raceId).catch(() => {});
}
export const setStream = (orgId, raceId, s) => saveStream(orgId, raceId, s);

// "ekranda birinci yarışın startını döngüde göster", "ekranda canlı yayını göster", "ekrandan kaldır"
export async function screenSay(orgId, raceId, s) {
  const c = screenCommand(s);
  if (!c) return null;
  if (c.clear) {
    await showOnScreen(orgId, raceId, { kind: "" });
    return { text: "Ekrandan kaldırdım." };
  }
  const L = await loadRoundsOf(orgId, raceId);
  if ("caption" in c) {
    await showOnScreen(orgId, raceId, { ...L.screen, caption: c.caption });
    return { text: c.caption ? `Ekrana yazdım: ${c.caption}.` : "Ekrandaki yazıyı kaldırdım." };
  }
  if ("orange" in c) {
    await savePlan(orgId, raceId, { ...L.plan, orange: c.orange ? new Date().toISOString() : "" });
    ensurePublic(raceId).catch(() => {});
    return { text: c.orange ? "Turuncu bayrak çekildi, ekran start öncesine geçti." : "Turuncu bayrak indi." };
  }
  if ("ov" in c) {
    await saveCourseShow(orgId, raceId, { ...L.courseShow, ov: c.ov });
    return { text: c.ov ? "Genel sıralama ekranda." : "Genel sıralama kaldırıldı." };
  }
  if ("side" in c) {
    await saveCourseShow(orgId, raceId, { ...L.courseShow, side: c.side });
    return { text: c.side ? "Sol bilgi açıldı." : "Sol bilgi kapandı." };
  }
  if ("pause" in c) {
    if (!L.screen.kind) return { fail: "Ekranda yayın yok." };
    await showOnScreen(orgId, raceId, { ...L.screen, pause: c.pause });
    return { text: c.pause ? "Yayına ara verildi, ekranda görüntü kalır." : "Yayın sürüyor." };
  }
  if (c.kind === "drone") {
    if (!ytEmbed(L.stream.drone)) return { fail: "Önce drone yayınının bağlantısını Yayın › Video › Drone'a yapıştır." };
    await showOnScreen(orgId, raceId, { kind: "drone" });
    return { text: "Ekranda drone yayını." };
  }
  if (c.kind === "live") {
    if (!ytEmbed(L.stream.url)) return { fail: "Önce canlı yayın bağlantısını Canlı sekmesine yapıştır." };
    await showOnScreen(orgId, raceId, { kind: "live" });
    return { text: "Ekranda canlı yayın." };
  }
  const vids = L.media.filter((m) => m.kind === "video" && m.url); // yalnız telefonda duran (ph) ekrana gidemez
  let pick = null;
  if (c.n) {
    const of = vids.filter((m) => raceNo(m, L.starts) === c.n);
    // startına en yakın çekim (öncesi ya da ilk 2 dk), yoksa o yarışın son videosu
    pick = [...of].filter((m) => m.phase && m.sec <= 120).sort((a, b) => Math.abs(a.sec) - Math.abs(b.sec))[0] || of.at(-1) || null;
    if (!pick) return { fail: `${c.n}. yarışın videosu yok.` };
  } else pick = vids.at(-1) || null;
  if (!pick) return { fail: "Gösterilecek video yok." };
  await showOnScreen(orgId, raceId, { kind: "rec", mid: pick.id, loop: c.loop });
  return { text: `Ekranda: ${recName(pick, L.starts)}${c.loop ? ", döngüde" : ""}.` };
}
