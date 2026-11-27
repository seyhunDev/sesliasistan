"use client";

import { useState } from "react";
import { cap, addDays, todayStr } from "@/lib/utils/format";
import { defaultUntil, repeatLabel, seriesDates } from "@/lib/repeat";
import { REMIND_OPTS } from "@/lib/reminders";
import { useWide } from "@/hooks/useWide";
import { liveHead } from "@/features/liveScreen/fonts";
import { Icon } from "@/components/ui/Icon";
import { Picker, TIMES, addDaysFrom, remindOf, remindText, saturday } from "./DraftCard";

// Yeni plan penceresi "Sahne" (Seyhun 2026-11-27 "Yap"; örnek project-files/plan-ekle/ornek.html): koyu pencere (Sheet + SheetTone "sahne"),
// önce tür (Antrenman, Yarış, Toplantı, Kamp, Diğer; renk takvimdeki noktayla aynı), ad türden dolar ve değiştirilebilir, Diğer'de boş.
// Saat ve yer o türün son planından gelir. Yarış ve Kamp başlangıç/bitiş kutularıyla açılır. Önemli, Tekrar, Hatırlat, Sorumlu "Daha fazla"da.
export const PLAN_TYPES = [
  { cat: "Antrenman", sub: "Su üstü", color: "#22c55e" },
  { cat: "Yarış", sub: "Regatta", color: "#60a5fa", multi: true },
  { cat: "Toplantı", sub: "Veli, yönetim", color: "#a78bfa" },
  { cat: "Kamp", sub: "Birkaç gün", color: "#c8a27a", multi: true },
  { cat: "Genel", name: "Diğer", sub: "Adını sen yaz", color: "#a1a1aa" },
];
const NAMES = new Set(PLAN_TYPES.filter((t) => t.cat !== "Genel").map((t) => t.cat));
export const isTypeName = (s) => NAMES.has(String(s || "").trim());
const KINDS = [["plan", "Plan"], ["task", "Görev"], ["note", "Not"]];
const WD = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const MO = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export const dayShort = (s) => {
  if (!s) return "";
  const d = new Date(`${s}T00:00`);
  return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`;
};

// Türün son planı (fitness ve iptal hariç): saat ve yer oradan gelir
export function lastOfType(plans = [], cat) {
  let best = null;
  for (const p of plans) {
    if (!p || p.fit || p.status === "cancelled" || (p.cat || "Genel") !== cat || !p.date) continue;
    if (!best || p.date > best.date) best = p;
  }
  return best;
}

// Tür seçilince taslağa gelenler: tür, ad (kullanıcı kendi adını yazdıysa dokunulmaz), son plandan saat ve yer
export function pickType(d, t, plans) {
  const typed = (d.title || "").trim() && !NAMES.has((d.title || "").trim());
  const last = t.cat === "Genel" ? null : lastOfType(plans, t.cat);
  return {
    cat: t.cat,
    title: typed ? d.title : t.cat === "Genel" ? "" : t.cat,
    ...(last?.time && !d.endDate ? { time: last.time, allDay: false } : {}),
    ...(last?.place && !(d.place || "").trim() ? { place: last.place } : {}),
  };
}

const chip = (on) =>
  `shrink-0 rounded-full px-3 py-1.5 text-[0.875rem] font-semibold tabular-nums transition active:scale-95 ${on ? "bg-acc text-[#111]" : "bg-[#26262b] text-[#e4e4e7]"}`;
const box = "overflow-hidden rounded-[1.1rem] border border-line bg-[#141416]";
const row = "flex min-h-[3rem] items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0";

function Switch({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-acc" : "bg-[#3f3f46]"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full transition-all ${on ? "left-[1.125rem] bg-[#111]" : "left-0.5 bg-white"}`} />
    </button>
  );
}

