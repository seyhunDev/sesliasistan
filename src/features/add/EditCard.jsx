"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { leftLabel } from "@/lib/agenda";
import { addDays, cap, short, todayStr } from "@/lib/utils/format";
import { Picker, TIMES, addDaysFrom, chip, dayLabel, saturday } from "./DraftCard";

const D = (s) => new Date(`${s}T00:00`);
// "14:05" (bugün), "dün 18:20", "27 Eyl 09:10"
export function stamp(iso) {
  const t = new Date(iso);
  const hm = t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const day = (x) => new Date(x).toDateString();
  if (day(t) === day(Date.now())) return hm;
  if (day(t) === day(Date.now() - 864e5)) return `dün ${hm}`;
  return `${t.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${hm}`;
}
const spanDays = (a, b) => Math.round((D(b) - D(a)) / 864e5) + 1;

// Başlık alanı: yazdıkça uzar (tek satıra sıkışmaz)
function Grow({ value, onChange, className, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={onChange} className={`block w-full resize-none overflow-hidden bg-transparent outline-none ${className}`} {...rest} />;
}

// Ayrıntı satırı: solda simge + ad, sağda değer; dokununca yalnızca bu satırın seçenekleri açılır
function Row({ icon, label, value, tone, open, onToggle, children }) {
  const expandable = !!onToggle;
  return (
    <li className="border-b border-line">
      <button
        type="button"
        onClick={onToggle}
        disabled={!expandable}
        className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left transition active:bg-bg disabled:active:bg-transparent"
      >
        <Icon name={icon} className="size-5 shrink-0 text-mut" />
        <span className="shrink-0 text-[0.9375rem]">{label}</span>
        <span className={`ml-auto min-w-0 truncate text-right text-[0.9375rem] ${tone || "text-mut"}`}>{value}</span>
        {expandable && <Icon name="chev" className={`size-4 shrink-0 text-mut/70 transition-transform ${open ? "rotate-90" : ""}`} />}
      </button>
      {open && <div className="animate-pop px-4 pb-3.5 pl-12">{children}</div>}
    </li>
  );
}

// Tarih seçenekleri: hızlı günler + takvim (+ isteğe bağlı kaldır)
function DayChips({ value, onPick, onClear }) {
  const quick = [["Bugün", todayStr()], ["Yarın", addDays(1)], ["Cumartesi", saturday()]];
  const custom = value && !quick.some(([, v]) => v === value);
  return (
    <div className="flex flex-wrap gap-1.5">
      {quick.map(([l, v]) => (
        <button key={l} type="button" onClick={() => onPick(v)} className={chip(value === v)}>
          {l}
        </button>
      ))}
      <Picker type="date" value={value} onChange={(v) => v && onPick(v)} className={chip(custom)}>
        {custom ? dayLabel(value).replace(/^(Bugün|Yarın) · /, "") : "Tarih seç"}
      </Picker>
      {onClear && value && (
        <button type="button" onClick={onClear} className="shrink-0 rounded-full px-3 py-1.5 text-[0.875rem] font-medium text-rec active:opacity-60">
          Kaldır
        </button>
      )}
    </div>
  );
}

// Kaydı düzenleme: büyük başlık, altında tek satırlık ayrıntılar (iPhone Hatırlatıcılar / Takvim gibi).
// d: taslak, onChange(patch). meta: "Ali ekledi · dün". done/onToggleDone: yalnızca görev.
// assign: ana hesabın çalışanları (boşsa "Çalışan ekle"), çalışan hesabında null (satır gösterilmez).
// acks: kayıtlı sorumluların durumu [{ uid, name, key, label, at }] (ana hesapta gösterilir)
export function EditCard({ d, meta, planTitle, done, pinned, cancelled, repeat, onToggleDone, assign, onAddStaff, onChange, acks = [] }) {
  const [open, setOpen] = useState(""); // açık satır
  const toggle = (k) => () => setOpen((o) => (o === k ? "" : k));
  const put = (patch, close = true) => {
    onChange(patch);
    if (close) setOpen("");
  };
  const today = todayStr();
  const multi = !!d.endDate;
  const names = (d.assignees || []).map((u) => assign?.find((m) => m.uid === u)?.name).filter(Boolean);

  const rel = (v) => (v && v >= today ? leftLabel(v, today) : "");

  // Sorumlu satırı ve sorumluların durumu: not ve diğer kayıtlarda aynı
  const who = assign && assign.length > 0 && (
    <Row
      icon="users"
      label="Sorumlu"
      value={names.length ? names.join(", ") : "Genel"}
      tone={names.length ? "font-medium text-acc" : undefined}
      open={open === "who"}
      onToggle={toggle("who")}
    >
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => put({ assignees: [], _general: true }, false)} className={chip(!names.length)}>
          Genel
        </button>
        {assign.map((m) => {
          const on = (d.assignees || []).includes(m.uid);
          return (
            <button
              key={m.uid}
              type="button"
              aria-pressed={on}
              onClick={() => put({ assignees: on ? d.assignees.filter((u) => u !== m.uid) : [...(d.assignees || []), m.uid], _general: false }, false)}
              className={`${chip(on)} inline-flex items-center gap-1`}
            >
              {on && <Icon name="check" className="size-3.5" />}
              {m.name}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[0.8125rem] text-mut">Birden fazla kişi seçebilirsin; seçilenler bu kaydı kendi listesinde görür.</p>
    </Row>
  );
  const ackList = acks.length > 0 && (
    <div className="mt-3 rounded-2xl bg-card px-4 py-2.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
    {acks.map((a) => (
      <p key={a.uid} className="flex items-center gap-2 py-1 text-[0.875rem]">
        <Icon
          name={a.key === "sent" || a.key === "pending" || a.key === "done" ? "check" : "checks"}
          className={`size-4 shrink-0 [stroke-width:2.5] ${a.key === "done" ? "text-ok" : a.key === "read" ? "text-sky-600" : a.key === "pending" ? "text-line" : "text-mut"}`}
        />
        <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
        <span className={`shrink-0 text-[0.8125rem] ${a.key === "done" ? "font-semibold text-ok" : a.key === "read" ? "font-medium text-sky-700" : "text-mut"}`}>
          {a.label}
          {a.at ? ` · ${stamp(a.at)}` : ""}
        </span>
      </p>
    ))}
  </div>
  );

  const addStaffRow = assign && !assign.length && onAddStaff && (
    <li className="border-b border-line">
      <button type="button" onClick={onAddStaff} className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left active:bg-bg">
        <Icon name="users" className="size-5 shrink-0 text-mut" />
        <span className="text-[0.9375rem]">Sorumlu</span>
        <span className="ml-auto text-[0.9375rem] font-medium text-acc">Kişi ekle</span>
      </button>
    </li>
  );

  // Plan: ne, ne zaman, nerede tek kartta (büyük başlık, altında tarih/süre/saat/yer satırları);
  // altında küçük bilgi satırı (iptal, her hafta, kategori, kim ekledi); sorumlu ve bağlı kayıt ayrı kartta
  if (d.type === "plan")
    return (
      <div className="pb-2">
        <div className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
          <div className="px-4 pb-3 pt-3.5">
            <Grow
              value={d.title}
              onChange={(e) => onChange({ title: cap(e.target.value) })}
              placeholder="Başlık"
              autoCapitalize="sentences"
              enterKeyHint="done"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
              className={`text-[1.375rem] font-semibold leading-snug tracking-tight placeholder:text-mut/60 ${cancelled ? "text-mut line-through" : "text-fg"}`}
            />
          </div>
          <ul className="border-t border-line [&>li:last-child]:border-b-0">
            <Row
              icon="cal"
              label={multi ? "Başlangıç" : "Tarih"}
              value={d.date ? dayLabel(d.date) : "Seçilmedi"}
              tone={d.date ? "text-fg" : "font-medium text-amber-700"}
              open={open === "date"}
              onToggle={toggle("date")}
            >
              <DayChips value={d.date} onPick={(v) => put({ date: v, ...(d.endDate && v > d.endDate ? { endDate: "" } : {}) })} />
              {rel(d.date) && <p className="mt-2 text-[0.8125rem] text-mut">{rel(d.date)}</p>}
            </Row>
            <Row
              icon="flag"
              label="Süre"
              value={multi ? `${spanDays(d.date, d.endDate)} gün · ${short(d.endDate)} bitiyor` : "Tek gün"}
              tone={multi ? "text-fg" : undefined}
              open={open === "span"}
              onToggle={d.date ? toggle("span") : undefined}
            >
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => put({ endDate: "" })} className={chip(!multi)}>
                  Tek gün
                </button>
                {[2, 3, 7].map((n) => {
                  const end = addDaysFrom(d.date, n - 1);
                  return (
                    <button key={n} type="button" onClick={() => put({ endDate: end, time: "", allDay: true })} className={chip(d.endDate === end)}>
                      {n} gün
                    </button>
                  );
                })}
                <Picker type="date" value={d.endDate} onChange={(v) => v && v > d.date && put({ endDate: v, time: "", allDay: true })} className={chip(false)}>
                  Bitiş seç
                </Picker>
              </div>
            </Row>
            {!multi && (
              <Row icon="clock" label="Saat" value={d.time || "Tüm gün"} tone={d.time ? "text-fg tabular-nums" : undefined} open={open === "time"} onToggle={toggle("time")}>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => put({ time: "", allDay: true })} className={chip(!d.time)}>
                    Tüm gün
                  </button>
                  {TIMES.map((t) => (
                    <button key={t} type="button" onClick={() => put({ time: t, allDay: false })} className={`${chip(d.time === t)} tabular-nums`}>
                      {t}
                    </button>
                  ))}
                  <Picker type="time" value={d.time} onChange={(v) => v && put({ time: v, allDay: false }, false)} className={chip(d.time && !TIMES.includes(d.time))}>
                    <span className="tabular-nums">{d.time && !TIMES.includes(d.time) ? d.time : "Diğer"}</span>
                  </Picker>
                </div>
              </Row>
            )}
            <li className="border-b border-line">
              <label className="flex min-h-[3.25rem] items-center gap-3 px-4">
                <Icon name="pin" className="size-5 shrink-0 text-mut" />
                <span className="shrink-0 text-[0.9375rem]">Yer</span>
                <input
                  value={d.place}
                  onChange={(e) => onChange({ place: e.target.value })}
                  placeholder="Ekle"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  className="min-w-0 flex-1 bg-transparent text-right text-[0.9375rem] text-fg outline-none placeholder:text-mut"
                />
              </label>
            </li>
          </ul>
        </div>
        {(meta || (d.cat && d.cat !== "Genel") || cancelled || repeat) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[0.8125rem] text-mut">
            {cancelled && <span className="rounded-full bg-rec/10 px-2 py-0.5 text-[0.75rem] font-semibold text-rec">İptal edildi</span>}
            {repeat && (
              <span className="inline-flex items-center gap-1 font-medium text-fg/80">
                <Icon name="repeat" className="size-3.5" />
                {repeat}
              </span>
            )}
            {d.cat && d.cat !== "Genel" && <span className="rounded-full bg-acc/10 px-2 py-0.5 text-[0.75rem] font-medium text-acc">{d.cat}</span>}
            {meta && <span>{meta}</span>}
          </p>
        )}
        {repeat && <p className="mt-1 px-1 text-[0.75rem] text-mut">Değişiklik yalnız bu haftaya uygulanır.</p>}
        {((assign && assign.length > 0) || (assign && onAddStaff) || planTitle) && (
          <ul className="mt-4 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)] [&>li:last-child]:border-b-0">
            {who}
            {addStaffRow}
            {planTitle && <Row icon="cal" label="Bağlı plan" value={planTitle} tone="text-fg" />}
          </ul>
        )}
        {ackList}
      </div>
    );

  // Not: kısa içerik tek kartta (başlık büyük, metin hemen altında); kim/ne zaman ve etiket küçük, kartın altında
  if (d.type === "note")
    return (
      <div className="pb-2">
        <div className="rounded-2xl bg-card px-4 pb-4 pt-3.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
          <Grow
            value={d.title}
            onChange={(e) => onChange({ title: cap(e.target.value) })}
            placeholder="Başlık"
            autoCapitalize="sentences"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
            className="text-[1.375rem] font-semibold leading-snug tracking-tight text-fg placeholder:text-mut/60"
          />
          <Grow
            value={d.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Ayrıntı ekle"
            autoCapitalize="sentences"
            className="mt-2 min-h-[1.75rem] text-[1.0625rem] leading-relaxed text-fg/85 placeholder:text-mut/60"
          />
        </div>
        {(meta || d.cat || pinned) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[0.8125rem] text-mut">
            {pinned && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                <Icon name="star" className="size-3.5" />
                Sabit
              </span>
            )}
            {d.cat && <span className="rounded-full bg-acc/10 px-2 py-0.5 text-[0.75rem] font-medium text-acc">{d.cat}</span>}
            {meta && <span>{meta}</span>}
          </p>
        )}
        {((assign && assign.length > 0) || planTitle) && (
          <ul className="mt-4 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)] [&>li:last-child]:border-b-0">
            {who}
            {planTitle && <Row icon="cal" label="Bağlı plan" value={planTitle} tone="text-fg" />}
          </ul>
        )}
        {ackList}
      </div>
    );

  return (
    <div className="pb-4">
      {/* Başlık */}
      <div className="flex items-start gap-3 pt-1">
        {d.type === "task" && (
          <button
            type="button"
            onClick={onToggleDone}
            aria-label={done ? "Yeniden aç" : "Yapıldı olarak işaretle"}
            className={`mt-1 grid size-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${done ? "border-ok bg-ok text-white" : "border-mut/50 text-transparent"}`}
          >
            <Icon name="check" className="size-4 [stroke-width:3]" />
          </button>
        )}
        <Grow
          value={d.title}
          onChange={(e) => onChange({ title: cap(e.target.value) })}
          placeholder="Başlık"
          autoCapitalize="sentences"
          enterKeyHint="done"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
          className={`text-[1.5rem] font-semibold leading-tight tracking-tight placeholder:text-mut/60 ${done ? "text-mut line-through" : "text-fg"}`}
        />
      </div>
      {meta && <p className={`mt-1.5 text-[0.8125rem] text-mut ${d.type === "task" ? "pl-10" : ""}`}>{meta}</p>}

      {/* Ayrıntılar */}
      <ul className="mt-5 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)] [&>li:last-child]:border-b-0">

        {d.type === "task" && (
          <Row
            icon="cal"
            label="Son tarih"
            value={d.date ? dayLabel(d.date) : "Yok"}
            tone={d.date ? (d.date < today && !done ? "font-medium text-rec" : "text-fg") : undefined}
            open={open === "date"}
            onToggle={toggle("date")}
          >
            <DayChips value={d.date} onPick={(v) => put({ date: v })} onClear={() => put({ date: "" })} />
          </Row>
        )}

        {who}
        {addStaffRow}

        {planTitle && <Row icon="cal" label="Bağlı plan" value={planTitle} tone="text-fg" />}
      </ul>

      {ackList}
    </div>
  );
}
