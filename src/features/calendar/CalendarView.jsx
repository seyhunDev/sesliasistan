"use client";

import "@/features/home/sporcu.css";
import "./calSahne.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ImpTag } from "@/components/ui/ImpTag";
import { isImportant } from "@/lib/planImportant";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useData } from "@/features/data/DataProvider";
import { useWho } from "@/features/data/useWho";
import { liveHead } from "@/features/liveScreen/fonts";
import { birthdaysOn, dayItems, daysBetween, fitOn, leftLabel, lessonsOn, monthGrid, nextBirthday, remainLabel } from "@/lib/agenda";
import { fitDays, planTag, planTone } from "@/lib/homeTiles";
import { isFit, statusOf } from "@/lib/fitness/model";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { isTraining } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";

const WEEK = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const shift = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
// Fitness durumu (ana sayfadaki Fitness alanıyla aynı)
const FST = { done: "Yaptı", missed: "Yapmadı", skip: "Atladı" };
const D = (s) => new Date(`${s}T00:00`);
const longDay = (s) => D(s).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
const dm = (s) => D(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
// Gün başlığı: "Çarşamba 25"; başka aydaysa "Salı 1 Aralık"
const dayHead = (s, month) => D(s).toLocaleDateString("tr-TR", s.slice(0, 7) === month ? { weekday: "long", day: "numeric" } : { weekday: "long", day: "numeric", month: "long" });
const monthName = (ym) => D(`${ym}-01`).toLocaleDateString("tr-TR", { month: "long" });

// Takvim "Sahne" (Seyhun 2026-11-25 "Yap"; örnek project-files/takvim-sahne/ornek.html): ana sayfanın koyu dili, daha sade.
// Üstte yuvarlak düğmeler (geri · Takvim · ders programı · limon +), dar büyük ay adı, ay ızgarası (telefonda rakam + noktalar,
// iPad'de hücrelerde adlar); seçili gün limon daire, bugün limon halka. Altta seçili günün kayıtları ana sayfadaki plan listesi gibi:
// saat · tür rengi çizgi · ad ve alt satır · durum; süren plan limon zeminli. iPad yatayda (64rem+) solda ay, sağda gün.
// Fitness: kendi ve sporcuların antrenmanları (fitDays; fitOthers zaten yüklü, ek okuma yok).
export function CalendarView({ initial }) {
  const { plans: all, fitOthers, members, myUid, tasks, toggleTask, birthdays, lessons } = useData();
  const plans = useMemo(() => all.filter((p) => !isFit(p)), [all]);
  const fit = useMemo(() => fitDays(all, fitOthers || [], members, myUid), [all, fitOthers, members, myUid]);
  const fitDates = useMemo(() => new Set(fit.map((f) => f.date)), [fit]);
  const { openAdd } = useAdd();
  const { open: openPlan } = usePlanOpen(); // yarışa bağlı plan yarış sayfasını açar (tek kural)
  const { openBirthday } = useBirthday();
  const pillOf = useWho();
  const today = todayStr();
  const [sel, setSel] = useState(initial || today);
  const [browse, setBrowse] = useState(null);
  const month = browse || sel.slice(0, 7);
  const setMonth = (n) => setBrowse(shift(month, n));
  const pick = (day) => {
    setSel(day);
    setBrowse(null);
  };

  // Koyu zemin sayfanın altına da (ana sayfadaki gibi body.sh-body)
  useEffect(() => {
    document.body.classList.add("sh-body");
    return () => document.body.classList.remove("sh-body");
  }, []);

  const [addMenu, setAddMenu] = useState(false);
  const addRef = useRef(null);
  useEffect(() => {
    if (!addMenu) return;
    const off = (e) => addRef.current && !addRef.current.contains(e.target) && setAddMenu(false);
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [addMenu]);

  const cells = monthGrid(month);
  const mark = (day) => {
    const { plans: p, tasks: t } = dayItems(plans, tasks, day);
    const open = t.filter((x) => !x.done);
    const late = day < today && open.length > 0;
    const b = birthdaysOn(birthdays, day);
    const f = fitOn(fit, day);
    // iPad'de hücrede görünen adlar (telefonda yalnız noktalar)
    const evs = [
      ...b.map((x) => ({ k: `b${x.id}`, t: x.name, c: "bday" })),
      ...p.map((x) => ({ k: `p${x.id}`, h: x.time && (x.endDate || x.date) === x.date ? x.time : "", t: x.title, c: `tone-${planTone(x)}` })),
      ...f.map((x) => ({ k: `f${x.id}`, h: x.plan.time || "", t: x.mine ? x.plan.fit?.name || x.plan.title || "Fitness" : x.name, c: "tone-fit" })),
      ...open.map((x) => ({ k: `t${x.id}`, t: x.title, c: day < today ? "late" : "task" })),
    ];
    const dots = [p.length && "plan", fitDates.has(day) && "fit", open.length && (late ? "late" : "task"), b.length && "bday"].filter(Boolean);
    return { evs, dots, n: p.length + f.length + open.length + b.length };
  };

  const items = dayItems(plans, tasks, sel);
  const bdays = birthdaysOn(birthdays, sel);
  const dayLessons = lessonsOn(lessons, sel);
  const dayFit = fitOn(fit, sel);
  const count = items.plans.length + dayFit.length + items.tasks.length + bdays.length + dayLessons.length;
  const when = sel === today ? "Bugün" : sel > today ? leftLabel(sel, today) : "";
  // Süren plan (ana sayfadaki kural): bugün, başlama saati geçmiş, bitişi (yoksa süre, antrenmanda 2 saat, diğerlerinde 1 saat) gelmemiş
  const hOf = (t) => (/^\d{1,2}:\d{2}/.test(t || "") ? +t.split(":")[0] + +t.split(":")[1].slice(0, 2) / 60 : null);
  const nowD = new Date();
  const nowH = nowD.getHours() + nowD.getMinutes() / 60;
  const live = (p) => {
    if (sel !== today || p.date !== today || p.status === "cancelled" || hOf(p.time) == null) return false;
    const end = Math.max(hOf(p.endTime) ?? hOf(p.time) + (p.durationMin ? p.durationMin / 60 : isTraining(p) ? 2 : 1), hOf(p.time) + 0.5);
    return nowH >= hOf(p.time) && nowH < end;
  };

  return (
    <main data-theme="dark" className={`sh cal-sh ${liveHead.variable}`}>
      <header className="sh-top">
        <Link href="/" aria-label="Geri" data-press className="sh-rb">
          <Icon name="back" className="size-5" />
        </Link>
        <h1 className="sh-date m-0">Takvim</h1>
        <Link href="/schedule" aria-label="Ders programı" data-press className="sh-rb">
          <Icon name="book" className="size-5" />
        </Link>
        <span className="relative" ref={addRef}>
          <button type="button" onClick={() => setAddMenu((v) => !v)} aria-expanded={addMenu} aria-haspopup="menu" aria-label="Ekle" data-press className="sh-rb cal-sh-add">
            <Icon name="plus" className="size-5" />
          </button>
          {addMenu && (
            <div role="menu" className="cal-sh-menu">
              {[
                ["Plan", () => openAdd({ type: "plan", date: sel })],
                ["Görev", () => openAdd({ type: "task", date: sel })],
                ["Doğum günü", () => openBirthday({ date: sel })],
              ].map(([l, f]) => (
                <button key={l} type="button" role="menuitem" data-press="row" onClick={() => (setAddMenu(false), f())}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </span>
      </header>

      <div className="cal-sh-g">
        <section className="cal-sh-left" aria-label="Ay">
          <div className="cal-sh-mh">
            <h2 className="sh-c">
              {monthName(month)}
              <small className="num">{month.slice(0, 4)}</small>
            </h2>
            {(sel !== today || month !== today.slice(0, 7)) && (
              <button type="button" onClick={() => pick(today)} data-press className="sh-pill">
                Bugün
              </button>
            )}
            <button type="button" onClick={() => setMonth(-1)} aria-label="Önceki ay" data-press className="sh-rb">
              <Icon name="back" className="size-4" />
            </button>
            <button type="button" onClick={() => setMonth(1)} aria-label="Sonraki ay" data-press className="sh-rb">
              <Icon name="chev" className="size-4" />
            </button>
          </div>
          <div className="cal-sh-mo">
            <div className="cal-sh-wk">
              {WEEK.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="cal-sh-gr">
              {cells.map(({ day, inMonth }) => {
                const m = mark(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pick(day)}
                    aria-label={`${longDay(day)}${m.n ? `, ${m.n} kayıt` : ""}`}
                    aria-pressed={day === sel}
                    data-on={day === sel || undefined}
                    data-today={day === today || undefined}
                    data-out={inMonth ? undefined : ""}
                    className="cal-sh-cl"
                  >
                    <b>{+day.slice(8)}</b>
                    <span className="cal-sh-dots">
                      {m.dots.map((d) => (
                        <i key={d} data-c={d} />
                      ))}
                    </span>
                    {m.evs.length > 0 && (
                      <span className="cal-sh-evs" aria-hidden>
                        {m.evs.slice(0, 3).map((e) => (
                          <i key={e.k} className={e.c.startsWith("tone-") ? e.c : undefined} data-c={e.c}>
                            {e.h && <em>{e.h.slice(0, 5)}</em>}
                            {e.t}
                          </i>
                        ))}
                        {m.evs.length > 3 && <i data-c="more">+{m.evs.length - 3} daha</i>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="cal-sh-day" aria-label="Seçili gün">
          <div className="cal-sh-dh">
            <h3 className="sh-c">{dayHead(sel, today.slice(0, 7))}</h3>
            <small>
              {when && <em>{when}</em>}
              {when && count > 0 && " · "}
              {count > 0 && `${count} kayıt`}
            </small>
          </div>
          <ul className="cal-sh-ls">
            {count === 0 && <li className="cal-sh-none">Kayıt yok</li>}
            {bdays.map((b) => {
              const age = nextBirthday(b, sel).age;
              return (
                <li key={b.id}>
                  <button type="button" onClick={() => openBirthday({ edit: b.id })} data-press="row" className="cal-sh-it" data-c="bday">
                    <span className="num cal-sh-t">Gün</span>
                    <i />
                    <span className="cal-sh-x">
                      <b>{b.name}</b>
                      <small>{["Doğum günü", age && `${age} yaş`, b.note].filter(Boolean).join(" · ")}</small>
                    </span>
                  </button>
                </li>
              );
            })}
            {dayLessons.map((l) => (
              <li key={l.id}>
                <Link href="/schedule" data-press="row" className="cal-sh-it tone-gen">
                  <span className="num cal-sh-t">{l.start}</span>
                  <i />
                  <span className="cal-sh-x">
                    <b>{l.title}</b>
                    <small>{["Ders", l.end && `${l.start}–${l.end}`, l.place].filter(Boolean).join(" · ")}</small>
                  </span>
                </Link>
              </li>
            ))}
            {items.plans.map((p) => {
              const multi = p.endDate && p.endDate !== p.date;
              // Çok günlü planda "5. gün · son gün" / "2. gün · 3 gün daha", tek günlüde "Bugün" / "Yarın" / "N gün kaldı"
              const k = multi ? daysBetween(p.date, sel) + 1 : 0;
              const left = multi ? `${k}. gün · ${sel === p.endDate ? "son gün" : remainLabel({ ...p, endDate: p.endDate }, sel).toLocaleLowerCase("tr-TR")}` : leftLabel(p.date, today);
              const imp = isImportant(p);
              const now = live(p);
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => openPlan(p)} data-press="row" className={`cal-sh-it tone-${planTone(p)}`} data-now={now || undefined} data-imp={imp || undefined}>
                    <span className="num cal-sh-t">{multi ? (sel === p.date && p.time ? p.time.slice(0, 5) : `${k}. gün`) : p.time ? p.time.slice(0, 5) : "Gün"}</span>
                    <i />
                    <span className="cal-sh-x">
                      <b className={p.status === "cancelled" ? "cal-sh-off" : ""}>{p.title}</b>
                      <small>
                        {imp && <ImpTag />}
                        {[left, planTag(p), multi && `${dm(p.date)} – ${dm(p.endDate)}`, p.place].filter(Boolean).join(" · ")}
                      </small>
                      {pillOf(p) && <span className="cal-sh-who">{pillOf(p)}</span>}
                    </span>
                    {now && <span className="cal-sh-tg cal-sh-live">Şimdi</span>}
                  </button>
                </li>
              );
            })}
            {dayFit.map((f) => {
              const st = FST[statusOf(f.plan, today)];
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => openAdd({ edit: { kind: "plan", id: f.id } })} data-press="row" className="cal-sh-it tone-fit">
                    <span className="num cal-sh-t">{f.plan.time ? f.plan.time.slice(0, 5) : "Gün"}</span>
                    <i />
                    <span className="cal-sh-x">
                      <b>{f.mine ? f.plan.fit?.name || f.plan.title || "Fitness" : f.name}</b>
                      <small>{["Fitness", !f.mine && (f.plan.fit?.name || f.plan.title)].filter(Boolean).join(" · ")}</small>
                    </span>
                    {st && <span className={`cal-sh-tg ${st === "Yaptı" ? "cal-sh-ok" : ""}`}>{st}</span>}
                  </button>
                </li>
              );
            })}
            {items.tasks.map((t) => {
              const late = !t.done && t.due < today;
              return (
                <li key={t.id} className="cal-sh-it" data-c={late ? "late" : "task"}>
                  <span className="cal-sh-t">
                    <button
                      type="button"
                      onClick={() => toggleTask(t.id)}
                      aria-label={t.done ? "Yeniden aç" : "Yapıldı olarak işaretle"}
                      className="cal-sh-ck"
                      data-done={t.done || undefined}
                    >
                      <Icon name="check" className="size-3.5 [stroke-width:3]" />
                    </button>
                  </span>
                  <i />
                  <button type="button" onClick={() => openAdd({ edit: { kind: "task", id: t.id } })} className="cal-sh-x text-left active:opacity-60">
                    <b className={t.done ? "cal-sh-off" : ""}>{t.title}</b>
                    <small className={late ? "cal-sh-late" : ""}>{t.done ? "Yapıldı" : late ? "Gecikti" : "Görev · son gün"}</small>
                    {pillOf(t) && <span className="cal-sh-who">{pillOf(t)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="cal-sh-acts">
            <button type="button" onClick={() => openAdd({ type: "plan", date: sel })} data-press className="cal-sh-bt cal-sh-p">
              + Plan
            </button>
            <button type="button" onClick={() => openAdd({ type: "task", date: sel })} data-press className="cal-sh-bt">
              + Görev
            </button>
            <button type="button" onClick={() => openBirthday({ date: sel })} aria-label="Doğum günü ekle" data-press className="cal-sh-bt cal-sh-r">
              <Icon name="cake" className="size-5" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
