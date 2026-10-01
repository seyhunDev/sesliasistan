"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { addDays, cap, todayStr } from "@/lib/utils/format";

const TYPES = [["plan", "Plan", "cal"], ["task", "Görev", "task"], ["note", "Not", "note"]];
export const TIMES = ["09:00", "10:00", "12:00", "14:00", "18:00"];
const TITLE_PH = { plan: "Ne yapılacak? örn. Antrenman", task: "Ne yapılmalı? örn. Yelkenleri kontrol et", note: "Başlık" };

const D = (s) => new Date(`${s}T00:00`);
// "Bugün · 29 Eylül Pazartesi" gibi okunaklı tarih
export function dayLabel(s) {
  const n = Math.round((D(s) - D(todayStr())) / 864e5);
  const long = D(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  return n === 0 ? `Bugün · ${long}` : n === 1 ? `Yarın · ${long}` : long;
}
// Bu haftanın (geçtiyse gelecek haftanın) cumartesisi
export function saturday() {
  const d = new Date().getDay();
  return addDays(d === 6 ? 7 : (6 - d + 7) % 7 || 7);
}

export const chip = (on) =>
  `shrink-0 rounded-full px-3 py-1.5 text-[0.875rem] font-medium transition-colors active:scale-95 ${on ? "bg-acc text-white" : "bg-bg text-fg"}`;

// Dokununca telefonun kendi tarih/saat seçicisini açan düğme (görünmez yerel input üstte)
export function Picker({ type, value, onChange, children, className }) {
  const ref = useRef(null);
  return (
    <label className={`relative cursor-pointer ${className}`}>
      {children}
      <input
        ref={ref}
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => {
          try {
            ref.current?.showPicker?.();
          } catch {}
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        aria-label={type === "date" ? "Tarih seç" : "Saat seç"}
      />
    </label>
  );
}

// Formdaki tek satır: solda simge, sağda içerik
function Row({ icon, children, top }) {
  return (
    <div className={`flex gap-3 px-4 py-3 ${top ? "items-start" : "items-center"}`}>
      <Icon name={icon} className={`size-5 shrink-0 text-mut ${top ? "mt-px" : ""}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// Tarih: hızlı seçimler + takvim
function DateRow({ value, onChange, optional, warn, label }) {
  const quick = [["Bugün", todayStr()], ["Yarın", addDays(1)], ["Cumartesi", saturday()]];
  const custom = value && !quick.some(([, v]) => v === value);
  return (
    <Row icon="cal" top>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[0.9375rem] ${value ? "font-medium" : warn ? "font-medium text-amber-700" : "text-mut"}`}>
          {value ? dayLabel(value) : label}
        </span>
        {optional && value && (
          <button type="button" onClick={() => onChange("")} className="shrink-0 text-[0.8125rem] font-medium text-mut active:opacity-50">
            Kaldır
          </button>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {quick.map(([l, v]) => (
          <button key={l} type="button" onClick={() => onChange(v)} className={chip(value === v)}>
            {l}
          </button>
        ))}
        <Picker type="date" value={value} onChange={onChange} className={chip(custom)}>
          <span className="inline-flex items-center gap-1">Tarih seç</span>
        </Picker>
      </div>
    </Row>
  );
}

// Sorumlu çalışan(lar): birden fazla seçilebilir; hiçbiri seçilmezse "Genel"
function AssignRow({ value, members, onChange }) {
  const toggle = (uid) => onChange(value.includes(uid) ? value.filter((u) => u !== uid) : [...value, uid]);
  const known = value.filter((u) => members.some((m) => m.uid === u));
  return (
    <Row icon="users" top>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.9375rem] font-medium">Sorumlu</span>
        <span className="truncate text-[0.8125rem] text-mut">{known.length ? "Kayıt sorumlularda da görünür" : "Birden fazla kişi seçebilirsin"}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onChange([])} className={chip(!known.length)}>
          Genel
        </button>
        {members.map((m) => (
          <button key={m.uid} type="button" aria-pressed={known.includes(m.uid)} onClick={() => toggle(m.uid)} className={`${chip(known.includes(m.uid))} inline-flex items-center gap-1`}>
            {known.includes(m.uid) && <Icon name="check" className="size-3.5" />}
            {m.name}
          </button>
        ))}
      </div>
    </Row>
  );
}

// Ana hesapta henüz çalışan yoksa: sorumlu seçimi yerine çalışan ekleme bağlantısı
export function NoStaffRow({ onAdd, compact }) {
  return (
    <button type="button" onClick={onAdd} className={`flex w-full items-center gap-3 text-left active:bg-bg ${compact ? "px-3.5 pb-3 pt-0.5" : "px-4 py-3"}`}>
      <Icon name="users" className={`${compact ? "size-4" : "size-5"} shrink-0 text-mut`} />
      <span className="min-w-0 flex-1 text-[0.875rem] text-mut">
        Sorumlu seçmek için önce kişi ekle
      </span>
      <span className="shrink-0 text-[0.875rem] font-semibold text-acc">Kişi ekle</span>
    </button>
  );
}

// editing: yalnızca alanlar (tür seçici yok). bare: kart çerçevesi yok. noRemove: kaldır düğmesi yok.
// assign: ana hesabın çalışanları; verilirse "Sorumlu" satırı çıkar (kayıt seçilen çalışanlara atanır, onlar da görür)
export function DraftCard({ d, index, plan, editing, bare, noRemove, assign, onAddStaff, onChange, onType, onRemove }) {
  const set = (k) => (e) => onChange(index, { [k]: k === "title" ? cap(e.target.value) : e.target.value });
  const put = (patch) => onChange(index, patch);
  const allDay = !d.time;
  const multi = !!d.endDate;

  return (
    <div className={bare ? "" : "animate-pop mt-3"}>
      {!editing && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 rounded-xl bg-line/60 p-[0.1875rem]">
            {TYPES.map(([t, l, ic]) => (
              <button
                key={t}
                type="button"
                onClick={() => onType(index, t)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[0.5625rem] py-2 text-[0.875rem] font-medium transition ${d.type === t ? "bg-card text-fg shadow-sm" : "text-mut"}`}
              >
                <Icon name={ic} className="size-4" />
                {l}
              </button>
            ))}
          </div>
          {!noRemove && (
            <button type="button" onClick={() => onRemove(index)} aria-label="Kaldır" className="grid size-9 shrink-0 place-items-center rounded-full text-mut transition active:scale-90 active:bg-line">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        {/* Başlık */}
        <div className="px-4 py-3">
          <input
            value={d.title}
            onChange={set("title")}
            placeholder={TITLE_PH[d.type]}
            autoCapitalize="sentences"
            enterKeyHint="done"
            className="w-full bg-transparent text-[1.125rem] font-semibold tracking-tight text-fg outline-none placeholder:font-normal placeholder:text-mut/70"
          />
          {d.type === "note" && (
            <textarea
              value={d.body}
              onChange={set("body")}
              placeholder="Not"
              autoCapitalize="sentences"
              rows={4}
              className="mt-1.5 w-full resize-none bg-transparent text-[0.9375rem] leading-relaxed text-fg outline-none placeholder:text-mut/70"
            />
          )}
        </div>

        {d.type === "plan" && (
          <>
            <DateRow value={d.date} onChange={(v) => put({ date: v, ...(d.endDate && v > d.endDate ? { endDate: "" } : {}) })} warn label="Hangi gün?" />

            {multi ? (
              <Row icon="flag">
                <div className="flex items-center justify-between gap-2">
                  <Picker type="date" value={d.endDate} onChange={(v) => put({ endDate: v })} className="text-[0.9375rem] font-medium">
                    Bitiş: {dayLabel(d.endDate)}
                  </Picker>
                  <button type="button" onClick={() => put({ endDate: "" })} className="shrink-0 text-[0.8125rem] font-medium text-mut active:opacity-50">
                    Tek gün
                  </button>
                </div>
              </Row>
            ) : (
              <Row icon="clock" top>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.9375rem] font-medium">{allDay ? "Tüm gün" : d.time}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allDay}
                    aria-label="Tüm gün"
                    onClick={() => put(allDay ? { allDay: false, time: "09:00" } : { time: "", allDay: true })}
                    className="flex items-center gap-2 text-[0.8125rem] text-mut"
                  >
                    Tüm gün
                    <span className={`relative h-6 w-10 rounded-full transition ${allDay ? "bg-acc" : "bg-line"}`}>
                      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${allDay ? "left-[1.125rem]" : "left-0.5"}`} />
                    </span>
                  </button>
                </div>
                {!allDay && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {TIMES.map((t) => (
                      <button key={t} type="button" onClick={() => put({ time: t, allDay: false })} className={`${chip(d.time === t)} tabular-nums`}>
                        {t}
                      </button>
                    ))}
                    <Picker type="time" value={d.time} onChange={(v) => v && put({ time: v, allDay: false })} className={chip(d.time && !TIMES.includes(d.time))}>
                      <span className="tabular-nums">{d.time && !TIMES.includes(d.time) ? d.time : "Diğer"}</span>
                    </Picker>
                  </div>
                )}
              </Row>
            )}

            <Row icon="pin">
              <input
                value={d.place}
                onChange={set("place")}
                placeholder="Yer (isteğe bağlı)"
                autoCapitalize="words"
                className="w-full bg-transparent text-[0.9375rem] text-fg outline-none placeholder:text-mut"
              />
            </Row>

            {!multi && d.date && (
              <button type="button" onClick={() => put({ endDate: addDaysFrom(d.date, 1), time: "", allDay: true })} className="w-full px-4 py-3 text-left text-[0.875rem] font-medium text-acc active:bg-bg">
                + Birden fazla gün sürecek
              </button>
            )}
          </>
        )}

        {d.type === "task" && <DateRow value={d.date} onChange={(v) => put({ date: v })} optional label="Son tarih yok" />}

        {assign && !assign.length && onAddStaff && <NoStaffRow onAdd={onAddStaff} />}
        {assign?.length > 0 && <AssignRow value={d.assignees || []} members={assign} onChange={(v) => put({ assignees: v, _general: !v.length })} />}
      </div>

      {!editing && d.type !== "plan" && plan && (
        <button
          type="button"
          onClick={() => onChange(index, { link: !d.link })}
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.875rem] font-medium transition active:scale-95 ${d.link ? "bg-acc text-white" : "bg-card ring-1 ring-line"}`}
        >
          <Icon name="cal" className="size-4" />
          {d.link ? "Plana bağlı: " : "Plana bağla: "}
          {plan.title || "plan"}
        </button>
      )}
    </div>
  );
}

export function addDaysFrom(s, n) {
  const x = D(s);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
