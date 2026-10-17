"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { exById } from "@/lib/fitness/exercises";
import { DOWS, DOW_LONG, GOALS, PARTS, REVIEW_ASK, REVIEW_ROWS, SPORTS, cleanItem, cleanProgram, itemLine, labelOf, restOf, setRestAll, toName } from "@/lib/fitness/model";
import { editProgram } from "./fitImport";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseMedia } from "./ExerciseMedia";
import { YtEdit } from "./YtVideo";
import { libNo, withLib } from "@/lib/fitness/library";
import { useFitLib } from "./useFitLib";

// Program düzenleme (yapay zekanın hazırladığı önizleme ya da kayıtlı program). Üstte özet (ad, gün/hafta, dakika, hafta,
// başlangıç), altında haftanın günleri şeridi: antrenman günü dokununca açılır, boş güne dokununca o güne antrenman eklenir.
// Seçili günün hareketleri kart kart; dokununca − / + ile set, tekrar/süre (aralık), kilo, çanta ağırlığı, dinlenme,
// her yan için, bölüm, nefes, tempo, zorluk, not, kolay seçenek; sıralama, çıkarma.
// Yazılı değişiklik yapay zekaya da gönderilir ("Yapay zekayla değiştir"); fitness sayfalarında sesli asistan yok.
const n = (v) => (v === "" || v == null ? 0 : +String(v).replace(",", ".") || 0);
const GROUP_ICON = { Kardiyo: "flame", Esneme: "wind", Karın: "zap", "Tüm vücut": "spark", Bacak: "trend", Kalça: "trend" };
const iconOf = (it) => (it.kind === "cardio" ? "flame" : GROUP_ICON[exById(it.ex)?.group] || "dumbbell");
const setsOf = (items = []) => items.reduce((s, it) => s + (it.kind === "cardio" ? 0 : n(it.sets)), 0);
const groupsOf = (items = []) => [...new Set(items.map((it) => exById(it.ex)?.group).filter((g) => g && g !== "Esneme"))];

function Step({ label, value, onChange, step = 1, min = 0, max = 999, unit, dec }) {
  const v = n(value);
  const put = (x) => onChange(Math.min(max, Math.max(min, Math.round(x * 10) / 10)));
  return (
    <div className="min-w-0 rounded-2xl bg-bg p-1.5">
      <small className="block pb-1 text-center text-[0.6875rem] font-semibold text-mut">{label}</small>
      <div className="flex items-center">
        <button type="button" aria-label={`${label} azalt`} onClick={() => put(v - step)} className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-fg shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
          <Icon name="minus" className="size-4" />
        </button>
        <span className="flex min-w-0 flex-1 items-baseline justify-center">
          <input
            inputMode={dec ? "decimal" : "numeric"}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value.replace(",", "."))}
            aria-label={label}
            className="w-full min-w-0 bg-transparent text-center text-[1.0625rem] font-bold tabular-nums outline-none"
          />
          {unit && <small className="-ml-1 pr-1 text-[0.6875rem] text-mut">{unit}</small>}
        </span>
        <button type="button" aria-label={`${label} artır`} onClick={() => put(v + step)} className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-fg shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
          <Icon name="plus" className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Chip({ children, tone }) {
  return <span className={`rounded-full px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums ${tone || "bg-bg text-fg"}`}>{children}</span>;
}

