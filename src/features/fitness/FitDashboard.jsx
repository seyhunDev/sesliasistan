"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { card } from "@/components/ui/Page";
import { DOWS, STATUS, bestText, dowOf, exerciseHistory, itemLine, progWeek, resLine, statusOf } from "@/lib/fitness/model";

// Fitness ana ekranının parçaları (program kaydedildikten sonra): bugünün antrenmanı, bu hafta, gelişim, program, bu ay, geçmiş.
// Yalnız gösterir; veri ve işlemler FitnessHome'dan gelir.

const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
const WARM = ["warmup", "stretch"];
const mainItems = (items = []) => items.filter((it) => !WARM.includes(it.ex));
const began = (p) => p.fit?.res?.ex?.some((e) => e.sets?.some((s) => s.ok));

function Section({ title, right, children }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[1.0625rem] font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

// Bugün: koyu büyük kart. Antrenman varsa hareketler ve "Başla"; yapıldıysa sonuç; yoksa dinlenme + sıradaki
export function TodayCard({ plan, next, week, today, onOpen }) {
  if (!plan) {
    return (
      <section className="mt-2 overflow-hidden rounded-[1.625rem] bg-deep p-5 text-white">
        <span className="text-[0.75rem] font-semibold tracking-[.1em] text-white/60">BUGÜN</span>
        <b className="mt-1 block text-[1.5rem] font-bold leading-tight">Dinlenme günü</b>
        <p className="mt-1 text-[0.875rem] text-white/70">Kasların dinlenirken güçlenir.</p>
        {next && (
          <button type="button" onClick={() => onOpen(next)} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left">
            <span className="min-w-0 flex-1">
              <small className="block text-[0.75rem] text-white/60">Sıradaki · {dayText(next.date)}{next.time ? ` ${next.time}` : ""}</small>
              <b className="block truncate text-[1rem] font-semibold">{next.fit?.name || next.title}</b>
            </span>
            <Icon name="chev" className="size-4 shrink-0 text-white/60" />
          </button>
        )}
      </section>
    );
  }
  const st = statusOf(plan, today);
  const items = mainItems(plan.fit?.items);
  const wk = week ? `${week.n}. hafta` : "";
  if (st === "done" || st === "skip") {
    const done = st === "done";
    return (
      <button type="button" onClick={() => onOpen(plan)} className="mt-2 w-full overflow-hidden rounded-[1.625rem] bg-deep p-5 text-left text-white">
        <span className="flex items-center gap-3">
          <span className={`grid size-12 shrink-0 place-items-center rounded-full ${done ? "bg-white text-deep" : "bg-white/15 text-white"}`}>
            {done ? <Icon name="check" className="size-6" /> : <span className="text-[1.25rem]">–</span>}
          </span>
          <span className="min-w-0 flex-1">
            <small className="block text-[0.75rem] font-semibold tracking-[.1em] text-white/60">BUGÜN</small>
            <b className="block text-[1.25rem] font-bold leading-tight">{done ? "Antrenman tamam" : "Bugün atlandı"}</b>
          </span>
        </span>
        <span className="mt-3 block truncate text-[0.9375rem] font-semibold">{plan.fit?.name || plan.title}</span>
        {done && <small className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-white/70">{[plan.fit?.res?.min ? `${plan.fit.res.min} dk` : "", resLine(plan.fit)].filter(Boolean).join(" · ")}</small>}
      </button>
    );
  }
  return (
    <section className="mt-2 overflow-hidden rounded-[1.625rem] bg-deep p-5 text-white">
      <div className="flex items-center justify-between text-[0.75rem] font-semibold tracking-[.1em] text-white/60">
        <span>BUGÜN{plan.time ? ` · ${plan.time}` : ""}</span>
        {wk && <span className="tracking-normal">{wk}</span>}
      </div>
      <b className="mt-1 block text-[1.625rem] font-bold leading-tight">{plan.fit?.name || plan.title}</b>
      <span className="mt-1 flex gap-3 text-[0.875rem] text-white/75">
        <span className="flex items-center gap-1">
          <Icon name="clock" className="size-4" />
          {plan.durationMin || 45} dk
        </span>
        <span className="flex items-center gap-1">
          <Icon name="dumbbell" className="size-4" />
          {items.length} hareket
        </span>
      </span>
      <ul className="mt-4 space-y-2">
        {items.slice(0, 4).map((it, i) => (
          <li key={i} className="flex items-center gap-3 text-[0.9375rem]">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/12 text-[0.75rem] font-semibold tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{it.name}</span>
            <span className="shrink-0 text-[0.8125rem] tabular-nums text-white/65">{itemLine(it)}</span>
          </li>
        ))}
      </ul>
      {items.length > 4 && <small className="mt-2 block pl-9 text-[0.8125rem] text-white/55">+{items.length - 4} hareket daha</small>}
      <button type="button" onClick={() => onOpen(plan)} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[1rem] font-bold text-deep">
        {began(plan) ? "Devam et" : "Antrenmana başla"}
        <Icon name="chev" className="size-4" />
      </button>
    </section>
  );
}

// Halka: yapılan / planlanan
function Ring({ done, all }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const k = all ? Math.min(done / all, 1) : 0;
  return (
    <span className="relative grid size-16 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--acc)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * k} ${c}`} />
      </svg>
      <b className="text-[1.0625rem] font-bold tabular-nums">
        {done}
        <span className="text-[0.75rem] font-semibold text-mut">/{all}</span>
      </b>
    </span>
  );
}

const CIRCLE = {
  done: "bg-acc text-white",
  skip: "bg-line text-mut",
  missed: "border-2 border-rec/60 text-rec",
  today: "border-2 border-acc text-acc",
  next: "bg-acc/12 text-acc",
};

// Bu hafta: halka, 7 gün, seri ve süre
export function WeekCard({ week, strip, today, onOpen }) {
  const left = week.left;
  return (
    <Section title="Bu hafta">
      <div className={`${card} p-4`}>
        <div className="flex items-center gap-4">
          <Ring done={week.done} all={week.planned} />
          <span className="min-w-0 flex-1">
            <b className="block text-[1.0625rem] font-semibold">{week.planned && week.done >= week.planned ? "Hafta tamam" : `${week.done} antrenman yapıldı`}</b>
            <small className="block text-[0.8125rem] text-mut">
              {left ? `${left} antrenman kaldı` : week.missed ? `${week.missed} antrenman kaçırıldı` : week.planned ? "Harika gidiyorsun" : "Bu hafta antrenman yok"}
            </small>
          </span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {strip.map((d) => (
            <button key={d.date} type="button" disabled={!d.id} onClick={() => d.id && onOpen({ id: d.id })} className="flex flex-col items-center gap-1.5">
              <span className={`text-[0.6875rem] font-semibold ${d.date === today ? "text-acc" : "text-mut"}`}>{DOWS[d.dow]}</span>
              <span className={`grid size-9 place-items-center rounded-full text-[0.8125rem] font-semibold tabular-nums ${d.st ? CIRCLE[d.st] : "text-mut/50"}`}>
                {d.st === "done" ? <Icon name="check" className="size-4" /> : d.st === "missed" ? "✕" : d.st ? +d.date.slice(8) : "·"}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5">
            <span className="text-orange-600">
              <Icon name="flame" className="size-5" />
            </span>
            <span className="min-w-0">
              <b className="block text-[1rem] font-semibold leading-none tabular-nums">{week.streak}</b>
              <small className="text-[0.75rem] text-mut">hafta seri</small>
            </span>
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5">
            <span className="text-acc">
              <Icon name="clock" className="size-5" />
            </span>
            <span className="min-w-0">
              <b className="block text-[1rem] font-semibold leading-none tabular-nums">{week.minutes || 0}</b>
              <small className="text-[0.75rem] text-mut">dakika</small>
            </span>
          </span>
        </div>
      </div>
    </Section>
  );
}

// Küçük çizgi grafik: hareketin yapıldığı günlerdeki en iyi değer
function Spark({ values }) {
  if (values.length < 2) return <span className="w-14" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 52 + 2},${hi === lo ? 12 : 21 - ((v - lo) / (hi - lo)) * 18}`).join(" ");
  return (
    <svg viewBox="0 0 56 24" className="h-6 w-14 shrink-0">
      <polyline points={pts} fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Gelişim: hareket başına en iyi değer, artış ve küçük grafik (ilk 4, "Tümü" ile hepsi)
export function ProgressCard({ recs: list, plans }) {
  const [all, setAll] = useState(false);
  const recs = list.filter((r) => !WARM.includes(r.key));
  if (!recs.length) return null;
  const shown = all ? recs : recs.slice(0, 4);
  return (
    <Section
      title="Gelişim"
      right={
        recs.length > 4 && (
          <button type="button" onClick={() => setAll(!all)} className="text-[0.8125rem] font-semibold text-acc">
            {all ? "Daha az" : "Tümü"}
          </button>
        )
      }
    >
      <div className={`${card} divide-y divide-line px-4`}>
        {shown.map((r) => {
          const kg = r.best.kg && r.first.kg;
          const up = kg ? r.best.kg - r.first.kg : (r.best.reps || r.best.sec || 0) - (r.first.reps || r.first.sec || 0);
          const vals = exerciseHistory(plans, r.key).map((x) => x.kg || x.reps || x.sec || x.min);
          return (
            <div key={r.key} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-medium">{r.name}</b>
                <small className="block text-[0.75rem] text-mut">
                  {r.times} kez · en iyi {bestText(r)}
                </small>
              </span>
              <Spark values={vals.slice(-8)} />
              <span className={`w-16 shrink-0 rounded-full py-1 text-center text-[0.75rem] font-bold tabular-nums ${up > 0 ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
                {up > 0 ? `+${String(up).replace(".", ",")}${kg ? " kg" : r.kind === "time" ? " sn" : ""}` : "aynı"}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// Program: başlık, hafta ilerlemesi, günler (yalnız ad ve saat), işlemler
export function ProgramCard({ prog, today, onCal, busy, onEdit, onPlan, onUnplan, onDrop, bare }) {
  const wk = progWeek(prog, today);
  const k = wk ? Math.min(Math.max(wk.n, 0), wk.of) / wk.of : 0;
  const body = (
      <div className={bare ? "" : `${card} p-4`}>
        <b className="block text-[1.0625rem] font-semibold">{prog.title}</b>
        {wk && (
          <>
            <small className="mt-0.5 block text-[0.8125rem] text-mut">
              {wk.n === 0 ? `${dayText(prog.start)} başlıyor` : wk.n > wk.of ? "Program bitti" : `${wk.n}. hafta / ${wk.of}`}
              {` · ${onCal ? `${onCal} antrenman takvimde` : "takvimde değil"}`}
            </small>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-acc" style={{ width: `${k * 100}%` }} />
            </span>
          </>
        )}
        <ul className="mt-3 divide-y divide-line">
          {prog.days.map((d) => (
            <li key={d.dow} className={`flex items-center gap-3 py-2.5 ${dowOf(today) === d.dow ? "font-semibold" : ""}`}>
              <span className={`grid h-8 w-11 shrink-0 place-items-center rounded-lg text-[0.75rem] font-bold ${dowOf(today) === d.dow ? "bg-acc text-white" : "bg-bg"}`}>{DOWS[d.dow]}</span>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{d.name}</span>
              <span className="shrink-0 text-[0.8125rem] font-normal tabular-nums text-mut">
                {d.time ? `${d.time} · ` : ""}
                {d.min} dk
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onEdit} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-bg text-[0.875rem] font-semibold">
            <Icon name="edit" className="size-4" />
            Düzenle
          </button>
          {onCal ? (
            <button type="button" disabled={busy} onClick={onUnplan} className="h-11 rounded-xl bg-bg text-[0.875rem] font-semibold text-mut">
              Takvimden kaldır
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={onPlan} className="h-11 rounded-xl bg-acc text-[0.875rem] font-semibold text-white">
              Planlara ekle
            </button>
          )}
        </div>
        <button type="button" disabled={busy} onClick={onDrop} className="mt-1 h-9 w-full text-[0.8125rem] font-semibold text-rec">
          Programı sil
        </button>
      </div>
  );
  return bare ? body : <Section title="Programım">{body}</Section>;
}

// Sade hafta: başlık ("Bu hafta 2/3 antrenman") ve 7 gün; ayrıntılı sayılar Gelişim ve geçmiş'te
export function WeekStrip({ week, strip, today, onOpen }) {
  return (
    <div className={`${card} mt-3 p-4`}>
      <div className="flex items-baseline justify-between">
        <b className="text-[1rem] font-semibold">Bu hafta</b>
        <span className="text-[0.875rem] tabular-nums text-mut">{week.planned ? `${week.done}/${week.planned} antrenman` : "Antrenman yok"}</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {strip.map((d) => (
          <button key={d.date} type="button" disabled={!d.id} onClick={() => d.id && onOpen({ id: d.id })} className="flex flex-col items-center gap-1.5">
            <span className={`text-[0.6875rem] font-semibold ${d.date === today ? "text-acc" : "text-mut"}`}>{DOWS[d.dow]}</span>
            <span className={`grid size-9 place-items-center rounded-full text-[0.8125rem] font-semibold tabular-nums ${d.st ? CIRCLE[d.st] : "text-mut/50"}`}>
              {d.st === "done" ? <Icon name="check" className="size-4" /> : d.st === "missed" ? "✕" : d.st ? +d.date.slice(8) : "·"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Tek satır kart düğmesi (Programım, Gelişim ve geçmiş)
export function RowButton({ icon, title, sub, onClick, open }) {
  return (
    <button type="button" onClick={onClick} className={`${card} mt-3 flex w-full items-center gap-3 px-4 py-3.5 text-left`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
        {sub && <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>}
      </span>
      <Icon name="chev" className={`size-4 shrink-0 text-mut transition-transform ${open ? "rotate-90" : ""}`} />
    </button>
  );
}

// Programım satırının alt yazısı: "3. hafta / 8 · takvimde"
export function progSub(prog, today, onCal) {
  const wk = progWeek(prog, today);
  const w = !wk ? "" : wk.n === 0 ? `${dayText(prog.start)} başlıyor` : wk.n > wk.of ? "Program bitti" : `${wk.n}. hafta / ${wk.of}`;
  return [w, onCal ? "takvimde" : "takvimde değil"].filter(Boolean).join(" · ");
}

// Bu ay: üç sayı
export function MonthCard({ month, today }) {
  if (!month.planned) return null;
  const time = month.minutes ? (month.minutes < 60 ? `${month.minutes} dk` : `${String(Math.round(month.minutes / 6) / 10).replace(".", ",")} sa`) : "–";
  return (
    <Section title="Bu ay" right={<span className="text-[0.8125rem] text-mut">{new Date(`${today}T12:00:00`).toLocaleDateString("tr-TR", { month: "long" })}</span>}>
      <div className={`${card} grid grid-cols-3 divide-x divide-line py-3 text-center`}>
        {[
          [`${month.done}/${month.planned}`, "antrenman"],
          [month.rate ? `%${month.rate}` : "–", "devam"],
          [time, "süre"],
        ].map(([v, l]) => (
          <span key={l}>
            <b className="block text-[1.25rem] font-semibold tabular-nums">{v}</b>
            <small className="text-[0.75rem] text-mut">{l}</small>
          </span>
        ))}
      </div>
      {month.volume > 0 && <p className="mt-2 px-1 text-[0.8125rem] text-mut">Bu ay toplam {month.volume.toLocaleString("tr-TR")} kg kaldırdın.</p>}
    </Section>
  );
}

const TAG = { done: "bg-acc/10 text-acc", skip: "bg-bg text-mut", missed: "bg-rec/10 text-rec", today: "bg-bg text-mut", next: "bg-bg text-mut" };

// Geçmiş: son 5, "Tümü" ile 12
export function HistoryCard({ list, today, onOpen }) {
  const [all, setAll] = useState(false);
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, 5);
  return (
    <Section
      title="Geçmiş"
      right={
        list.length > 5 && (
          <button type="button" onClick={() => setAll(!all)} className="text-[0.8125rem] font-semibold text-acc">
            {all ? "Daha az" : "Tümü"}
          </button>
        )
      }
    >
      <div className={`${card} divide-y divide-line`}>
        {shown.map((p) => {
          const st = statusOf(p, today);
          return (
            <button key={p.id} type="button" onClick={() => onOpen(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="w-[4.5rem] shrink-0 text-[0.8125rem] text-mut">{dayText(p.date)}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-medium">{p.fit?.name || p.title}</b>
                {resLine(p.fit) && <small className="block truncate text-[0.75rem] text-mut">{resLine(p.fit)}</small>}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${TAG[st]}`}>{STATUS[st]}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
