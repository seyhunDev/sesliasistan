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
import { tl, totals } from "./budget";
import { askBudget, mergeBudget } from "./raceBudgetAi";
import { addRacePlan, freshRace, loadRaces, saveRace, shiftDay } from "./races";
import { followAsk, wantsRaceText } from "./raceNav";

// Yarış kaydı isteği mi? Saf kural raceNav.js'te (testlenir); burada kayıtlı yarış adları da verilir
export const wantsRace = (text, known = raceNames()) => wantsRaceText(text, known);

// Asistanın değiştirdiği yarış açık sayfadaysa sayfa da güncellensin (RaceEditor dinler)
const told = (r) => window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: r }));

// onStep(label): panelde görünen adım. current: açık yarış sayfasının kimliği (ad söylenmezse o yarış)
// follow: yeni yarıştan sonra kaçıncı kez eksik soruluyor (tarih, sporcular); 2'den sonra sorulmaz
export async function runRaceCommand(text, { idx, orgId, uid, saveDrafts, by, current = "", follow = 0 }, onStep = () => {}) {
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
      current: races.some((r) => r.id === current) ? current : "",
      known: raceNames(),
      notes: idx?.notes || [],
    }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Yarış anlaşılamadı");
  const names = Object.fromEntries(data.athletes.map((a) => [a.id, a.studentName]));
  const first = (ids) => ids.map((id) => names[id]?.split(" ")[0] || "?").join(", ");
  const missed = p.unknown?.length ? ` ${p.unknown.join(", ")} adını sporcularda bulamadım.` : "";

  // Yarış sayfasında söylenen ama yarışla ilgisi olmayan cümle: asistan her zamanki yoldan cevaplar
  if (p.op === "none" && current) return { none: true };
  if (p.op === "none") return { said: p.message || "Hangi yarış olduğunu anlayamadım. Yarışın adını ve tarihini söyler misin?", expect: true };

  if (p.op === "create") {
    if (!p.name) return { said: p.message || "Yarışın adı ne?", expect: true };
    // Tarih söylenmese de yarış hemen açılır, tarih ve sporcular sonra sorulur (Seyhun: "yarışı oluştursun, tarihleri,
    // hangi sporcuların katılacağını sorabilir; cevap verirsem ekler", 2026-10-09)
    const r = {
      ...freshRace(races[0], todayStr()),
      abroad: !!p.abroad,
      name: p.name, city: p.city || (p.abroad ? "" : races[0]?.city || ""), district: p.district,
      startDate: p.startDate, endDate: p.endDate || p.startDate,
      leaveStart: p.startDate ? shiftDay(p.startDate, -1) : "", leaveEnd: p.startDate ? shiftDay(p.endDate || p.startDate, 1) : "",
      athleteIds: p.athleteIds, note: p.note,
    };
    onStep("Yarış kaydediliyor");
    const id = await saveRace(orgId, uid, r);
    let planned = false;
    if (r.startDate) {
      onStep("Planlara ekleniyor");
      planned = await addRacePlan(saveDrafts, r, by).catch(() => false);
      if (planned) await saveRace(orgId, uid, { ...r, id, planAdded: true });
    }
    const who = p.athleteIds.length ? ` ${p.athleteIds.length} sporcu: ${first(p.athleteIds)}.` : "";
    const ask = followAsk(r);
    return {
      said: `Kaydettim: ${r.name}${r.startDate ? `, ${rangeText(r.startDate, r.endDate).toLocaleLowerCase("tr-TR")}` : ""}${r.district ? `, ${r.district}` : ""}.${who}${planned ? " Planlara da ekledim." : ""}${r.abroad ? " Yurt dışı yarışı: Özet'te Türkiye'de yapılacaklar listesi hazır." : ""}${p.note ? " Notunu yazdım." : ""}${missed}${ask ? ` ${ask}` : ""}`,
      id,
      ...(ask ? { expect: true, follow: true } : {}),
    };
  }

  // budget: kalemleri ayrı istekle çıkar, bütçeye ekle
  if (p.op === "budget") {
    const race = races.find((r) => r.id === p.raceId);
    onStep("Bütçe hazırlanıyor");
    const b = await askBudget(race, race.athleteIds.length, text);
    if (!b.items?.length && b.staff == null && b.nights == null) return { said: b.message || `${race.name} bütçesine eklenecek bir tutar anlayamadım.`, id: race.id, expect: true };
    const budget = mergeBudget(race, b);
    onStep("Bütçe kaydediliyor");
    await saveRace(orgId, uid, { ...race, budget });
    told({ ...race, budget });
    const t = totals(budget, race.athleteIds.length);
    const open = b.items.filter((x) => !x.amount).map((x) => x.title);
    const est = b.items.filter((x) => x.amount && x.est).map((x) => `${x.title} ${tl(x.amount)}`);
    const note = (open.length ? ` ${open.join(", ")} için tutar söylemedin; Bütçe sekmesinden girebilirsin.` : "") + (est.length ? ` Tahmini tutar yazdım: ${est.join(", ")}; kontrol et.` : "");
    return {
      said: `Kaydettim. ${race.name} bütçesine ${b.items.map((x) => x.title).join(", ") || "değişiklik"} eklendi. Toplam ${tl(t.total)}${t.athletes ? `, sporcu başı ${tl(t.perAthlete)}` : ""}.${note}`,
      id: race.id,
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
  // Tarihi sonradan yazılan yarış planlara da eklenir (bir kez)
  if (r.startDate && !old.planAdded) {
    onStep("Planlara ekleniyor");
    if (await addRacePlan(saveDrafts, r, by).catch(() => false)) r.planAdded = true;
  }
  await saveRace(orgId, uid, r);
  told(r);
  const parts = [
    added.length && `${first(added)} eklendi`,
    p.note && "not yazıldı",
    r.startDate !== old.startDate && `tarih ${rangeText(r.startDate, r.endDate).toLocaleLowerCase("tr-TR")} oldu`,
  ].filter(Boolean);
  const ask = follow && follow < 2 ? followAsk(r) : "";
  return { said: `Kaydettim. ${old.name}: ${parts.join(", ") || "yer güncellendi"}${r.planAdded && !old.planAdded ? ", planlara da eklendi" : ""}.${missed}${ask ? ` ${ask}` : ""}`, id: old.id, ...(ask ? { expect: true, follow: true } : {}) };
}


// Açılacak yarışı yapay zekayla bul (yerel eşleştirme emin olamadığında): { raceId, candidates, message }
export async function findRaceAi(text, races) {
  const res = await authFetch("/api/race", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "find", text, today: todayStr(), races: races.slice(0, 40).map((r) => ({ id: r.id, name: r.name, district: r.district, startDate: r.startDate })) }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Yarış bulunamadı");
  return p;
}
