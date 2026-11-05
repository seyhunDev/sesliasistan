"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { DelBadge, Empty, catStyle } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { isImportant } from "@/lib/planImportant";
import { useAdd } from "@/features/add/AddProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNow } from "@/hooks/useNow";
import { planDonePatch, planReopenPatch } from "@/lib/planActions";
import { WordCard } from "@/features/words/WordCard";
import { groupByDay, nextPlan, planState, remainLabel, dayLabel, daysBetween, weekdayShort } from "@/lib/agenda";
import { byStart, todayStr } from "@/lib/utils/format";
import { assigneesOf, doersOf } from "@/lib/people";

const spanDays = (p) => Math.round((new Date(`${p.endDate}T00:00`) - new Date(`${p.date}T00:00`)) / 864e5) + 1;
const multiOf = (p) => !!(p.endDate && p.endDate !== p.date);
const inDay = (p, d) => p.date <= d && (p.endDate || p.date) >= d;
const mins = (t) => (t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null);
const endTime = (p) => {
  const e = mins(p.time) + (p.durationMin || 60);
  return `${String(Math.floor(e / 60) % 24).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
};
// Aynı gün saatleri çakışan planlar (süre yoksa 60 dk sayılır)
function conflicts(items) {
  const timed = items.filter((p) => p.time && p.status !== "cancelled" && !multiOf(p)).map((p) => [p.id, mins(p.time), mins(p.time) + (p.durationMin || 60)]);
  const out = new Set();
  timed.forEach(([a, s1, e1], i) => timed.slice(i + 1).forEach(([b, s2, e2]) => s1 < e2 && s2 < e1 && (out.add(a), out.add(b))));
  return out;
}
const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const dayText = (d) => `${weekdayShort(d)} ${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`;
// Satırın sağındaki küçük baş harf: plan başkasına atanmışsa (kendi planında ve "Ana hesap"ta gösterilmez)
function Initials({ p, myUid, nameOf }) {
  const ids = doersOf(p, myUid);
  if (!ids.length) return null;
  const first = (nameOf(ids[0]) || "?").trim()[0]?.toLocaleUpperCase("tr-TR") || "?";
  return (
    <span title={ids.map((u) => nameOf(u) || "Kişi").join(", ")} className="grid h-[1.625rem] min-w-[1.625rem] shrink-0 place-items-center rounded-full bg-accbg px-1 text-[0.6875rem] font-extrabold text-acc">
      {ids.length > 1 ? `+${ids.length}` : first}
    </span>
  );
}

// Planlar (Seyhun 2026-11-01 "Yap", örnek /mnt/project-files/planlar/sade/ornek.png): yazı kalabalığı az.
// Lacivert üstte başlık, Takvim, kişi seçimi (simge; seçilen kişi Bugün kartında yazar), + Plan ve bugünün kartı: bugünün bütün planları, süren ya da sıradaki
// büyük yazıyla, biten soluk. Altta Önemli (yan yana çerçeveli kartlar, "7 gün kaldı") ve Yaklaşan: plan başına tek satır
// (gün, saat, kategori çizgisi, ad; yalnız başkasına atanmışsa baş harf; çakışma/iptal uyarısı). Her plan tek yerde görünür.
// Sola kaydırınca Bitti / Sil; biten ve saati geçmiş planlar arşivde. En altta İngilizce kelime kartı.
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
  const { openAdd } = useAdd();
  const now = useNow();
  const today = todayStr();
  const { open } = usePlanOpen(); // yarışa bağlı plan yarış sayfasını açar (tek kural)
  const markDone = (p) => {
    updateRecord("plan", p.id, planDonePatch(), by);
    navigator.vibrate?.(10);
    toast("Bitti, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("plan", p.id, planReopenPatch(), by) } });
  };
  const swipe = (p) => [
    { label: "Bitti", icon: "check", tone: "neutral", onAction: () => markDone(p) },
    { label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("plan", p.id) },
  ];

  // Bugün: bugüne düşen bütün planlar (saati geçenler soluk), süren ya da sıradaki öne çıkar
  const todays = plans.filter((p) => inDay(p, today)).sort(byStart);
  const n = nextPlan(plans.filter((p) => p.status !== "cancelled"), now);
  const focus = n && todays.some((p) => p.id === n.plan.id) ? n : null;
  const later = n && !focus ? n.plan : null; // bugün plan kalmadıysa sıradaki
  const todayClash = conflicts(todays);

  // Bugünden sonrası: önemliler ayrı kartlarda, gerisi Yaklaşan listesinde (her plan tek yerde)
  const days = groupByDay(plans, today, true)
    .filter((g) => g.day > today)
    .map((g) => ({ ...g, clash: conflicts(g.items), items: g.items.filter((p) => planState(p, now) !== "past" && !isImportant(p)) }))
    .filter((g) => g.items.length);
  const imp = plans.filter((p) => p.date > today && isImportant(p) && p.status !== "cancelled").sort(byStart);
  const upCount = days.reduce((k, g) => k + g.items.length, 0);

  const sel = people.find(([k]) => k === who)?.[1] || "";

  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-10 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Planlar">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Planlar</h1>
          <Link href="/calendar" aria-label="Takvim" data-press className="btn btn-round size-9">
            <Icon name="cal" className="size-4" />
          </Link>
          {people.length > 0 && (
            <label aria-label="Kimin planları" className={`btn btn-round relative size-9 ${who !== "all" ? "!border-[#8fb3ff] !bg-[#3d7bff]" : ""}`}>
              <Icon name="users" className="size-4" />
              <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Kimin planları" className="absolute inset-0 cursor-pointer appearance-none opacity-0">
                {people.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" onClick={() => openAdd({ type: "plan" })} data-press className="ck-btn shrink-0 !flex items-center gap-1">
            <Icon name="plus" className="size-4" />
            Plan
          </button>
        </header>

        <div className="ck-plan mt-5 rounded-[1.375rem] px-4 pb-1.5 pt-3.5 text-white" aria-label="Bugün">
          <div className="flex items-baseline justify-between gap-3">
            <b className="truncate text-[0.8125rem] font-bold tracking-[.04em] opacity-85">
              Bugün · {dayText(today)}
              {who !== "all" && ` · ${sel}`}
            </b>
            {todays.length > 0 && <span className="shrink-0 text-[0.8125rem] opacity-80">{todays.length} plan</span>}
          </div>
          <div className="mt-2.5 border-t border-white/20">
            {todays.length === 0 && (
              <button type="button" onClick={() => (later ? open(later) : openAdd({ type: "plan" }))} className="block w-full py-3 text-left active:opacity-80">
                <b className="block text-[1.25rem] font-bold tracking-[-.01em]">Bugün plan yok</b>
                {later && (
                  <span className="mt-0.5 block truncate text-[0.875rem] opacity-85">
                    Sıradaki: {dayLabel(later.date, today)}
                    {later.time ? ` ${later.time}` : ""} · {later.title}
                  </span>
                )}
              </button>
            )}
            {todays.map((p) => {
              const multi = multiOf(p);
              const big = focus?.plan.id === p.id;
              const past = planState(p, now) === "past";
              const off = p.status === "cancelled";
              const lead = multi ? `${spanDays(p)} gün` : p.time || "Gün";
              if (big) {
                const sub = [multi ? remainLabel(p, today) : p.time && `${p.time} – ${endTime(p)}`, p.place].filter(Boolean).join(" · ");
                return (
                  <button key={p.id} type="button" onClick={() => open(p)} className="flex w-full gap-3 border-b border-white/15 py-3.5 text-left last:border-b-0 active:opacity-80">
                    <b className="w-12 shrink-0 pt-6 text-[0.9375rem] font-bold tabular-nums">{lead}</b>
                    <span className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-white px-2 py-px text-[0.6875rem] font-extrabold text-[#16305e]">{focus.state === "now" ? "ŞU AN" : "SIRADAKİ"}</span>
                      <b className="mt-1 block truncate text-[1.5rem] font-bold leading-tight tracking-[-.02em]">{p.title}</b>
                      {sub && <span className="mt-0.5 block truncate text-[0.84375rem] opacity-85">{sub}</span>}
                    </span>
                  </button>
                );
              }
              return (
                <button key={p.id} type="button" onClick={() => open(p)} className={`flex w-full items-center gap-3 border-b border-white/15 py-2.5 text-left last:border-b-0 active:opacity-80 ${past || off ? "opacity-55" : ""}`}>
                  <b className="w-12 shrink-0 text-[0.9375rem] font-bold tabular-nums">{lead}</b>
                  <span className={`min-w-0 flex-1 truncate text-[0.9375rem] font-semibold ${off ? "line-through" : ""}`}>{p.title}</span>
                  {todayClash.has(p.id) && !past && <span className="shrink-0 text-[0.75rem] font-bold text-[#fde68a]">Çakışıyor</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="split-main relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {imp.length > 0 && (
          <section className="split-span">
            <ListHead title="Önemli" count={imp.length} />
            <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
              {imp.map((p) => {
                const left = daysBetween(today, p.date);
                return (
                  <button key={p.id} type="button" onClick={() => open(p)} data-press className="w-[10.5rem] shrink-0 rounded-[1.125rem] border-2 border-acc bg-card p-3 text-left">
                    <span className="flex items-center gap-2">
                      <span className="grid h-11 w-[2.625rem] shrink-0 place-content-center rounded-xl bg-accbg text-center leading-none text-acc">
                        <small className="block text-[0.65625rem] font-bold">{weekdayShort(p.date).toLocaleUpperCase("tr-TR")}</small>
                        <b className="mt-0.5 block text-[1.1875rem] font-extrabold">{+p.date.slice(8, 10)}</b>
                      </span>
                      <span className="text-[0.78125rem] font-bold text-acc">{left === 1 ? "Yarın" : `${left} gün kaldı`}</span>
                    </span>
                    <b className="mt-2.5 line-clamp-2 h-[2.4rem] text-[0.9375rem] font-bold leading-[1.2rem]">{p.title}</b>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {days.length === 0 && imp.length === 0 && todays.length === 0 && <Empty icon="cal" title="Yaklaşan plan yok" sub="Biten ve geçmiş planlar arşivde." />}

        {days.length > 0 && (
          <section>
            <ListHead title="Yaklaşan" count={upCount} />
            <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
              {days.map(({ day, items, clash }) =>
                items.map((p, i) => {
                  const cs = catStyle(p.cat);
                  const multi = multiOf(p);
                  const off = p.status === "cancelled";
                  const isClash = clash.has(p.id);
                  const lead = multi ? `${spanDays(p)} gün` : p.time || "Gün";
                  const note = isClash ? "Saat çakışıyor" : off ? ["İptal", p.cancelReason].filter(Boolean).join(" · ") : "";
                  return (
                    <div key={p.id} id={i === 0 ? `d-${day}` : undefined} className="scroll-mt-20 border-t border-line first:border-t-0">
                      <SwipeRow actions={swipe(p)}>
                        <button type="button" onClick={() => open(p)} data-press="row" className="flex w-full items-center gap-3 bg-card px-3.5 py-2.5 text-left">
                          <span className="w-9 shrink-0 text-center leading-none" aria-label={dayLabel(day, today)}>
                            {i === 0 && (
                              <>
                                <small className="block text-[0.6875rem] font-bold text-mut">{weekdayShort(day).toLocaleUpperCase("tr-TR")}</small>
                                <b className="mt-1 block text-[1.1875rem] font-bold tabular-nums">{+day.slice(8, 10)}</b>
                              </>
                            )}
                          </span>
                          <b className="w-11 shrink-0 text-[0.875rem] font-bold tabular-nums text-mut">{lead}</b>
                          <span className={`w-[3px] self-stretch rounded-full ${cs.bar} ${off ? "opacity-40" : ""}`} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <b className={`block truncate text-[0.96875rem] font-semibold ${off ? "text-mut line-through" : ""}`}>{p.title}</b>
                            {note && <span className={`block truncate text-[0.78125rem] font-bold ${isClash ? "text-warn" : "text-mut"}`}>{note}</span>}
                            {p.deleteReq && (
                              <span className="mt-1 block">
                                <DelBadge rec={p} />
                              </span>
                            )}
                          </span>
                          <Initials p={p} myUid={myUid} nameOf={nameOf} />
                        </button>
                      </SwipeRow>
                    </div>
                  );
                }),
              )}
            </div>
          </section>
        )}

        <Link href="/archive?t=plan" className="block text-center text-[0.875rem] font-semibold text-acc active:opacity-70">
          Arşiv ›
        </Link>

        <div className="split-side">
          <WordCard />
        </div>
      </div>
    </main>
  );
}
