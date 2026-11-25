"use client";

// Canlı ekranın işleri: hem uygulamadaki "Canlı ekran" penceresi hem asistan (isler/canliEkran.js) bunları kullanır (sesle = elle).
import { authFetch } from "@/lib/authFetch";
import { loadEntryDoc } from "@/features/rounds/roundsStore";
import { groupMap, groupsOn } from "@/lib/roundScore";
import { loadRoundsOf, saveCourseShow, savePlan, savePlanKeys, saveRounds, saveScreen, saveStream } from "@/features/athletes/raceLiveStore";
import { addGrps, grpCommand, momentRace, momentRaceName, raceName, rollPlan } from "@/lib/raceLive";
import { applyRound, cleanEntry, currentStart, markName, PEN_NAME, penCommand, penStart, recTitle, roundCommand, routeCommand, screenCommand, setRoute, sourceBySay, streamSources, ytEmbed } from "@/lib/raceRounds";

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

// Ekrandaki kaydı seç: { kind: "live" } | { kind: "src", src } | { kind: "drone" } | { kind: "rec", mid, loop } | { kind: "" }
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
  if (c.kind === "drone" || c.kind === "src") {
    const list = streamSources(L.stream);
    const x = c.kind === "src" ? sourceBySay(list, c.say) : list.find((k) => k.kind === "drone" && k.url) || list.find((k) => k.kind === "drone");
    if (!x) return { fail: "Bu adla bir kaynak yok. Yayın › Video › Canlı kaynaklar'a bak." };
    if (!ytEmbed(x.url)) return { fail: `Önce ${x.name} için YouTube bağlantısını Yayın › Video'ya yapıştır.` };
    await showOnScreen(orgId, raceId, { kind: "src", src: x.id });
    return { text: `Ekranda ${x.name}.` };
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

// "mavi grubu ekle", "optimist kırmızı ve yeşil grupları ekle" (Seyhun 2026-11-08): Yayın › Süre'deki "+ Grup" ile aynı (addGrps)
export async function grpSay(orgId, raceId, s, today) {
  const c = grpCommand(s);
  if (!c) return null;
  const L = await loadRoundsOf(orgId, raceId);
  const plan = rollPlan(L.plan, today);
  const cls = plan.sets.find((x) => c.say.includes(x.cls.trim().toLocaleLowerCase("tr")))?.cls || "";
  const p = addGrps(plan, c.add, cls);
  if (!p) return { fail: `${c.add.join(", ")} zaten var.` };
  const { added, to, ...patch } = p;
  await savePlanKeys(orgId, raceId, { ...plan, ...patch }, ["sets", "cls", "grps", "order", ...(plan.day !== L.plan.day ? ["day", "at", "status", "next", "ap"] : [])]);
  return { text: `${added.join(", ")} grup eklendi${to ? `, ${to}` : ""}. Bekleyen yarışlara startı da girdi.` };
}

// Ceza sesle (Seyhun 2026-11-11): "UFD 512", "kara bayrak 88 ve 1302", "512'nin cezası kalksın". Yayın › Süre › Ceza ile aynı kayıt (rounds[start].pen);
// her tekne kendi grubunun son yarışına. Hemen ardından "geri al" (tek yarışa yazıldıysa).
export async function penSay(orgId, raceId, s, today) {
  const c = penCommand(s);
  if (!c) return null;
  const [L, ent] = await Promise.all([loadRoundsOf(orgId, raceId), loadEntryDoc(orgId, raceId)]);
  const gm = groupMap(groupsOn(ent.groups, today));
  const by = {};
  for (const sail of c.sails) {
    const st = penStart(L.starts, L.rounds, gm, sail, today, L.timer);
    if (st) (by[st.id] = by[st.id] || { st, sails: [] }).sails.push(sail);
  }
  const ids = Object.keys(by);
  if (!ids.length) return { fail: "Bugün başlamış yarış yok, ceza bir yarışa yazılır." };
  const names = [];
  for (const sid of ids) {
    const prev = cleanEntry(L.rounds[sid] || {});
    const pen = { ...(prev.pen || {}) };
    for (const sail of by[sid].sails) if (c.code) pen[sail] = c.code;
    else delete pen[sail];
    const { pen: _old, ...rest } = prev;
    const cur = Object.keys(pen).length ? { ...rest, pen } : rest;
    await saveRounds(orgId, raceId, sid, cur, L.rounds[sid] ? prev : null);
    last = ids.length === 1 ? { t: Date.now(), org: orgId, id: raceId, sid, prev, cur } : null;
    const st = by[sid].st;
    names.push(`${[st.grp || L.rounds[sid]?.grp || "", raceName(st)].filter(Boolean).join(" ")}: ${by[sid].sails.join(", ")}`);
  }
  ensurePublic(raceId).catch(() => {});
  return { text: c.code ? `${c.code} (${PEN_NAME[c.code]}) yazıldı. ${names.join(" · ")}.` : `Ceza kaldırıldı. ${names.join(" · ")}.` };
}
