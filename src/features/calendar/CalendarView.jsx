"use client";

import { useMemo, useState } from "react";
import { ImpTag } from "@/components/ui/ImpTag";
import { isImportant } from "@/lib/planImportant";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead, Tag } from "@/components/ui/Row";
import { useAdd } from "@/features/add/AddProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useData } from "@/features/data/DataProvider";
import { useWho } from "@/features/data/useWho";
import { birthdaysOn, dayItems, fitOn, leftLabel, lessonsOn, monthGrid, nextBirthday } from "@/lib/agenda";
import { fitDays } from "@/lib/homeTiles";
import { isFit, statusOf } from "@/lib/fitness/model";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import Link from "next/link";
import { monthLabel, todayStr } from "@/lib/utils/format";

const WEEK = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const shift = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
// Fitness durumu (ana sayfadaki Fitness alanıyla aynı); ikinci değer Tag tonu
const FST = { done: ["Yaptı", "st"], missed: ["Yapmadı", "gen"], skip: ["Atladı", "gen"] };
const longDay = (s) => new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
// Kısa gün: "3 Kas" ve "Sal 3 Kas"
const dm = (s) => new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const shortDay = (s) => `${new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { weekday: "short" })} ${dm(s)}`;
// Takvim (yeni tasarım, 2026-11-03): lacivert üstte ay adı, önceki/sonraki ay, Bugün ve ders programı; ay ızgarası lacivertte
// (planlar ve görevler noktayla). Altta seçili günün listesi tek kartta: solda saat, ad, alt satır, sağda durum.
// Fitness: ana sayfadaki gibi kendi ve sporcuların antrenmanları (fitDays; fitOthers zaten yüklü, ek okuma yok), turuncu nokta ve satır.
export function CalendarView({ initial, sel: selP, onSel, embedded = false }) {
  const { plans: all, fitOthers, members, myUid, tasks, toggleTask, birthdays, lessons } = useData();
  const plans = useMemo(() => all.filter((p) => !isFit(p)), [all]);
  const fit = useMemo(() => fitDays(all, fitOthers || [], members, myUid), [all, fitOthers, members, myUid]);
  const fitDates = useMemo(() => new Set(fit.map((f) => f.date)), [fit]);
  const { openAdd } = useAdd();
  const { open: openPlan } = usePlanOpen(); // yarışa bağlı plan yarış sayfasını açar (tek kural)
  const { openBirthday } = useBirthday();
  const pillOf = useWho();
  const today = todayStr();
  // sel / onSel verilirse seçili gün dışarıdan yönetilir (ana sayfada hava ve gün şeridi aynı günü gösterir); ay oklarıyla gezilen ay (browse), seçili gün değişince seçilene döner
  const [selL, setSelL] = useState(initial || today);
  const sel = selP ?? selL;
  const setSel = onSel || setSelL;
  const [browse, setBrowse] = useState(null);
  const [seen, setSeen] = useState(sel);
  if (seen !== sel) {
    setSeen(sel);
    setBrowse(null);
  }
  const month = browse || sel.slice(0, 7);
  const setMonth = (f) => setBrowse((b) => f(b || sel.slice(0, 7)));

  const cells = monthGrid(month);
  const mark = (day) => {
    const { plans: p, tasks: t } = dayItems(plans, tasks, day);
    const open = t.filter((x) => !x.done);
    const b = birthdaysOn(birthdays, day);
    // Geniş ekranda hücrede görünen adlar (iPad ve Mac; telefonda gizli): doğum günü, plan (saatle), açık görev
    const evs = [
      ...b.map((x) => ({ k: `b${x.id}`, t: x.name, c: "bday" })),
      ...p.map((x) => ({ k: `p${x.id}`, h: x.time && (x.endDate || x.date) === x.date ? x.time : "", t: x.title, c: "plan" })),
      ...open.map((x) => ({ k: `t${x.id}`, t: x.title, c: day < today ? "late" : "task" })),
    ];
    return { plans: p.length, fit: fitDates.has(day), tasks: open.length, late: day < today && open.length > 0, bday: b.length, evs };
  };
  // Ana sayfada (embedded) yan gün paneli kapalı başlar; güne dokununca açılır, aynı güne tekrar dokununca ya da Kapat ile kapanır
  const [dayOpen, setDayOpen] = useState(false);
  const pick = (day) => {
    if (embedded) setDayOpen(day === sel ? !dayOpen : true);
    setSel(day);
    setBrowse(null);
  };
  const items = dayItems(plans, tasks, sel);
  const bdays = birthdaysOn(birthdays, sel);
  const dayLessons = lessonsOn(lessons, sel);
  const dayFit = fitOn(fit, sel);
  const count = items.plans.length + dayFit.length + items.tasks.length + bdays.length + dayLessons.length;
  const when = sel === today ? "Bugün" : sel > today ? leftLabel(sel, today) : "";

  // Satır biçimi her kayıtta aynı: solda saat (w-12), ad ve alt satır, sağda durum
  const rowCls = "flex min-h-[3.5rem] w-full items-center gap-3 px-3.5 py-2.5 text-left";
  const lead = "w-12 shrink-0 whitespace-nowrap text-[0.8125rem] font-bold tabular-nums";
  const ttl = "block truncate text-[0.9375rem] font-semibold";
  const sub = "block truncate text-[0.8125rem] text-mut";

  return (
    <Root embedded={embedded} open={dayOpen}>
      <section className={embedded ? "cal-top ck px-3.5 pb-3 pt-3" : "cal-top ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]"} aria-label="Takvim">
        <header className="flex items-center gap-2">
          {!embedded && <BackButton href="/" />}
          <h1 className={`min-w-0 flex-1 truncate font-bold capitalize tracking-[-.02em] ${embedded ? "text-[1.0625rem]" : "text-[1.375rem]"}`}>{monthLabel(month)}</h1>
          {(sel !== today || month !== today.slice(0, 7)) && (
            <button type="button" onClick={() => pick(today)} data-press className="ck-btn shrink-0">
              Bugün
            </button>
          )}
          {/* Geniş ekranda ay düğmeleri başlıkta (haftanın günleri ızgarayla aynı hizada); telefonda ayın üstündeki satırda */}
          <span className="cal-hnav gap-2">
            <button type="button" onClick={() => setMonth((m) => shift(m, -1))} aria-label="Önceki ay" data-press className="btn btn-round size-9">
              <Icon name="back" className="size-4" />
            </button>
            <button type="button" onClick={() => setMonth((m) => shift(m, 1))} aria-label="Sonraki ay" data-press className="btn btn-round size-9">
              <Icon name="chev" className="size-4" />
            </button>
          </span>
          {embedded && (
            <>
              <button type="button" onClick={() => openAdd({ type: "plan", date: sel })} aria-label="Plan ekle" data-press className="btn btn-round size-9">
                <Icon name="cal" className="size-4" />
              </button>
              <button type="button" onClick={() => openAdd({ type: "task", date: sel })} aria-label="Görev ekle" data-press className="btn btn-round size-9">
                <Icon name="task" className="size-4" />
              </button>
              <button type="button" onClick={() => openBirthday({ date: sel })} aria-label="Doğum günü ekle" data-press className="btn btn-round size-9">
                <Icon name="cake" className="size-4" />
              </button>
            </>
          )}
          <Link href="/schedule" aria-label="Ders programı" data-press className="btn btn-round size-9">
            <Icon name="book" className="size-4" />
          </Link>
        </header>

        {/* Ay */}
        <div className="cal-week mt-4 flex items-center justify-between">
          <button type="button" onClick={() => setMonth((m) => shift(m, -1))} aria-label="Önceki ay" data-press className="btn btn-round size-9">
            <Icon name="back" className="size-4" />
          </button>
          <div className="grid flex-1 grid-cols-7 px-1 text-center text-[0.6875rem] font-semibold text-white/50">
            {WEEK.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <button type="button" onClick={() => setMonth((m) => shift(m, 1))} aria-label="Sonraki ay" data-press className="btn btn-round size-9">
            <Icon name="chev" className="size-4" />
          </button>
        </div>
        <div className="cal-grid mt-1 grid grid-cols-7 gap-y-0.5">
          {cells.map(({ day, inMonth }) => {
            const m = mark(day);
            const on = day === sel;
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => pick(day)}
                aria-label={`${longDay(day)}${m.plans ? `, ${m.plans} plan` : ""}${m.fit ? ", fitness" : ""}${m.tasks ? `, ${m.tasks} görev` : ""}`}
                aria-pressed={on}
                data-on={on || undefined}
                data-out={inMonth ? undefined : ""}
                className="cal-cell flex flex-col items-center py-1 active:opacity-60"
              >
                <span
                  className={`cal-num grid size-9 place-items-center rounded-full text-[0.9375rem] font-semibold tabular-nums ${
                    on ? "bg-white text-deep" : isToday ? "text-white ring-1 ring-white/60" : inMonth ? "text-white" : "text-white/30"
                  }`}
                >
                  {+day.slice(8)}
                </span>
                <span className={`cal-dots mt-0.5 flex h-1.5 gap-0.5 ${inMonth ? "" : "opacity-40"}`}>
                  {m.plans > 0 && <i className="size-1.5 rounded-full bg-white" />}
                  {m.fit && <i className="tone-fit tone-bar size-1.5 rounded-full" />}
                  {m.tasks > 0 && <i className={`size-1.5 rounded-full ${m.late ? "bg-rec" : "bg-amber-600"}`} />}
                  {m.bday > 0 && <i className="size-1.5 rounded-full bg-pink-500" />}
                </span>
                {m.evs.length > 0 && (
                  <span className="cal-evs" aria-hidden>
                    {m.evs.slice(0, 4).map((e) => (
                      <i key={e.k} data-c={e.c}>
                        {e.h && <b>{e.h} </b>}
                        {e.t}
                      </i>
                    ))}
                    {m.evs.length > 4 && <i data-c="more">+{m.evs.length - 4}</i>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="cal-legend mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.6875rem] text-white/60">
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-white" /> Plan</span>
          <span className="flex items-center gap-1"><i className="tone-fit tone-bar size-1.5 rounded-full" /> Fitness</span>
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-amber-600" /> Görev</span>
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-rec" /> Gecikmiş</span>
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-pink-500" /> Doğum günü</span>
        </div>
      </section>

      {(!embedded || dayOpen) && (
      <div className={embedded ? "cal-body relative space-y-4" : "cal-body relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5"}>
        {/* Seçili gün */}
        <section>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <ListHead title={[when, shortDay(sel)].filter(Boolean).join(" · ")} count={count} />
            </div>
            {embedded && (
              <button type="button" onClick={() => setDayOpen(false)} aria-label="Günü kapat" data-press className="btn btn-round size-8 shrink-0">
                <Icon name="x" className="size-4" />
              </button>
            )}
          </div>
          {count === 0 ? (
            <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5 py-3">
              <p className="text-[0.9375rem] font-semibold text-mut">Kayıt yok</p>
              <div className={embedded ? "hidden" : "mt-3 flex gap-2"}>
                <button type="button" onClick={() => openAdd({ type: "plan", date: sel })} data-press className="btn btn-primary btn-sm flex-1">
                  Plan ekle
                </button>
                <button type="button" onClick={() => openAdd({ type: "task", date: sel })} data-press className="btn btn-secondary btn-sm flex-1">
                  Görev ekle
                </button>
                <button type="button" onClick={() => openBirthday({ date: sel })} aria-label="Doğum günü ekle" data-press className="btn btn-round btn-sm">
                  <Icon name="cake" className="size-5" />
                </button>
              </div>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-[1.25rem] border border-line bg-card [&>*+*]:border-t [&>*+*]:border-line">
              {bdays.map((b) => {
                const age = nextBirthday(b, sel).age;
                return (
                  <li key={b.id}>
                    <button type="button" onClick={() => openBirthday({ edit: b.id })} data-press="row" className={rowCls}>
                      <span className={`${lead} text-mut`}>Gün</span>
                      <span className="min-w-0 flex-1">
                        <b className={ttl}>{b.name}</b>
                        <small className={sub}>{["Doğum günü", age && `${age} yaş`, b.note].filter(Boolean).join(" · ")}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
              {dayLessons.map((l) => (
                <li key={l.id}>
                  <Link href="/schedule" data-press="row" className={rowCls}>
                    <span className={`${lead} text-mut`}>{l.start}</span>
                    <span className="min-w-0 flex-1">
                      <b className={ttl}>{l.title}</b>
                      <small className={sub}>{["Ders", l.end && `${l.start}–${l.end}`, l.place].filter(Boolean).join(" · ")}</small>
                    </span>
                    <Icon name="chev" className="size-4 shrink-0 text-mut" />
                  </Link>
                </li>
              ))}
              {items.plans.map((p) => {
                const multi = p.endDate && p.endDate !== p.date;
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => openPlan(p)} data-press="row" className={`${rowCls} ${isImportant(p) ? "bg-accbg" : ""}`}>
                      <span className={`${lead} text-acc`}>{multi ? "Gün" : p.time || "Gün"}</span>
                      <span className="min-w-0 flex-1">
                        <b className={`${ttl} ${p.status === "cancelled" ? "text-mut line-through" : ""}`}>{p.title}</b>
                        {(p.place || multi || isImportant(p)) && (
                          <small className={sub}>
                            {isImportant(p) && <ImpTag />}
                            {[multi && `${dm(p.date)} – ${dm(p.endDate)}`, p.place].filter(Boolean).join(" · ")}
                          </small>
                        )}
                      </span>
                      {pillOf(p)}
                    </button>
                  </li>
                );
              })}
              {dayFit.map((f) => {
                const [st, tone] = FST[statusOf(f.plan, today)] || [];
                return (
                  <li key={f.id}>
                    <button type="button" onClick={() => openAdd({ edit: { kind: "plan", id: f.id } })} data-press="row" className={`tone-fit ${rowCls}`}>
                      <span className={`${lead} text-[var(--tfg)]`}>{f.plan.time || "Gün"}</span>
                      <span className="min-w-0 flex-1">
                        <b className={ttl}>{f.mine ? f.plan.fit?.name || f.plan.title || "Fitness" : f.name}</b>
                        <small className={sub}>{["Fitness", !f.mine && (f.plan.fit?.name || f.plan.title)].filter(Boolean).join(" · ")}</small>
                      </span>
                      {st && <Tag tone={tone}>{st}</Tag>}
                    </button>
                  </li>
                );
              })}
              {items.tasks.map((t) => (
                <li key={t.id} className="flex min-h-[3.5rem] items-center gap-3 px-3.5 py-2.5">
                  <span className="grid w-12 shrink-0 place-items-start">
                    <button
                      type="button"
                      onClick={() => toggleTask(t.id)}
                      aria-label={t.done ? "Yeniden aç" : "Yapıldı olarak işaretle"}
                      className={`grid size-6 place-items-center rounded-full border-[0.1094rem] transition active:scale-90 ${t.done ? "border-ok bg-ok text-white" : t.due < today ? "border-rec/70 text-transparent" : "border-mut/60 text-transparent"}`}
                    >
                      <Icon name="check" className="size-3.5 [stroke-width:3]" />
                    </button>
                  </span>
                  <button type="button" onClick={() => openAdd({ edit: { kind: "task", id: t.id } })} className="flex min-w-0 flex-1 items-center gap-2 text-left active:opacity-60">
                    <span className="min-w-0 flex-1">
                      <b className={`${ttl} ${t.done ? "text-mut line-through" : ""}`}>{t.title}</b>
                      <small className={`block truncate text-[0.8125rem] ${!t.done && t.due < today ? "font-semibold text-rec" : "text-mut"}`}>
                        {t.done ? "Yapıldı" : t.due < today ? "Gecikti" : "Görev · son gün"}
                      </small>
                    </span>
                    {pillOf(t)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* Geniş ekranda (iPad yatay, Mac) seçili güne ekleme düğmeleri sağ sütunun altında; telefonda gizli */}
        {count > 0 && !embedded && (
          <div className="cal-acts">
            <button type="button" onClick={() => openAdd({ type: "plan", date: sel })} data-press className="btn btn-primary btn-sm flex-1">
              Plan ekle
            </button>
            <button type="button" onClick={() => openAdd({ type: "task", date: sel })} data-press className="btn btn-secondary btn-sm flex-1">
              Görev ekle
            </button>
            <button type="button" onClick={() => openBirthday({ date: sel })} aria-label="Doğum günü ekle" data-press className="btn btn-round btn-sm">
              <Icon name="cake" className="size-5" />
            </button>
          </div>
        )}
      </div>
      )}
    </Root>
  );
}

// Takvim sayfasında <main>, ana sayfada (embedded) kartın içinde ay + gün listesi (globals.css .cal-emb)
function Root({ embedded, open, children }) {
  return embedded ? (
    <div className="cal-emb" data-open={open || undefined}>{children}</div>
  ) : (
    <main className="cal-wide mx-auto max-w-[30rem] px-5 pb-[calc(8rem+env(safe-area-inset-bottom))]">{children}</main>
  );
}
