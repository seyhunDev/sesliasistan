"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArchiveLink, Chips, DelBadge, Empty, catStyle } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNow } from "@/hooks/useNow";
import { planDonePatch, planReopenPatch } from "@/lib/planActions";
import { WordCard } from "@/features/words/WordCard";
import { addDate } from "@/lib/ai/digest";
import { groupByDay, nextPlan, planState, remainLabel, soonLabel, dayLabel, weekdayShort } from "@/lib/agenda";
import { short, todayStr } from "@/lib/utils/format";
import { assigneesOf, whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";

const spanDays = (p) => Math.round((new Date(`${p.endDate}T00:00`) - new Date(`${p.date}T00:00`)) / 864e5) + 1;
const mins = (t) => (t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null);
const endTime = (p) => {
  const e = mins(p.time) + (p.durationMin || 60);
  return `${String(Math.floor(e / 60) % 24).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
};
// Aynı gün saatleri çakışan planlar (süre yoksa 60 dk sayılır)
function conflicts(items) {
  const timed = items.filter((p) => p.time && p.status !== "cancelled" && !(p.endDate && p.endDate !== p.date)).map((p) => [p.id, mins(p.time), mins(p.time) + (p.durationMin || 60)]);
  const out = new Set();
  timed.forEach(([a, s1, e1], i) => timed.slice(i + 1).forEach(([b, s2, e2]) => s1 < e2 && s2 < e1 && (out.add(a), out.add(b))));
  return out;
}
// Haftanın pazartesisi (YYYY-AA-GG)
const monday = (d) => addDate(d, -((new Date(`${d}T00:00`).getDay() + 6) % 7));

// Planlar: ajanda düzeni. Üstte ana sayfadaki gibi koyu "Şu an / Sıradaki" kartı ve "Sonra" satırı; ana hesapta kişiye göre süzme;
// altında Bu hafta / Gelecek hafta / Daha sonra bölümleri, solda gün numarası (bugün yeşil daire), sağda her plan ayrı kart
// (kategori simgesi, saat, süre, yer, görevli; çakışan saat turuncu, iptal üstü çizili). Sola kaydırınca Bitti / Sil;
// biten ve saati geçmiş planlar arşivde. En altta İngilizce kelime kartı.
export default function PlansPage() {
  const { plans: allPlans, removeWithUndo, updateRecord, myUid, nameOf, members, isStaff } = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const by = { name: profile?.name ?? "Kullanıcı" };
  const [who, setWho] = useState("all"); // all | me | uid
  const mine = (p) => (who === "all" ? true : who === "me" ? !assigneesOf(p).length || assigneesOf(p).includes(myUid) : assigneesOf(p).includes(who));
  // Bitti denen plan listede görünmez, Arşiv'de "Bitti" olarak durur
  const plans = allPlans.filter((p) => !p.done && mine(p));
  const people = !isStaff && members.length > 0 ? [["all", "Herkes"], ["me", "Benim"], ...members.map((m) => [m.uid, (m.name || "").split(" ")[0]])] : [];
  const pillOf = useWho();
  const { openAdd } = useAdd();
  const now = useNow();
  const today = todayStr();
  const open = (p) => openAdd({ edit: { kind: "plan", id: p.id } });
  const markDone = (p) => {
    updateRecord("plan", p.id, planDonePatch(), by);
    navigator.vibrate?.(10);
    toast("Bitti, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("plan", p.id, planReopenPatch(), by) } });
  };

  // Saati geçmiş planlar listede görünmez (arşive geçer)
  const days = groupByDay(plans, today, true)
    .map((g) => ({ ...g, items: g.items.filter((p) => planState(p, now) !== "past"), clash: conflicts(g.items) }))
    .filter((g) => g.items.length);
  const upcoming = days.reduce((n, g) => n + g.items.length, 0);

  const wk = monday(today);
  const nextWk = addDate(wk, 7);
  const later = addDate(wk, 14);
  const parts = [
    ["BU HAFTA", days.filter((g) => g.day < nextWk)],
    ["GELECEK HAFTA", days.filter((g) => g.day >= nextWk && g.day < later)],
    ["DAHA SONRA", days.filter((g) => g.day >= later)],
  ].filter(([, g]) => g.length);
  const thisWeek = parts[0]?.[0] === "BU HAFTA" ? parts[0][1] : [];
  const weekCount = thisWeek.reduce((n, g) => n + g.items.length, 0);
  const clashCount = thisWeek.reduce((n, g) => n + g.clash.size, 0);
  const sub = !upcoming ? "Yaklaşan plan yok" : [weekCount ? `Bu hafta ${weekCount} plan` : `${upcoming} yaklaşan plan`, clashCount && `${clashCount} plan çakışıyor`].filter(Boolean).join(" · ");

  const n = nextPlan(plans.filter((p) => p.status !== "cancelled"), now);
  const flat = days.flatMap((g) => g.items).filter((p) => p.status !== "cancelled");
  const after = n && flat[flat.findIndex((p) => p.id === n.plan.id) + 1];
  const np = n?.plan;
  const nowKey = !np ? "" : n.state === "now" ? "ŞU AN" : np.date === today ? "SIRADAKİ" : dayLabel(np.date, today).toLocaleUpperCase("tr-TR");
  const nowTime = !np ? "" : np.endDate && np.endDate !== np.date ? `${spanDays(np)} gün` : np.time ? (n.state === "now" ? `${np.time} – ${endTime(np)}` : np.date === today ? `${np.time} · ${soonLabel(np, now)}` : np.time) : "Gün boyu";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Planlar" sub={sub}>
        <Link href="/calendar" aria-label="Takvim" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90">
          <Icon name="cal" className="size-5" />
        </Link>
        <ArchiveLink type="plan" />
        <button type="button" onClick={() => openAdd({ type: "plan" })} aria-label="Plan ekle" className="grid size-10 place-items-center rounded-full bg-acc text-white shadow-[0_6px_14px_-8px_rgba(47,125,107,.9)] active:scale-90">
          <Icon name="plus" className="size-5" />
        </button>
      </PageHeader>

      {np && (
        <section aria-label="Sıradaki plan" className="mt-2 overflow-hidden rounded-[1.5rem] bg-deep text-white shadow-[0_14px_30px_-18px_rgba(31,90,75,.85)]">
          <button type="button" onClick={() => open(np)} className="block w-full px-5 pb-4 pt-4 text-left active:opacity-80">
            <span className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[.08em] text-white/70">
              {n.state === "now" && <span className="size-2 rounded-full bg-[#7ee2b8]" aria-hidden="true" />}
              <span className="truncate">{nowKey} · {nowTime}</span>
            </span>
            <b className="mt-1 block truncate text-[1.625rem] font-bold leading-tight tracking-tight">{np.title}</b>
            {(np.place || np.cat) && <span className="mt-1 block truncate text-[0.9375rem] text-white/80">{np.place || np.cat}</span>}
          </button>
          {after && (
            <button type="button" onClick={() => open(after)} className="flex w-full items-center gap-3 border-t border-white/15 px-5 py-3 text-left text-[0.875rem] active:bg-white/5">
              <span className="shrink-0 text-white/70">{after.date === np.date ? "Sonra" : dayLabel(after.date, today)}</span>
              <b className="min-w-0 flex-1 truncate text-right font-semibold">
                {after.time ? `${after.time} ` : ""}
                {after.title}
              </b>
            </button>
          )}
        </section>
      )}

      {people.length > 0 && <Chips value={who} onChange={setWho} options={people} className="mt-4" />}

      {days.length === 0 && <Empty icon="cal" title="Yaklaşan plan yok" sub="Aşağıdan söyle, yaz ya da + ile ekle. Biten ve geçmiş planlar arşivde." />}

      {parts.map(([title, groups]) => (
        <section key={title}>
          <div className="mb-1 mt-6 flex items-center justify-between px-1 text-[0.75rem]">
            <span className="font-bold tracking-[.08em] text-mut">{title}</span>
            <span className="tabular-nums text-mut">{groups.reduce((k, g) => k + g.items.length, 0)} plan</span>
          </div>
          {groups.map(({ day, items, clash }) => {
            const isToday = day === today;
            return (
              <div key={day} id={`d-${day}`} className="mt-3 flex scroll-mt-20 gap-3">
                <div className="w-11 shrink-0 pt-1.5 text-center" aria-label={dayLabel(day, today)}>
                  <small className={`block text-[0.6875rem] font-bold tracking-[.06em] ${isToday ? "text-acc" : "text-mut"}`}>
                    {(isToday ? "Bugün" : weekdayShort(day)).toLocaleUpperCase("tr-TR")}
                  </small>
                  <b className={`mx-auto block font-bold tabular-nums ${isToday ? "mt-0.5 grid size-10 place-items-center rounded-full bg-acc text-[1.1875rem] text-white" : "text-[1.375rem] leading-tight"}`}>
                    {+day.slice(8, 10)}
                  </b>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {items.map((p) => {
                    const cs = catStyle(p.cat);
                    const multi = p.endDate && p.endDate !== p.date;
                    const st = planState(p, now);
                    const off = p.status === "cancelled";
                    const isClash = clash.has(p.id);
                    const pill = pillOf(p);
                    const whoT = pill ? "" : whoText(p, myUid, nameOf);
                    const lead = multi ? `${spanDays(p)} gün` : p.time || "Gün boyu";
                    const rest = [
                      multi && `${short(p.date)} – ${short(p.endDate)}`,
                      multi && st === "now" && remainLabel(p, today),
                      !multi && p.time && `${p.durationMin || 60} dk`,
                      isClash ? "Saat çakışıyor" : p.place,
                      off && p.cancelReason,
                      !isClash && whoT,
                    ].filter(Boolean);
                    return (
                      <div key={p.id} className="overflow-hidden rounded-[1.125rem] shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
                      <SwipeRow
                        actions={[
                          { label: "Bitti", icon: "check", tone: "neutral", onAction: () => markDone(p) },
                          { label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("plan", p.id) },
                        ]}
                      >
                        <button
                          type="button"
                          onClick={() => open(p)}
                          className="flex w-full items-center gap-3 bg-card p-3 text-left transition active:bg-bg"
                        >
                          <span className={`grid size-10 shrink-0 place-items-center rounded-[0.8rem] ${cs.chip} ${off ? "opacity-50" : ""}`}>
                            <Icon name={cs.icon} className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <b className={`truncate text-[0.96875rem] font-semibold ${off ? "text-mut line-through" : ""}`}>{p.title}</b>
                              {off && <span className="shrink-0 rounded-md bg-rose-500/10 px-1.5 text-[0.6875rem] font-bold text-rose-700">İPTAL</span>}
                            </span>
                            <span className={`mt-0.5 block truncate text-[0.8125rem] ${isClash ? "font-semibold text-amber-700" : "text-mut"}`}>
                              <b className={`font-bold ${isClash ? "" : st === "now" ? "text-acc" : off ? "" : "text-fg"}`}>{st === "now" && !multi ? "Şu an" : lead}</b>
                              {rest.length > 0 && ` · ${rest.join(" · ")}`}
                            </span>
                            {p.deleteReq && (
                              <span className="mt-1 block">
                                <DelBadge rec={p} />
                              </span>
                            )}
                          </span>
                          {pill}
                        </button>
                      </SwipeRow>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {days.length > 0 && (
        <Link href="/archive?t=plan" className="mt-6 block text-center text-[0.875rem] font-semibold text-acc active:opacity-70">
          Biten ve geçmiş planlar arşivde ›
        </Link>
      )}

      <WordCard />
    </main>
  );
}
