"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { compressImage } from "@/lib/image";
import { todayStr } from "@/lib/utils/format";
import { GLASS_ML, SLOTS, cleanWeights, dayOf, frequent, monthKey, slotOf, targets, totals, weekKcal, weightTrend } from "@/lib/fitness/food";
import { FOOD_SAVED, addMeals, askFood, dropMeal, loadMonths, saveWeight, setWater, updateMeal } from "./foodData";

// Fitness › Beslenme: günün kalorisi ve makroları (koyu kart), su (bardak bardak), öğünler, kilo (grafik), bu hafta.
// Yemek fotoğrafla ya da elle eklenir (yapay zeka kaloriyi tahmin eder, kullanıcı düzeltir); sesle asistana söylenir
// ("öğlen tavuk pilav ve ayran içtim", "2 bardak su içtim", "kilom 82"). Okuma: ay belgesi (son 7 gün iki aya yayılırsa 2).

const addDay = (d, n) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const dayTitle = (d, today) =>
  d === today ? "Bugün" : d === addDay(today, -1) ? "Dün" : new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" });
const fmt = (n) => Math.round(n).toLocaleString("tr-TR");
const nowTime = () => new Date().toTimeString().slice(0, 5);

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

export function FoodView({ orgId, uid, fit = {}, fitW = [], trainDays = 3, onBody }) {
  const toast = useToast();
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [months, setMonths] = useState({});
  const [saved, setWeights] = useState(null); // bu ekranda yazılan kilo (profil güncellenene kadar)
  const weights = saved || cleanWeights(fitW);
  const [add, setAdd] = useState(null); // { slot }
  const [edit, setEdit] = useState(null); // yemek
  const [wOpen, setWOpen] = useState(false);

  const load = useCallback(() => {
    loadMonths(orgId, uid, [monthKey(date), monthKey(addDay(date, -6)), monthKey(today)])
      .then(setMonths)
      .catch(() => {});
  }, [orgId, uid, date, today]);
  useEffect(() => {
    load();
    window.addEventListener(FOOD_SAVED, load);
    return () => window.removeEventListener(FOOD_SAVED, load);
  }, [load]);

  const day = dayOf(months[monthKey(date)], date);
  const tot = totals(day.meals);
  const tg = targets({ ...fit, weight: weights.at(-1)?.kg || fit.weight }, trainDays);
  const week = weekKcal(months, date);
  const trend = weightTrend(weights, today);
  const often = frequent(months, 8);

  async function water(n) {
    await setWater(orgId, uid, date, n).catch((e) => toast(e.message || "Kaydedilemedi"));
  }
  async function weight(kg) {
    try {
      setWeights(await saveWeight(uid, weights, kg, today));
      toast("Kilo kaydedildi");
    } catch (e) {
      toast(e.message || "Kaydedilemedi");
    }
  }

  return (
    <>
      <Hero date={date} today={today} setDate={setDate} tot={tot} tg={tg} onBody={onBody} />
      <WaterCard n={day.water} goal={tg?.water || 8} onSet={water} />

      <Section title="Öğünler" right={<span className="text-[0.8125rem] text-mut">{day.meals.length ? `${fmt(tot.kcal)} kcal` : ""}</span>}>
        <div className={`${card} divide-y divide-line`}>
          {SLOTS.map(([k, name]) => {
            const list = day.meals.filter((m) => m.slot === k);
            const kc = totals(list).kcal;
            return (
              <div key={k} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <b className="block text-[0.9375rem] font-semibold">{name}</b>
                    {!list.length && <small className="text-[0.8125rem] text-mut">Eklenmedi</small>}
                  </span>
                  {kc > 0 && <span className="text-[0.875rem] font-semibold tabular-nums text-mut">{fmt(kc)} kcal</span>}
                  <button type="button" onClick={() => setAdd({ slot: k })} aria-label={`${name} ekle`} className="grid size-9 shrink-0 place-items-center rounded-full bg-acc/10 text-acc active:scale-90">
                    <Icon name="plus" className="size-5" />
                  </button>
                </div>
                {list.map((m) => (
                  <button key={m.id} type="button" onClick={() => setEdit(m)} className="mt-2 flex w-full items-center gap-3 rounded-xl bg-bg px-3 py-2.5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem]">{m.name}</span>
                      <small className="block truncate text-[0.75rem] text-mut">{[m.qty, m.p ? `P ${Math.round(m.p)} g` : ""].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums">{fmt(m.kcal)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[0.8125rem] leading-snug text-mut">Asistana söyle: “öğlen tavuk pilav ve ayran içtim”.</p>
      </Section>

      <WeightCard list={weights} trend={trend} onAdd={() => setWOpen(true)} />
      <WeekBars week={week} goal={tg?.kcal} today={today} />

      <AddFood
        key={add ? `a${add.slot}` : "ac"}
        open={!!add}
        slot={add?.slot}
        often={often}
        onClose={() => setAdd(null)}
        onAdd={async (items) => {
          await addMeals(orgId, uid, date, items);
          setAdd(null);
          toast(`Eklendi: ${fmt(totals(items).kcal)} kcal`);
        }}
      />
      <EditFood
        key={edit ? edit.id : "ec"}
        meal={edit}
        onClose={() => setEdit(null)}
        onSave={async (m) => {
          await updateMeal(orgId, uid, date, m);
          setEdit(null);
        }}
        onDrop={async () => {
          await dropMeal(orgId, uid, date, edit.id);
          setEdit(null);
        }}
      />
      <WeightSheet key={wOpen ? "wo" : "wc"} open={wOpen} last={trend?.last?.kg || fit.weight} onClose={() => setWOpen(false)} onSave={async (kg) => (await weight(kg), setWOpen(false))} />
    </>
  );
}

// Koyu kart: gün seçimi, kalori halkası, kalan, makrolar
function Hero({ date, today, setDate, tot, tg, onBody }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const k = tg ? Math.min(tot.kcal / tg.kcal, 1) : 0;
  const over = tg && tot.kcal > tg.kcal;
  return (
    <section className="mt-2 overflow-hidden rounded-[1.625rem] bg-deep p-5 text-white">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setDate(addDay(date, -1))} aria-label="Önceki gün" className="grid size-9 place-items-center rounded-full bg-white/10">
          <Icon name="back" className="size-4" />
        </button>
        <b className="text-[0.9375rem] font-semibold">{dayTitle(date, today)}</b>
        <button type="button" disabled={date >= today} onClick={() => setDate(addDay(date, 1))} aria-label="Sonraki gün" className="grid size-9 place-items-center rounded-full bg-white/10 disabled:opacity-30">
          <Icon name="chev" className="size-4" />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <span className="relative grid size-32 shrink-0 place-items-center">
          <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
            <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="11" />
            <circle cx="64" cy="64" r={r} fill="none" stroke={over ? "#f6a96b" : "#9be3c6"} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${c * k} ${c}`} />
          </svg>
          <span className="text-center">
            <b className="block text-[1.75rem] font-bold leading-none tabular-nums">{fmt(tot.kcal)}</b>
            <small className="text-[0.75rem] text-white/60">{tg ? `/ ${fmt(tg.kcal)} kcal` : "kcal"}</small>
          </span>
        </span>
        <span className="min-w-0 flex-1">
          {tg ? (
            <>
              <b className="block text-[1.375rem] font-bold leading-tight">{over ? `${fmt(tot.kcal - tg.kcal)} fazla` : `${fmt(tg.kcal - tot.kcal)} kaldı`}</b>
              <small className="block text-[0.8125rem] text-white/60">kalori</small>
            </>
          ) : (
            <button type="button" onClick={onBody} className="text-left">
              <b className="block text-[1rem] font-semibold leading-snug">Hedefin için boy ve kilonu ekle</b>
              <small className="mt-1 flex items-center gap-1 text-[0.8125rem] text-white/60">
                Ekle <Icon name="chev" className="size-3.5" />
              </small>
            </button>
          )}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Macro name="Protein" v={tot.p} goal={tg?.p} color="#9be3c6" />
        <Macro name="Karbonhidrat" v={tot.c} goal={tg?.c} color="#f6c445" />
        <Macro name="Yağ" v={tot.f} goal={tg?.f} color="#f6a96b" />
      </div>
    </section>
  );
}
function Macro({ name, v, goal, color }) {
  const k = goal ? Math.min(v / goal, 1) : 0;
  return (
    <span className="min-w-0">
      <small className="block truncate text-[0.75rem] text-white/60">{name}</small>
      <b className="block text-[0.9375rem] font-semibold tabular-nums">
        {Math.round(v)}
        <span className="text-[0.75rem] font-normal text-white/50">{goal ? ` / ${goal} g` : " g"}</span>
      </b>
      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/12">
        <span className="block h-full rounded-full" style={{ width: `${k * 100}%`, background: color }} />
      </span>
    </span>
  );
}

// Su: hedef kadar bardak; bardağa dokununca o sayıya gelir, son doluya dokununca bir eksilir
function WaterCard({ n, goal, onSet }) {
  const shown = Math.max(goal, n);
  const litre = ((n * GLASS_ML) / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  return (
    <Section title="Su" right={<span className="text-[0.8125rem] text-mut tabular-nums">{n}/{goal} bardak · {litre} L</span>}>
      <div className={`${card} p-4`}>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: shown }, (_, i) => (
            <button key={i} type="button" onClick={() => onSet(i + 1 === n ? i : i + 1)} aria-label={`${i + 1} bardak`} className="active:scale-90">
              <Glass full={i < n} />
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" disabled={!n} onClick={() => onSet(n - 1)} aria-label="Bir bardak eksilt" className="grid size-10 place-items-center rounded-full bg-bg text-fg disabled:opacity-40">
            <Icon name="minus" className="size-5" />
          </button>
          <button type="button" onClick={() => onSet(n + 1)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-sky-500/12 text-[0.9375rem] font-semibold text-sky-600 dark:text-sky-300">
            <Icon name="plus" className="size-5" />
            Bir bardak
          </button>
        </div>
      </div>
    </Section>
  );
}
function Glass({ full }) {
  return (
    <svg viewBox="0 0 28 36" className="h-9 w-7">
      <path d="M4 3h20l-2.6 29.2A2 2 0 0 1 19.4 34H8.6a2 2 0 0 1-2-1.8Z" fill={full ? "rgb(14 165 233 / .16)" : "none"} stroke={full ? "rgb(14 165 233)" : "var(--line)"} strokeWidth="2" strokeLinejoin="round" />
      {full && <path d="M6.3 12h15.4l-1.9 20H8.2Z" fill="rgb(14 165 233)" />}
    </svg>
  );
}

// Kilo: son değer, 30 günlük fark, çizgi grafik
function WeightCard({ list, trend, onAdd }) {
  const pts = list.slice(-30);
  return (
    <Section title="Kilo" right={<button type="button" onClick={onAdd} className="text-[0.875rem] font-semibold text-acc">Kilo yaz</button>}>
      <div className={`${card} p-4`}>
        {trend ? (
          <>
            <div className="flex items-end gap-3">
              <b className="text-[1.75rem] font-bold leading-none tabular-nums">
                {trend.last.kg.toLocaleString("tr-TR")}
                <span className="text-[0.9375rem] font-semibold text-mut"> kg</span>
              </b>
              {trend.diff !== 0 && (
                <span className={`mb-0.5 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${trend.diff < 0 ? "bg-acc/10 text-acc" : "bg-orange-500/10 text-orange-600 dark:text-orange-300"}`}>
                  {trend.diff > 0 ? "+" : ""}
                  {trend.diff.toLocaleString("tr-TR")} kg · 30 gün
                </span>
              )}
            </div>
            <Line pts={pts} />
          </>
        ) : (
          <button type="button" onClick={onAdd} className="flex w-full items-center gap-3 text-left">
            <span className="grid size-10 place-items-center rounded-full bg-acc/10 text-acc">
              <Icon name="trend" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] font-semibold">Kilonu yaz, değişimi gör</b>
              <small className="block text-[0.8125rem] text-mut">Asistana da söyleyebilirsin: “kilom 82”.</small>
            </span>
          </button>
        )}
      </div>
    </Section>
  );
}
function Line({ pts }) {
  if (pts.length < 2) return <p className="mt-3 text-[0.8125rem] text-mut">Grafik için birkaç gün daha kilo yaz.</p>;
  const kg = pts.map((p) => p.kg);
  const lo = Math.min(...kg) - 0.5;
  const hi = Math.max(...kg) + 0.5;
  const x = (i) => 6 + (i / (pts.length - 1)) * 288;
  const y = (v) => 70 - ((v - lo) / (hi - lo)) * 62;
  const line = pts.map((p, i) => `${x(i)},${y(p.kg)}`).join(" ");
  return (
    <svg viewBox="0 0 300 78" className="mt-3 h-24 w-full" preserveAspectRatio="none">
      <polygon points={`${x(0)},76 ${line} ${x(pts.length - 1)},76`} fill="var(--acc)" opacity=".1" />
      <polyline points={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Bu hafta: 7 günün kalorisi, hedef çizgisi
const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
function WeekBars({ week, goal, today }) {
  if (!week.some((d) => d.kcal)) return null;
  const top = Math.max(goal || 0, ...week.map((d) => d.kcal)) * 1.1;
  const days = week.filter((d) => d.kcal);
  const avg = Math.round(days.reduce((a, d) => a + d.kcal, 0) / days.length);
  return (
    <Section title="Bu hafta" right={<span className="text-[0.8125rem] text-mut">ortalama {fmt(avg)} kcal</span>}>
      <div className={`${card} p-4`}>
        <div className="relative flex h-28 items-end gap-2">
          {goal > 0 && <span className="absolute inset-x-0 border-t border-dashed border-acc/50" style={{ bottom: `${(goal / top) * 100}%` }} />}
          {week.map((d) => (
            <span key={d.date} className="flex h-full flex-1 items-end">
              <span className={`w-full rounded-t-lg ${goal && d.kcal > goal ? "bg-orange-400" : "bg-acc"} ${d.date === today ? "" : "opacity-70"}`} style={{ height: `${(d.kcal / top) * 100}%`, minHeight: d.kcal ? 4 : 0 }} />
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex gap-2 text-center">
          {week.map((d) => (
            <span key={d.date} className={`flex-1 text-[0.6875rem] font-semibold ${d.date === today ? "text-acc" : "text-mut"}`}>
              {DAY_SHORT[new Date(`${d.date}T12:00:00`).getDay()]}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

const field = "h-12 w-full min-w-0 rounded-2xl bg-bg px-4 text-[0.9375rem] outline-none";
const H = ({ children }) => <span className="mb-1.5 mt-4 block text-[0.75rem] font-semibold tracking-[.08em] text-mut">{children}</span>;

function SlotPick({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {SLOTS.map(([k, n]) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={`h-10 rounded-xl text-[0.8125rem] font-semibold ${value === k ? "bg-acc text-white" : "bg-bg text-fg"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

// Yemek ekle: fotoğraf (yapay zeka okur, satırlar düzeltilir) · sık yediklerin · elle (kalori boşsa yapay zeka tahmin eder)
function AddFood({ open, slot: slot0, often, onClose, onAdd }) {
  const toast = useToast();
  const [slot, setSlot] = useState(slot0 || slotOf(nowTime()));
  const [rows, setRows] = useState(null); // yapay zekanın okuduğu satırlar
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [f, setF] = useState({ name: "", qty: "", kcal: "", p: "" });
  const cam = useRef(null);
  const gal = useRef(null);

  async function photo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("photo");
    try {
      const image = await compressImage(file, 1280, 0.72);
      const r = await askFood({ image });
      if (!r.items?.length) throw new Error("Fotoğrafta yemek bulamadım");
      setRows(r.items);
      setNote(r.note || "");
    } catch (err) {
      toast(err.message || "Okunamadı");
    } finally {
      setBusy("");
    }
  }
  async function manual() {
    const name = f.name.trim();
    if (!name) return;
    if (f.kcal) return onAdd([{ name, qty: f.qty, kcal: f.kcal, p: f.p, slot }]);
    setBusy("est");
    try {
      const r = await askFood({ text: `${f.qty ? `${f.qty} ` : ""}${name} yedim` });
      if (!r.items?.length) throw new Error("Tahmin edilemedi, kaloriyi yaz");
      setRows(r.items);
      setNote(r.note || "");
    } catch (err) {
      toast(err.message || "Tahmin edilemedi");
    } finally {
      setBusy("");
    }
  }
  const setRow = (i, k, v) => setRows((x) => x.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <Sheet open={open} onClose={onClose} title="Yemek ekle">
      <SlotPick value={slot} onChange={setSlot} />
      {rows ? (
        <>
          <H>YAPAY ZEKANIN TAHMİNİ · DÜZELTEBİLİRSİN</H>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-2xl bg-bg px-3 py-2">
                <span className="min-w-0 flex-1">
                  <input value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} className="w-full min-w-0 bg-transparent text-[0.9375rem] font-semibold outline-none" />
                  <input value={r.qty} onChange={(e) => setRow(i, "qty", e.target.value)} className="w-full min-w-0 bg-transparent text-[0.75rem] text-mut outline-none" />
                </span>
                <input inputMode="numeric" value={r.kcal} onChange={(e) => setRow(i, "kcal", e.target.value.replace(/\D/g, ""))} className="w-14 bg-transparent text-right text-[0.9375rem] font-semibold tabular-nums outline-none" />
                <span className="text-[0.75rem] text-mut">kcal</span>
                <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="Çıkar" className="grid size-8 place-items-center text-mut">
                  <Icon name="x" className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {note && <p className="mt-2 text-[0.8125rem] leading-snug text-mut">{note}</p>}
          <Button className="mt-4" disabled={!rows.length} onClick={() => onAdd(rows.map((r) => ({ ...r, slot })))}>
            Ekle · {fmt(totals(rows.map((r) => ({ ...r, kcal: Number(r.kcal) || 0 }))).kcal)} kcal
          </Button>
          <Button variant="ghost" className="mt-2" onClick={() => setRows(null)}>
            Geri
          </Button>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={!!busy} onClick={() => cam.current?.click()} className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-acc text-white disabled:opacity-60">
              {busy === "photo" ? <Icon name="load" className="size-6 animate-spin" /> : <Icon name="camera" className="size-6" />}
              <span className="text-[0.875rem] font-semibold">{busy === "photo" ? "Okunuyor…" : "Fotoğrafını çek"}</span>
            </button>
            <button type="button" disabled={!!busy} onClick={() => gal.current?.click()} className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-bg text-fg disabled:opacity-60">
              <Icon name="image" className="size-6" />
              <span className="text-[0.875rem] font-semibold">Galeriden seç</span>
            </button>
          </div>
          <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={photo} />
          <input ref={gal} type="file" accept="image/*" hidden onChange={photo} />

          {often.length > 0 && (
            <>
              <H>SIK YEDİKLERİN</H>
              <div className="flex flex-wrap gap-1.5">
                {often.map((m) => (
                  <button key={m.id} type="button" onClick={() => onAdd([{ ...m, slot }])} className="rounded-full bg-bg px-3 py-2 text-[0.8125rem] font-medium">
                    {m.name} <span className="text-mut">· {fmt(m.kcal)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <H>ELLE YAZ</H>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ne yedin? (ör. mercimek çorbası)" className={field} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} placeholder="Miktar" className={field} />
            <input inputMode="numeric" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value.replace(/\D/g, "") })} placeholder="kcal" className={field} />
            <input inputMode="decimal" value={f.p} onChange={(e) => setF({ ...f, p: e.target.value.replace(",", ".") })} placeholder="Protein g" className={field} />
          </div>
          <Button className="mt-4" loading={busy === "est"} disabled={!f.name.trim() || !!busy} onClick={manual}>
            {f.kcal ? "Ekle" : "Kaloriyi tahmin et"}
          </Button>
        </>
      )}
    </Sheet>
  );
}

function EditFood({ meal, onClose, onSave, onDrop }) {
  const [m, setM] = useState(meal || {});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setM((x) => ({ ...x, [k]: v }));
  const num = (k, label, unit) => (
    <label className="flex h-12 items-center gap-2 rounded-2xl bg-bg px-3">
      <span className="text-[0.75rem] text-mut">{label}</span>
      <input inputMode="decimal" value={m[k] ?? ""} onChange={(e) => set(k, e.target.value.replace(",", "."))} className="w-full min-w-0 bg-transparent text-right text-[0.9375rem] font-semibold tabular-nums outline-none" />
      <span className="text-[0.75rem] text-mut">{unit}</span>
    </label>
  );
  return (
    <Sheet open={!!meal} onClose={onClose} title="Yemeği düzenle">
      <SlotPick value={m.slot} onChange={(v) => set("slot", v)} />
      <H>YEMEK</H>
      <input value={m.name || ""} onChange={(e) => set("name", e.target.value)} className={field} />
      <input value={m.qty || ""} onChange={(e) => set("qty", e.target.value)} placeholder="Miktar" className={`${field} mt-2`} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {num("kcal", "Kalori", "kcal")}
        {num("p", "Protein", "g")}
        {num("c", "Karb.", "g")}
        {num("f", "Yağ", "g")}
      </div>
      <Button
        className="mt-5"
        loading={busy}
        disabled={!String(m.name || "").trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await onSave(m);
          } finally {
            setBusy(false);
          }
        }}
      >
        Kaydet
      </Button>
      <button type="button" onClick={onDrop} className="mt-3 flex h-11 w-full items-center justify-center gap-2 text-[0.9375rem] font-semibold text-rec">
        <Icon name="trash" className="size-4" />
        Sil
      </button>
    </Sheet>
  );
}

function WeightSheet({ open, last, onClose, onSave }) {
  const [kg, setKg] = useState(last ? String(last) : "");
  const [busy, setBusy] = useState(false);
  const v = Number(String(kg).replace(",", "."));
  const ok = v >= 30 && v <= 250;
  const step = (d) => setKg(String(Math.round(((ok ? v : Number(last) || 70) + d) * 10) / 10));
  return (
    <Sheet open={open} onClose={onClose} title="Bugünkü kilon">
      <div className="mt-2 flex items-center justify-center gap-4">
        <button type="button" onClick={() => step(-0.1)} aria-label="Azalt" className="grid size-12 place-items-center rounded-full bg-bg">
          <Icon name="minus" className="size-5" />
        </button>
        <label className="flex items-baseline gap-1">
          <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value.replace(",", "."))} className="w-28 bg-transparent text-center text-[2.5rem] font-bold tabular-nums outline-none" />
          <span className="text-[1rem] font-semibold text-mut">kg</span>
        </label>
        <button type="button" onClick={() => step(0.1)} aria-label="Artır" className="grid size-12 place-items-center rounded-full bg-bg">
          <Icon name="plus" className="size-5" />
        </button>
      </div>
      <Button
        className="mt-6"
        loading={busy}
        disabled={!ok}
        onClick={async () => {
          setBusy(true);
          try {
            await onSave(v);
          } finally {
            setBusy(false);
          }
        }}
      >
        Kaydet
      </Button>
    </Sheet>
  );
}