function ItemCard({ it: raw, i, count, open, onOpen, onChange, onMove, onDrop }) {
  // Fotoğraf/video ve YouTube hareket kütüphanesinde: aynı hareket hangi programda olursa olsun aynısı görünür
  const { lib, setMedia } = useFitLib();
  const it = withLib(raw, lib);
  const no = libNo(lib, raw);
  const set = (k, v) => onChange({ ...it, [k]: v });
  const setLib = (k, v) => {
    const next = { ...it, [k]: v };
    onChange(next);
    setMedia(raw, { yt: next.yt, media: next.media }).catch(() => {});
  };
  const ex = exById(it.ex);
  return (
    <li className={`rounded-2xl border transition ${open ? "border-acc bg-acc/[.04]" : "border-line bg-card"}`}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3 text-left">
        <span className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${open ? "bg-acc text-white" : "bg-acc/10 text-acc"}`}>
          <Icon name={iconOf(it)} className="size-5" />
          <b className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-deep text-[0.625rem] font-bold text-white">{i + 1}</b>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{it.name}</b>
          <span className="mt-1 flex flex-wrap gap-1">
            {no ? <Chip tone="bg-bg text-mut">No {no}</Chip> : null}
            <Chip tone="bg-acc/10 text-acc">{itemLine(it).split(" · ")[0]}</Chip>
            {it.kg ? <Chip>{String(it.kg).replace(".", ",")} kg</Chip> : null}
            {it.bag ? <Chip tone="bg-amber-500/15 text-amber-700 dark:text-amber-300">Çanta {String(it.bag).replace(".", ",")} kg</Chip> : null}
            {it.part && it.part !== "ana" ? <Chip tone="bg-bg text-mut">{labelOf(PARTS, it.part)}</Chip> : null}
            {it.breath ? <Chip tone="bg-sky-500/10 text-sky-700 dark:text-sky-300">Nefes</Chip> : null}
            {it.rest ? <Chip tone="bg-bg text-mut">{it.rest} sn dinlen</Chip> : null}
            {it.yt?.id ? (
              <Chip tone="bg-rec/10 text-rec">
                <Icon name="video" className="-mt-0.5 inline size-3.5" /> YouTube
              </Chip>
            ) : null}
            {it.media?.length ? (
              <Chip tone="bg-bg text-mut">
                <Icon name={it.media.some((m) => m.kind === "video") ? "video" : "camera"} className="-mt-0.5 inline size-3.5" /> {it.media.length}
              </Chip>
            ) : null}
          </span>
        </span>
        <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          {!ex && (
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-2xl bg-bg p-1">
              {[
                ["reps", "Tekrarlı"],
                ["time", "Süreli"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={it.kind === k}
                  onClick={() => onChange(k === "time" ? { ...it, kind: "time", sec: it.sec || 30, reps: undefined, repsTo: undefined, kg: undefined } : { ...it, kind: "reps", reps: it.reps || 10, sec: undefined, secTo: undefined })}
                  className={`h-9 rounded-xl text-[0.8125rem] font-semibold ${it.kind === k ? "bg-card text-fg shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]" : "text-mut"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {it.kind !== "cardio" && <Step label="Set" value={it.sets} min={1} max={10} onChange={(v) => set("sets", v)} />}
            {it.kind === "reps" && <Step label="Tekrar" value={it.reps} min={1} max={100} onChange={(v) => set("reps", v)} />}
            {it.kind === "reps" && <Step label="Tekrar en çok" value={it.repsTo} min={0} max={100} onChange={(v) => set("repsTo", v)} />}
            {it.kind === "time" && <Step label="Süre" unit="sn" value={it.sec} step={5} min={5} max={600} onChange={(v) => set("sec", v)} />}
            {it.kind === "time" && <Step label="Süre en çok" unit="sn" value={it.secTo} step={5} min={0} max={600} onChange={(v) => set("secTo", v)} />}
            {it.kind === "cardio" && <Step label="Süre" unit="dk" value={it.min} min={1} max={180} onChange={(v) => set("min", v)} />}
            {it.kind === "reps" && <Step label="Kilo (elde)" unit="kg" dec value={it.kg} step={2.5} max={500} onChange={(v) => set("kg", v)} />}
            <Step label="Çantaya ağırlık" unit="kg" dec value={it.bag} step={1} max={100} onChange={(v) => set("bag", v)} />
            <Step label="Dinlenme" unit="sn" value={it.rest} step={5} max={300} onChange={(v) => set("rest", v)} />
          </div>
          {it.kind !== "cardio" && (
            <label className="mt-2 flex h-11 items-center justify-between rounded-2xl bg-bg px-3 text-[0.875rem] font-semibold">
              Her yan için (sağ ve sol ayrı)
              <input type="checkbox" checked={!!it.side} onChange={(e) => set("side", e.target.checked)} className="size-5 accent-[var(--acc)]" />
            </label>
          )}
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-bg p-1">
            {PARTS.map(([k, l]) => {
              const on = (it.part || "ana") === k;
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => set("part", k)} className={`h-9 rounded-xl text-[0.8125rem] font-semibold ${on ? "bg-card text-fg shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]" : "text-mut"}`}>
                  {l}
                </button>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["breath", "Nefes", "4 sn al, 6 sn ver", 60],
              ["tempo", "Tempo", "3 sn iniş", 30],
              ["rpe", "Zorluk (RPE)", "6–7 · RIR 3", 20],
              ["alt", "Kolay seçenek", "Band yoksa…", 120],
            ].map(([k, l, ph, max]) => (
              <label key={k} className="block min-w-0 rounded-2xl bg-bg px-3 py-1.5">
                <small className="block text-[0.6875rem] font-semibold text-mut">{l}</small>
                <input value={it[k] || ""} maxLength={max} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="h-7 w-full min-w-0 bg-transparent text-[0.875rem] outline-none" />
              </label>
            ))}
          </div>
          <label className="mt-2 block rounded-2xl bg-bg px-3 py-1.5">
            <small className="block text-[0.6875rem] font-semibold text-mut">Not</small>
            <textarea value={it.note || ""} maxLength={200} rows={2} onChange={(e) => set("note", e.target.value)} placeholder="Diz ikinci parmağa, bel boşluğunu koru…" className="w-full resize-none bg-transparent text-[0.875rem] leading-snug outline-none" />
          </label>
          {ex?.how && (
            <p className="mt-2 flex gap-2 rounded-xl bg-bg px-3 py-2 text-[0.8125rem] leading-snug text-mut">
              <Icon name="spark" className="mt-0.5 size-3.5 shrink-0 text-acc" />
              {ex.how}
            </p>
          )}
          <ExerciseMedia media={it.media} ex={it.ex} edit onChange={(v) => setLib("media", v)} className="mt-2" />
          <YtEdit yt={it.yt} onChange={(v) => setLib("yt", v)} media={it.media} onMedia={(v) => setLib("media", v)} className="mt-2" />
          <p className="mt-1 text-[0.75rem] text-mut">Fotoğraf ve video bu hareketin geçtiği bütün programlarda görünür.</p>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" aria-label="Yukarı taşı" disabled={i === 0} onClick={() => onMove(-1)} className="grid size-9 place-items-center rounded-full bg-bg disabled:opacity-30">
              <Icon name="up" className="size-4" />
            </button>
            <button type="button" aria-label="Aşağı taşı" disabled={i === count - 1} onClick={() => onMove(1)} className="grid size-9 place-items-center rounded-full bg-bg disabled:opacity-30">
              <Icon name="up" className="size-4 rotate-180" />
            </button>
            <span className="flex-1" />
            <button type="button" onClick={onDrop} className="flex h-9 items-center gap-1.5 rounded-full bg-rec/10 px-3 text-[0.8125rem] font-semibold text-rec">
              <Icon name="trash" className="size-4" />
              Çıkar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function DayPanel({ d, onChange, onDrop }) {
  const [pick, setPick] = useState(false);
  const [open, setOpen] = useState(-1);
  const set = (k, v) => onChange({ ...d, [k]: v });
  const items = d.items || [];
  const setItem = (i, v) => set("items", items.map((x, k) => (k === i ? v : x)));
  const move = (i, dir) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("items", next);
    setOpen(i + dir);
  };
  const groups = groupsOf(items);
  return (
    <section className={`${card} mt-3 p-4`}>
      <small className="block text-[0.75rem] font-bold tracking-[.06em] text-acc">{DOW_LONG[d.dow].toLocaleUpperCase("tr")}</small>
      <input value={d.name} onChange={(e) => set("name", e.target.value)} aria-label="Günün adı" placeholder="Günün adı" className="mt-0.5 block w-full bg-transparent text-[1.375rem] font-bold leading-tight tracking-tight outline-none" />
      {groups.length > 0 && <span className="mt-1 block text-[0.8125rem] text-mut">{groups.join(" · ")}</span>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-bg px-3">
          <Icon name="clock" className="size-4 shrink-0 text-mut" />
          <input type="time" value={d.time} onChange={(e) => set("time", e.target.value)} aria-label="Saat" className="h-full w-full min-w-0 appearance-none bg-transparent text-[0.9375rem] font-semibold outline-none" />
        </label>
        <div className="flex h-12 items-center rounded-2xl bg-bg px-1.5">
          <button type="button" aria-label="Süreyi azalt" onClick={() => set("min", Math.max(15, n(d.min) - 15))} className="grid size-9 place-items-center rounded-xl bg-card shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
            <Icon name="minus" className="size-4" />
          </button>
          <b className="flex-1 text-center text-[0.9375rem] tabular-nums">
            {n(d.min)} <small className="font-medium text-mut">dk</small>
          </b>
          <button type="button" aria-label="Süreyi artır" onClick={() => set("min", Math.min(180, n(d.min) + 15))} className="grid size-9 place-items-center rounded-xl bg-card shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
            <Icon name="plus" className="size-4" />
          </button>
        </div>
      </div>

      <label className="mt-2 block rounded-2xl bg-bg px-3 py-1.5">
        <small className="block text-[0.6875rem] font-semibold text-mut">Günün notu</small>
        <textarea value={d.note || ""} maxLength={300} rows={2} onChange={(e) => set("note", e.target.value)} placeholder="2 tur, geçiş 20 sn · yalnız yeşil günde…" className="w-full resize-none bg-transparent text-[0.875rem] leading-snug outline-none" />
      </label>

      <div className="mb-2 mt-4 flex items-baseline justify-between">
        <b className="text-[0.8125rem] font-bold tracking-[.06em] text-mut">HAREKETLER</b>
        <small className="text-[0.8125rem] text-mut">
          {items.length} hareket{setsOf(items) ? ` · ${setsOf(items)} set` : ""}
        </small>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((it, i) => (
          <ItemCard
            key={`${it.ex || it.name}-${i}`}
            it={it}
            i={i}
            count={items.length}
            open={open === i}
            onOpen={() => setOpen((o) => (o === i ? -1 : i))}
            onChange={(v) => setItem(i, v)}
            onMove={(dir) => move(i, dir)}
            onDrop={() => {
              set("items", items.filter((_, k) => k !== i));
              setOpen(-1);
            }}
          />
        ))}
      </ul>
      <button type="button" onClick={() => setPick(true)} className="mt-2 flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-acc/30 text-[0.9375rem] font-semibold text-acc">
        <Icon name="plus" className="size-4" />
        Hareket ekle
      </button>
      <button type="button" onClick={onDrop} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 text-[0.8125rem] font-semibold text-mut">
        <Icon name="trash" className="size-3.5" />
        {DOW_LONG[d.dow]} antrenmanını kaldır
      </button>
      <ExercisePicker
        open={pick}
        onClose={() => setPick(false)}
        onPick={(e) => {
          set("items", [...items, cleanItem(e.custom ? { ex: "", name: e.name } : { ex: e.id })].filter(Boolean));
          setOpen(items.length);
        }}
      />
    </section>
  );
}

// Haftalara göre evreler (salt okunur) ve programın kuralları (ilerleme, güvenlik, trafik ışığı); kurallar düzenlenir
// Toplu dinlenme: değişince bütün programdaki hareketlere uygulanır; tek tek değiştirmek hareketin içinden
function RestAll({ p, onChange }) {
  const [typed, setTyped] = useState(null);
  const put = (x) => {
    if (typeof x === "string") setTyped(x);
    if (+x >= 5) onChange((q) => setRestAll(q, x));
  };
  return (
    <section className={`${card} mt-3 flex items-center gap-3 p-3`}>
      <span className="min-w-0 flex-1 pl-1">
        <b className="block text-[0.9375rem] font-semibold">Dinlenme</b>
        <small className="block text-[0.8125rem] text-mut">Bütün hareketler</small>
      </span>
      <span className="w-44 shrink-0" onBlur={() => setTyped(null)}>
        <Step label="Setler arası" unit="sn" value={typed ?? restOf(p)} step={5} min={5} max={300} onChange={put} />
      </span>
    </section>
  );
}

function PlanNotes({ p, onChange }) {
  const phases = p.phases || [];
  return (
    <section className={`${card} mt-3 p-4`}>
      {phases.length > 0 && (
        <>
          <b className="text-[0.8125rem] font-bold tracking-[.06em] text-mut">HAFTALAR</b>
          <ul className="mt-2 flex flex-col gap-1.5">
            {phases.map((x) => (
              <li key={`${x.from}-${x.to}`} className="rounded-2xl bg-bg px-3 py-2">
                <b className="text-[0.875rem]">
                  {x.from === x.to ? `${x.from}. hafta` : `${x.from}–${x.to}. hafta`} · {x.name}
                  {x.sets ? <small className="font-medium text-mut"> · setler %{x.sets}</small> : null}
                </b>
                {x.note && <small className="block text-[0.8125rem] leading-snug text-mut">{x.note}</small>}
              </li>
            ))}
          </ul>
        </>
      )}
      <label className={`block ${phases.length ? "mt-3" : ""}`}>
        <b className="text-[0.8125rem] font-bold tracking-[.06em] text-mut">KURALLAR VE NOTLAR</b>
        <textarea
          value={p.rules || ""}
          maxLength={1500}
          rows={p.rules ? 6 : 2}
          onChange={(e) => onChange((x) => ({ ...x, rules: e.target.value }))}
          placeholder="İlerleme, ağrıda ne yapılır, nefes, günlük esneme…"
          className="mt-1.5 w-full resize-y rounded-2xl bg-bg px-3 py-2 text-[0.875rem] leading-snug outline-none"
        />
      </label>
    </section>
  );
}

// Haftalık takip listesi (sporcunun Değerlendirme sayfası): gösterge · hedef · kayıt ("saat", "/ 2", "Evet / Hayır") ve pazar soruları
function TrackEdit({ p, onChange }) {
  const t = p.review || { rows: [], ask: [] };
  const set = (f) => onChange((x) => ({ ...x, review: f(x.review || { rows: [], ask: [] }) }));
  const row = (i, k, v) => set((r) => ({ ...r, rows: r.rows.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const inp = "min-w-0 rounded-xl bg-bg px-2.5 py-2 text-[0.875rem] outline-none";
  return (
    <section className={`${card} mt-3 p-4`}>
      <b className="text-[0.8125rem] font-bold tracking-[.06em] text-mut">HAFTALIK TAKİP</b>
      <ul className="mt-2 flex flex-col gap-2">
        {t.rows.map((x, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
              <input value={x.label} maxLength={40} onChange={(e) => row(i, "label", e.target.value)} placeholder="Gösterge" className={inp} />
              <input value={x.unit} maxLength={20} onChange={(e) => row(i, "unit", e.target.value)} placeholder="Kayıt" className={inp} />
              <input value={x.goal} maxLength={80} onChange={(e) => row(i, "goal", e.target.value)} placeholder="Hedef" className={`${inp} col-span-2`} />
            </span>
            <button type="button" aria-label="Satırı sil" onClick={() => set((r) => ({ ...r, rows: r.rows.filter((_, j) => j !== i) }))} className="grid size-9 shrink-0 place-items-center rounded-full text-mut">
              <Icon name="x" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {t.rows.length < REVIEW_ROWS && (
        <button type="button" onClick={() => set((r) => ({ ...r, rows: [...r.rows, { label: "", goal: "", unit: "" }] }))} className="mt-2 h-10 w-full rounded-xl bg-bg text-[0.875rem] font-semibold text-acc">
          Satır ekle
        </button>
      )}
      <label className="mt-3 block">
        <b className="text-[0.8125rem] font-bold tracking-[.06em] text-mut">PAZAR SORULARI</b>
        <textarea
          value={(t.ask || []).join("\n")}
          rows={Math.max(2, (t.ask || []).length + 1)}
          onChange={(e) => set((r) => ({ ...r, ask: e.target.value.split("\n").slice(0, REVIEW_ASK) }))}
          className="mt-1.5 w-full resize-y rounded-2xl bg-bg px-3 py-2 text-[0.875rem] leading-snug outline-none"
        />
      </label>
    </section>
  );
}

// Programa yazılı değişiklik: yapay zeka bütün programı yeni hâliyle döndürür; kimin için, başlangıç ve kayıt bilgisi korunur
function AiEdit({ p, onChange }) {
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await editProgram(p, ask, { age: p.forAge, sport: p.sport });
      if (!r.program?.days?.length) throw new Error(r.message || "Değişiklik yapılamadı");
      const keep = {};
      for (const k of ["id", "for", "forName", "forAge", "sport", "start", "plansAt", "notifiedAt", "template", "createdAt"]) if (p[k] != null) keep[k] = p[k];
      onChange({ ...cleanProgram({ ...r.program, start: p.start }), ...keep });
      setMsg(r.message || "Değiştirdim. Kontrol edip kaydet.");
      setAsk("");
    } catch (e) {
      setErr(e.message || "Değişiklik yapılamadı, tekrar dene.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={`${card} mt-3 p-4`}>
      <b className="flex items-center gap-1.5 text-[0.8125rem] font-bold tracking-[.06em] text-mut">
        <Icon name="spark" className="size-4 text-acc" />
        YAPAY ZEKAYLA DEĞİŞTİR
      </b>
      <textarea
        value={ask}
        onChange={(e) => setAsk(e.target.value)}
        rows={3}
        maxLength={1500}
        placeholder="Perşembeyi 18:30'a al, squatta çantayı 4 kg yap, cuma gününü kaldır…"
        className="mt-2 w-full resize-none rounded-2xl bg-bg px-3 py-2 text-[0.9375rem] leading-snug outline-none"
      />
      {err && <p className="mt-1 text-[0.8125rem] font-semibold text-rec">{err}</p>}
      {msg && <p className="mt-1 text-[0.8125rem] text-acc">{msg}</p>}
      <Button loading={busy} disabled={busy || !ask.trim()} onClick={run} variant="ghost" className="mt-2 w-full">
        Değişikliği gönder
      </Button>
      <small className="mt-1 block text-center text-[0.75rem] text-mut">Yalnız yazdığın değişir; sonra kaydetmeyi unutma.</small>
    </section>
  );
}

// İlk antrenmanın günü: başlangıçtan itibaren programdaki ilk gün
function firstOf(p) {
  const d = new Date(`${p.start || new Date().toISOString().slice(0, 10)}T12:00`);
  for (let k = 0; k < 7; k++) {
    const dow = d.getDay() || 7;
    const day = p.days.find((x) => x.dow === dow);
    if (day) return { day, date: d };
    d.setDate(d.getDate() + 1);
  }
  return { day: p.days[0], date: null };
}
const dateText = (d) => {
  if (!d) return "";
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  const diff = Math.round((d - t) / 864e5);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
};

// Yapay zekanın hazırladığı yeni programın ilk görüntüsü: çok sade. Yalnız ilk antrenman ve tek düğme;
// bütün program (günler, düzenleme) "Tüm programı gör"de.
function Ready({ p, busy, onStart, onAll, onCancel }) {
  const { day, date } = firstOf(p);
  const items = day?.items || [];
  return (
    <div>
      <p className="mt-1 text-[0.9375rem] text-mut">
        Haftada {p.days.length} gün · {n(p.weeks)} hafta
      </p>

      {day && (
        <section className={`${card} mt-4 p-5`}>
          <small className="block text-[0.75rem] font-bold tracking-[.06em] text-acc">{p.forName ? `İLK ANTRENMANI · ${p.forName.toLocaleUpperCase("tr-TR")}` : "İLK ANTRENMANIN"}</small>
          <h3 className="mt-1 text-[1.5rem] font-bold leading-tight tracking-tight">{day.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[0.875rem] text-mut">
            <Icon name="cal" className="size-4" />
            {[dateText(date), day.time, `${n(day.min)} dk`].filter(Boolean).join(" · ")}
          </p>
          <ul className="mt-4 divide-y divide-line">
            {items.map((it, i) => (
              <li key={`${it.ex || it.name}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                  <Icon name={iconOf(it)} className="size-[1.125rem]" />
                </span>
                <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{it.name}</b>
                <small className="shrink-0 text-[0.875rem] font-semibold tabular-nums text-mut">{itemLine(it).split(" · ")[0]}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-[var(--stage-h,6rem)] z-10 -mx-5 mt-5 flex flex-col gap-1 bg-bg/95 px-5 pb-2 pt-3 backdrop-blur">
        <Button loading={busy === "plans"} disabled={!!busy || !p.days.length} onClick={onStart}>
          <Icon name="check" className="size-5" />
          {p.forName ? `Kaydet, ${p.forName} görsün` : "Tamam, başlayalım"}
        </Button>
        <button type="button" disabled={!!busy} onClick={onAll} className="h-11 text-[0.9375rem] font-semibold text-acc">
          Tüm programı gör
        </button>
        <button type="button" disabled={!!busy} onClick={onCancel} className="h-9 text-[0.8125rem] font-semibold text-mut">
          Vazgeç
        </button>
      </div>
    </div>
  );
}

// Sporcu için hazırlanan program: koyu özet (kime, yaşı, sporu, hedefi, gün/hafta, başlangıç), günler tek tek
// (dokununca o gün düzenlenir) ve tek düğme: kaydeder, sporcunun takvimine ekler, sporcuya bildirim gider.
function AthleteReady({ p, busy, onStart, onDay, onCancel }) {
  const start = p.start ? new Date(`${p.start}T12:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) : "";
  return (
    <div>
      <section className="mt-2 rounded-[1.5rem] bg-deep px-5 py-4 text-white">
        <h3 className="text-[1.375rem] font-bold leading-tight tracking-tight">{p.forName}</h3>
        <p className="mt-1 text-[0.875rem] text-white/80">{[p.forAge ? `${p.forAge} yaş` : "", p.sport ? labelOf(SPORTS, p.sport) : "", p.goal ? labelOf(GOALS, p.goal) : ""].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 text-[0.875rem] text-white/80">{[`Haftada ${p.days.length} gün`, `${n(p.weeks)} hafta`, start && `başlangıç ${start}`].filter(Boolean).join(" · ")}</p>
      </section>
      <ul className={`${card} mt-3 divide-y divide-line px-4`}>
        {p.days.map((d) => (
          <li key={d.dow}>
            <button type="button" onClick={() => onDay(d.dow)} className="flex w-full items-center gap-2 py-3.5 text-left">
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
                <b className="font-semibold">{[DOWS[d.dow], d.time].filter(Boolean).join(" ")}</b> · {d.name}
              </span>
              <small className="shrink-0 text-[0.8125rem] text-mut">{(d.items || []).length} hareket</small>
              <Icon name="chev" className="size-4 shrink-0 text-mut" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-[0.8125rem] text-mut">Bir güne dokununca hareketleri değiştirirsin.</p>
      <div className="sticky bottom-[var(--stage-h,6rem)] z-10 -mx-5 mt-5 flex flex-col gap-1 bg-bg/95 px-5 pb-2 pt-3 backdrop-blur">
        <Button loading={busy === "plans"} disabled={!!busy || !p.days.length} onClick={onStart}>
          <Icon name="check" className="size-5" />
          {`Kaydet ve ${toName(p.forName)} gönder`}
        </Button>
        <button type="button" disabled={!!busy} onClick={onCancel} className="h-10 text-[0.875rem] font-semibold text-mut">
          Vazgeç
        </button>
      </div>
    </div>
  );
}

// prog: { id?, title, weeks, start, days, note, plansAt }. onSave(prog, addPlans)
export function ProgramEditor({ prog, onSave, onCancel, busy, fresh, simple }) {
  const [p, setP] = useState(prog);
  const [all, setAll] = useState(!simple);
  const [sel, setSel] = useState(prog.days[0]?.dow || 0);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const used = p.days.map((d) => d.dow);
  const day = p.days.find((d) => d.dow === sel) || p.days[0];
  const addDay = (dow) => {
    const base = day || p.days[0];
    set("days", [...p.days, { dow, time: base?.time || "", min: base?.min || 45, name: "Yeni gün", items: [cleanItem({ ex: "warmup", min: 5 })] }].sort((a, b) => a.dow - b.dow));
    setSel(dow);
  };
  const dropDay = (dow) => {
    const rest = p.days.filter((d) => d.dow !== dow);
    set("days", rest);
    setSel(rest[0]?.dow || 0);
  };
  const avgMin = p.days.length ? Math.round(p.days.reduce((s, d) => s + n(d.min), 0) / p.days.length) : 0;
  const total = p.days.length * n(p.weeks);
  const onCal = !!p.plansAt;
  if (!all && p.for) return <AthleteReady p={p} busy={busy} onStart={() => onSave(p, true)} onDay={(dow) => (setSel(dow), setAll(true))} onCancel={onCancel} />;
  if (!all) return <Ready p={p} busy={busy} onStart={() => onSave(p, true)} onAll={() => setAll(true)} onCancel={onCancel} />;
  return (
    <div>
      <section className="mt-2 overflow-hidden rounded-[1.75rem] bg-deep px-5 pb-5 pt-4 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.6875rem] font-bold tracking-[.06em] text-white/85">
          <Icon name={fresh ? "spark" : "edit"} className="size-3.5" />
          {fresh ? "HAZIR · HENÜZ KAYDEDİLMEDİ" : "PROGRAMI DÜZENLE"}
        </span>
        <label className="mt-2 flex items-start gap-2">
          <input value={p.title} onChange={(e) => set("title", e.target.value)} aria-label="Program adı" className="block min-w-0 flex-1 bg-transparent text-[1.625rem] font-bold leading-tight tracking-tight outline-none" />
          <Icon name="edit" className="mt-2 size-4 shrink-0 text-white/50" />
        </label>
        {p.note && <p className="mt-1.5 text-[0.8125rem] leading-snug text-white/75">{p.note}</p>}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [p.days.length, "gün / hafta"],
            [avgMin, "dk / antrenman"],
            [n(p.weeks), "hafta"],
          ].map(([v, l]) => (
            <span key={l} className="rounded-2xl bg-white/10 px-2 py-2.5 text-center">
              <b className="block text-[1.375rem] font-bold leading-none tabular-nums">{v}</b>
              <small className="mt-1 block text-[0.6875rem] text-white/70">{l}</small>
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block rounded-2xl bg-white/10 px-3 py-1.5">
            <small className="block text-[0.6875rem] text-white/70">Başlangıç</small>
            <input type="date" value={p.start} onChange={(e) => set("start", e.target.value)} className="h-7 w-full min-w-0 appearance-none bg-transparent text-[0.9375rem] font-semibold text-white outline-none [color-scheme:dark]" />
          </label>
          <div className="flex items-center gap-1 rounded-2xl bg-white/10 px-1.5">
            <button type="button" aria-label="Haftayı azalt" onClick={() => set("weeks", Math.max(1, n(p.weeks) - 1))} className="grid size-8 place-items-center rounded-xl bg-white/15">
              <Icon name="minus" className="size-4" />
            </button>
            <span className="flex-1 text-center">
              <small className="block text-[0.6875rem] text-white/70">Süre</small>
              <b className="text-[0.9375rem] tabular-nums">{n(p.weeks)} hafta</b>
            </span>
            <button type="button" aria-label="Haftayı artır" onClick={() => set("weeks", Math.min(26, n(p.weeks) + 1))} className="grid size-8 place-items-center rounded-xl bg-white/15">
              <Icon name="plus" className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section className={`${card} mt-3 px-3 py-3`}>
        <div className="grid grid-cols-7 gap-1">
          {DOWS.slice(1).map((x, k) => {
            const dow = k + 1;
            const d = p.days.find((y) => y.dow === dow);
            const on = d && dow === day?.dow;
            return (
              <button
                key={x}
                type="button"
                aria-pressed={!!on}
                aria-label={d ? `${DOW_LONG[dow]}: ${d.name}` : `${DOW_LONG[dow]} günü ekle`}
                onClick={() => (d ? setSel(dow) : addDay(dow))}
                className="flex flex-col items-center gap-1"
              >
                <small className={`text-[0.6875rem] font-semibold ${on ? "text-acc" : "text-mut"}`}>{x}</small>
                <span
                  className={`grid size-10 place-items-center rounded-full text-[0.75rem] font-bold transition ${
                    on ? "bg-acc text-white shadow-[0_6px_14px_-6px_var(--acc)]" : d ? "bg-acc/12 text-acc" : "border border-dashed border-line text-mut"
                  }`}
                >
                  {d ? <Icon name="dumbbell" className="size-4" /> : <Icon name="plus" className="size-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[0.75rem] text-mut">Güne dokun; boş güne dokunursan antrenman eklenir.</p>
      </section>

      {day ? (
        <DayPanel key={day.dow} d={day} onChange={(v) => set("days", p.days.map((x) => (x.dow === day.dow ? v : x)))} onDrop={() => dropDay(day.dow)} />
      ) : (
        <p className={`${card} mt-3 p-5 text-center text-[0.9375rem] text-mut`}>Henüz antrenman günü yok. Yukarıdan bir güne dokun.</p>
      )}

      <RestAll p={p} onChange={setP} />
      <PlanNotes p={p} onChange={setP} />
      <TrackEdit p={p} onChange={setP} />
      <AiEdit p={p} onChange={setP} />
      {onCal && <p className="mt-3 px-1 text-[0.8125rem] leading-snug text-mut">Kaydedince takvimdeki gelecek antrenmanlar da güncellenir.</p>}

      <div className={`${card} mt-3 p-3`}>
        {!onCal && (
          <>
            <Button loading={busy === "plans"} disabled={!!busy || !p.days.length} onClick={() => onSave(p, true)} className="w-full">
              <Icon name="cal" className="size-5" />
              {p.forName ? `Kaydet, ${p.forName} görsün` : "Kaydet ve planlara ekle"}
            </Button>
            {total > 0 && <small className="mt-1.5 block text-center text-[0.75rem] text-mut">{total} antrenman {p.forName ? `${p.forName} için takvime` : "takvimine"} eklenecek</small>}
          </>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={!!busy} className="h-11 rounded-2xl bg-bg text-[0.9375rem] font-semibold text-mut">
            Vazgeç
          </button>
          <Button variant={onCal ? "primary" : "ghost"} loading={busy === "save"} disabled={!!busy || !p.days.length} onClick={() => onSave(p, onCal)}>
            {onCal ? "Kaydet" : "Yalnız kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