export function PlanForm({ d, onChange, onKind, plans, members }) {
  const wide = useWide();
  const [more, setMore] = useState(false);
  const put = (patch) => onChange(patch);
  const type = PLAN_TYPES.find((t) => t.cat === (d.cat || "Genel")) || PLAN_TYPES[4];
  const multi = !!d.endDate || !!type.multi;
  const allDay = !d.time;
  const quick = [["Bugün", todayStr()], ["Yarın", addDays(1)], ["Cmt", saturday()]];
  const customDay = d.date && !quick.some(([, v]) => v === d.date);
  const customTime = d.time && !TIMES.includes(d.time);
  const remind = remindOf(d);
  const known = (d.assignees || []).filter((u) => members?.some((m) => m.uid === u));
  const moreSum = [d.important && "Önemli", d.repeat === "week" && "Her hafta", d.date && remind != null && `Hatırlat ${remindText(remind).replace(" önce", "")}`].filter(Boolean).join(" · ");
  const toggleWho = (uid) => {
    const v = known.includes(uid) ? known.filter((u) => u !== uid) : [...known, uid];
    put({ assignees: v, _general: !v.length });
  };

  const types = (
    <div className={wide ? "flex flex-col gap-2" : "-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]"}>
      {PLAN_TYPES.map((t) => {
        const on = t.cat === type.cat;
        return (
          <button
            key={t.cat}
            type="button"
            aria-pressed={on}
            onClick={() => put({ ...pickType(d, t, plans), ...(t.multi ? {} : { endDate: "" }) })}
            style={on ? { borderColor: "#d4ff3a" } : undefined}
            className={`min-w-0 rounded-2xl border-[1.5px] border-line bg-[#141416] px-3 py-2 text-left transition active:scale-[.97] ${wide ? "" : "w-[7rem] shrink-0"}`}
          >
            <b className="flex items-center gap-1.5 whitespace-nowrap text-[0.9375rem] font-semibold">
              <i className="size-2 shrink-0 rounded-full" style={{ background: t.color }} />
              {t.name || t.cat}
            </b>
            <small className="mt-0.5 block truncate text-[0.75rem] text-mut">{t.sub}</small>
          </button>
        );
      })}
    </div>
  );

  const details = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className={box}>
        <input
          value={d.title}
          onChange={(e) => put({ title: cap(e.target.value) })}
          placeholder="Plan adı"
          aria-label="Plan adı"
          autoCapitalize="sentences"
          enterKeyHint="done"
          className="pf-title sahne-t w-full bg-transparent px-3.5 py-3 text-fg caret-[#d4ff3a] outline-none placeholder:text-[#52525b]"
        />
      </div>

      <div className={box}>
        {multi ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {[["Başlar", d.date, (v) => put({ date: v, ...(d.endDate && v > d.endDate ? { endDate: "" } : {}) })], ["Biter", d.endDate, (v) => put({ endDate: v && d.date && v < d.date ? d.date : v, time: "", allDay: true })]].map(([l, v, set]) => (
              <Picker key={l} type="date" value={v} onChange={set} className="block rounded-[0.9rem] bg-[#26262b] px-3 py-2">
                <small className="block text-[0.6875rem] font-bold uppercase tracking-[.08em] text-mut">{l}</small>
                <b className={`block text-[0.9375rem] font-semibold ${v ? "" : l === "Başlar" ? "text-warn" : "text-mut"}`}>{v ? dayShort(v) : l === "Başlar" ? "Seç" : "Tek gün"}</b>
              </Picker>
            ))}
          </div>
        ) : (
          <>
            <div className={row}>
              <span className="flex-1 text-[0.9375rem] font-semibold">Gün</span>
              <span className={`text-[0.875rem] ${d.date ? "text-mut" : "text-warn"}`}>{d.date ? dayShort(d.date) : "Seç"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
              {quick.map(([l, v]) => (
                <button key={l} type="button" onClick={() => put({ date: v })} className={chip(d.date === v)}>
                  {l}
                </button>
              ))}
              <Picker type="date" value={d.date} onChange={(v) => v && put({ date: v })} className={chip(customDay)}>
                {customDay ? dayShort(d.date) : "Tarih seç"}
              </Picker>
            </div>
          </>
        )}
        {!d.endDate && (
          <>
            <div className={row}>
              <span className="flex-1 text-[0.9375rem] font-semibold">Saat</span>
              <span className="text-[0.875rem] tabular-nums text-mut">{allDay ? "Tüm gün" : d.time}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
              {TIMES.map((t) => (
                <button key={t} type="button" onClick={() => put({ time: t, allDay: false })} className={chip(d.time === t)}>
                  {t}
                </button>
              ))}
              <Picker type="time" value={d.time} onChange={(v) => v && put({ time: v, allDay: false })} className={chip(customTime)}>
                {customTime ? d.time : "Saat seç"}
              </Picker>
              <button type="button" onClick={() => put({ time: "", allDay: true })} className={chip(allDay)}>
                Tüm gün
              </button>
            </div>
          </>
        )}
        <label className={row}>
          <span className="text-[0.9375rem] font-semibold">Yer</span>
          <input
            value={d.place}
            onChange={(e) => put({ place: e.target.value })}
            placeholder="Ekle"
            autoCapitalize="words"
            className="min-w-0 flex-1 bg-transparent text-right text-[0.875rem] text-fg outline-none placeholder:text-mut"
          />
        </label>
      </div>

      <div className={box}>
        <button type="button" aria-expanded={more} onClick={() => setMore((m) => !m)} className={`${row} w-full text-left`}>
          <span className="flex-1 text-[0.9375rem] font-semibold">Daha fazla</span>
          {!more && moreSum && <span className="min-w-0 truncate text-[0.875rem] text-mut">{moreSum}</span>}
          <Icon name="chev" className={`size-4 shrink-0 text-mut transition-transform ${more ? "rotate-90" : ""}`} />
        </button>
        {more && (
          <>
            <div className={row}>
              <span className="flex-1 text-[0.9375rem] font-semibold">Önemli</span>
              <Switch on={!!d.important} label="Önemli" onClick={() => put({ important: !d.important })} />
            </div>
            {!type.multi && (
              <div className={row}>
                <span className="flex-1 text-[0.9375rem] font-semibold">Birkaç gün</span>
                <Switch on={!!d.endDate} label="Birkaç gün" onClick={() => put(d.endDate ? { endDate: "" } : { endDate: addDaysFrom(d.date || todayStr(), 1), date: d.date || todayStr(), time: "", allDay: true, repeat: "", repeatUntil: "" })} />
              </div>
            )}
            {!d.endDate && (
              <div className={row}>
                <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold">
                  Her hafta
                  {d.repeat === "week" && d.date && (
                    <Picker type="date" value={d.repeatUntil || defaultUntil(d.date)} onChange={(v) => v && put({ repeatUntil: v < d.date ? d.date : v })} className="ml-2 inline-block text-[0.8125rem] font-normal text-acc">
                      {repeatLabel(d.repeatUntil || defaultUntil(d.date))} ({seriesDates(d.date, d.repeatUntil).length})
                    </Picker>
                  )}
                </span>
                <Switch on={d.repeat === "week"} label="Her hafta" onClick={() => put(d.repeat === "week" ? { repeat: "", repeatUntil: "" } : { repeat: "week", repeatUntil: "" })} />
              </div>
            )}
            <div className="border-t border-line px-3.5 py-2.5">
              <p className="text-[0.9375rem] font-semibold">
                Hatırlat <span className="font-normal text-mut">· {remindText(remind)}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REMIND_OPTS.map((o) => (
                  <button key={o.min} type="button" onClick={() => put({ remind: o.min })} className={chip(remind === o.min)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {members?.length > 0 && (
              <div className="border-t border-line px-3.5 py-2.5">
                <p className="text-[0.9375rem] font-semibold">Sorumlu</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => put({ assignees: [], _general: true })} className={chip(!known.length)}>
                    Genel
                  </button>
                  {members.map((m) => (
                    <button key={m.uid} type="button" aria-pressed={known.includes(m.uid)} onClick={() => toggleWho(m.uid)} className={chip(known.includes(m.uid))}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={`${liveHead.variable} pb-3`}>
      <div className="mb-3 flex rounded-full border border-line bg-[#141416] p-[3px]">
        {KINDS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={k === "plan"} onClick={() => k !== "plan" && onKind(k)} className={`flex-1 rounded-full py-1.5 text-[0.875rem] font-bold ${k === "plan" ? "bg-[#fff] text-[#111]" : "text-mut"}`}>
            {l}
          </button>
        ))}
      </div>
      {wide ? (
        <div className="grid grid-cols-[13rem_minmax(0,1fr)] gap-4">
          {types}
          {details}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {types}
          {details}
        </div>
      )}
    </div>
  );
}
