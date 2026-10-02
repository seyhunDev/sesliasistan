"use client";

// Asistandan yarış: "Yarış ekle: D'Azur Regatta, Çeşme, 7-11 Ekim, Ali ve Ayşe katılacak",
// "D'Azur yarışına Mehmet'i de ekle", "regatta için not al: otelde kalınacak".
// Adımlar: sporcuları ve yarışları yükle → yapay zekayla anla → yarışı kaydet → yeni yarışı planlara yaz.
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { byId, isActive, loadAthletes } from "./data";
import { aliasesOf } from "./names";
import { rangeText } from "./raceDocs";
import { raceNames } from "./raceNames";
import { addRacePlan, freshRace, loadRaces, saveRace, shiftDay } from "./races";

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");

// Yarış kaydı isteği mi? (soru değil; "yarış" + ekleme/katılma/not fiili ya da katılımcı listesi)
// Bilinen yarış adı da yeter: "D'Azur katılımcıları Ali ve Ayşe" (adın ilk anlamlı kelimesi, harf dışı atılarak)
const bare = (s) => low(s).replace(/[^\p{L}\p{N}]+/gu, "");
const COMMON = new Set(["optimist", "laser", "ilca", "yelken", "regatta", "regata", "kupa", "kupası", "trofesi", "open", "cup", "trophy", "türkiye", "şampiyonası", "yarışı"]);
const knownIn = (t, known) => {
  const flat = bare(t);
  return known.some((n) => {
    const w = low(n).split(/\s+/).map(bare).find((x) => x.length >= 4 && !COMMON.has(x));
    return w && flat.includes(w);
  });
};
export const wantsRace = (text, known = raceNames()) => {
  const t = low(text).trim();
  if (!(/yarış|regat/.test(t) || knownIn(t, known)) || /\?$/.test(t)) return false;
  return /(ekle|oluştur|kaydet|planla|yeni yarış|katıl\S*cak|katılımcı|katılıyor|kafile|gid\S*cek|gidiyor|not al|not ekle|not düş|notu)/.test(t);
};

// onStep(label): panelde görünen adım
export async function runRaceCommand(text, { idx, orgId, uid, saveDrafts, by }, onStep = () => {}) {
  onStep("Sporcular ve yarışlar yükleniyor");
  const [data, races] = await Promise.all([loadAthletes(), loadRaces(orgId)]);
  const classes = byId(data.classes);
  const list = data.athletes.filter(isActive);
  onStep("Söylediklerin anlaşılıyor");
  const res = await authFetch("/api/race", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      today: todayStr(),
      athletes: list.map((a) => ({ id: a.id, name: a.studentName, cls: classes[a.currentClassId] || "", aliases: aliasesOf(idx, a.id) })),
      races: races.map((r) => ({ id: r.id, name: r.name, startDate: r.startDate })),
      known: raceNames(),
      notes: idx?.notes || [],
    }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Yarış anlaşılamadı");
  const names = Object.fromEntries(data.athletes.map((a) => [a.id, a.studentName]));
  const first = (ids) => ids.map((id) => names[id]?.split(" ")[0] || "?").join(", ");
  const missed = p.unknown?.length ? ` ${p.unknown.join(", ")} adını sporcularda bulamadım.` : "";

  if (p.op === "none") return { said: p.message || "Hangi yarış olduğunu anlayamadım. Yarışın adını ve tarihini söyler misin?", expect: true };

  if (p.op === "create") {
    if (!p.name || !p.startDate) return { said: p.message || "Yarışın adını ve tarihini söyler misin?", expect: true };
    const r = {
      ...freshRace(races[0], todayStr()),
      name: p.name, city: p.city || races[0]?.city || "", district: p.district,
      startDate: p.startDate, endDate: p.endDate || p.startDate,
      leaveStart: shiftDay(p.startDate, -1), leaveEnd: shiftDay(p.endDate || p.startDate, 1),
      athleteIds: p.athleteIds, note: p.note,
    };
    onStep("Yarış kaydediliyor");
    const id = await saveRace(orgId, uid, r);
    onStep("Planlara ekleniyor");
    const planned = await addRacePlan(saveDrafts, r, by).catch(() => false);
    if (planned) await saveRace(orgId, uid, { ...r, id, planAdded: true });
    const who = p.athleteIds.length ? ` ${p.athleteIds.length} sporcu: ${first(p.athleteIds)}.` : " Sporcuları sayfadan seçebilirsin.";
    return {
      said: `Kaydettim: ${r.name}, ${rangeText(r.startDate, r.endDate).toLocaleLowerCase("tr-TR")}${r.district ? `, ${r.district}` : ""}.${who}${planned ? " Planlara da ekledim." : ""}${p.note ? " Notunu yazdım." : ""}${missed}`,
      id,
    };
  }

  // update: sporcu ekle, not ekle, tarih/yer düzelt
  const old = races.find((r) => r.id === p.raceId);
  const added = p.athleteIds.filter((id) => !old.athleteIds.includes(id));
  const r = {
    ...old,
    athleteIds: [...old.athleteIds, ...added],
    note: p.note ? [old.note, p.note].filter(Boolean).join("\n") : old.note,
    city: p.city || old.city,
    district: p.district || old.district,
  };
  if (p.startDate && p.startDate !== old.startDate) {
    r.startDate = p.startDate;
    r.endDate = p.endDate || p.startDate;
    r.leaveStart = shiftDay(r.startDate, -1);
    r.leaveEnd = shiftDay(r.endDate, 1);
  }
  const changed = added.length || p.note || r.startDate !== old.startDate || r.district !== old.district || r.city !== old.city;
  if (!changed) return { said: `${old.name} yarışında değişecek bir şey bulamadım.${missed}`, id: old.id, expect: !!missed };
  onStep("Yarış güncelleniyor");
  await saveRace(orgId, uid, r);
  const parts = [
    added.length && `${first(added)} eklendi`,
    p.note && "not yazıldı",
    r.startDate !== old.startDate && `tarih ${rangeText(r.startDate, r.endDate).toLocaleLowerCase("tr-TR")} oldu`,
  ].filter(Boolean);
  return { said: `Kaydettim. ${old.name}: ${parts.join(", ") || "yer güncellendi"}.${missed}`, id: old.id };
}
