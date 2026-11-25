"use client";

// Mesajdaki dosyadan plan (lib/chatPlan.js, /api/chat-plan). Sohbete gelen PDF ya da fotoğraf bir kez okunur; içinde tarihli
// bir şey varsa mesajın altında "Planlara ekleyeyim mi? 3 plan · Ekle · Gerek yok". Ekle: alttan pencerede seçilir, eklenir.
// Sonuç cihazda saklanır (localStorage cp:<mesaj>); eklenen planlarda fromMsg "sohbet/mesaj" olduğu için her cihazda
// "Planlara eklendi" görünür. Ana asistan aynı okuyucuyu kullanır (isler/mesajPlan.js).
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { authFetch } from "@/lib/authFetch";
import { PLAN_DAYS, planDrafts, planFile } from "@/lib/chatPlan";
import { todayStr } from "@/lib/utils/format";

const KEY = (mid) => `cp:${mid}`;
const mem = new Map();
const subs = new Set();
const flight = new Map();
let line = Promise.resolve(); // dosyalar sırayla okunur (aynı anda tek istek)
const UNDO_MS = 10 * 60e3;

function get(mid) {
  if (!mid) return null;
  if (!mem.has(mid)) {
    let v = null;
    try {
      v = JSON.parse(localStorage.getItem(KEY(mid)) || "null");
    } catch {}
    mem.set(mid, v);
  }
  return mem.get(mid);
}
function put(mid, v, keep = true) {
  mem.set(mid, v);
  if (keep)
    try {
      localStorage.setItem(KEY(mid), JSON.stringify(v));
    } catch {}
  subs.forEach((f) => f());
}
const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export const planStateOf = get;
export const usePlanState = (mid) => useSyncExternalStore(subscribe, () => get(mid), () => null);

// Dosyayı okur (önceden okunduysa cihazdaki sonuç): { items, kind } ya da hata olursa null
export function readPlans(m) {
  const s = get(m?.id);
  if (s && s.st !== "err") return Promise.resolve(s);
  if (!planFile(m?.file)) return Promise.resolve(null);
  if (flight.has(m.id)) return flight.get(m.id);
  const job = (line = line.then(async () => {
    try {
      const res = await authFetch("/api/chat-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: m.file.url, type: m.file.type, name: m.file.name, today: todayStr() }),
      });
      if (!res.ok) {
        put(m.id, { st: "err" }, false);
        return null;
      }
      const j = await res.json();
      const v = { st: j.items?.length ? "found" : "none", items: j.items || [], kind: j.kind || "" };
      put(m.id, v);
      return v;
    } catch {
      put(m.id, { st: "err" }, false);
      return null;
    } finally {
      flight.delete(m.id);
    }
  }));
  flight.set(m.id, job);
  return job;
}

// Planları ekler; Geri al için kimlikler saklanır. Dönen: eklenen plan sayısı (hata: -1)
export async function addPlans({ saveDrafts, items, ref, mid, by }) {
  if (!items?.length) return 0;
  const r = await saveDrafts(planDrafts(items, ref), { source: "chat", by });
  if (r.error) return -1;
  const prev = get(mid) || {};
  put(mid, { ...prev, st: "added", ids: (r.ids || []).filter(([k]) => k === "plan").map(([, id]) => id), at: Date.now() });
  return r.plans;
}
export function undoPlans(mid, deleteRecord) {
  const s = get(mid);
  (s?.ids || []).forEach((id) => deleteRecord("plan", id));
  put(mid, { ...s, st: "no", ids: [] });
}
export const dropHint = (mid) => put(mid, { ...(get(mid) || {}), st: "no" });

const recent = (m, toMs) => Date.now() - toMs(m.at) < PLAN_DAYS * 864e5;

// Mesajın altındaki tek satır
export function ChatPlanHint({ m, cid, mine, plans, toMs, now, onPick, onUndo }) {
  const s = usePlanState(m.id);
  const ok = planFile(m.file) && !m.pending && !m.deleted;
  useEffect(() => {
    if (ok && !s && recent(m, toMs)) readPlans(m);
  }, [ok, m.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ok) return null;
  const ref = `${cid}/${m.id}`;
  const added = plans.filter((p) => p.fromMsg === ref);
  const box = `mt-1 flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-accbg py-1 pl-3 pr-1 text-[0.8125rem] ${mine ? "self-end" : "self-start"}`;
  if (added.length)
    return (
      <div className={box}>
        <span className="font-semibold text-ok">Planlara eklendi</span>
        <span className="text-mut">{added.length} plan</span>
        {s?.st === "added" && now - (s.at || 0) < UNDO_MS && (
          <Button variant="secondary" size="sm" onClick={() => onUndo(m)}>
            Geri al
          </Button>
        )}
      </div>
    );
  if (s?.st !== "found") return null;
  return (
    <div className={box}>
      <span className="font-semibold">Planlara ekleyeyim mi?</span>
      <span className="text-mut">{s.items.length} plan</span>
      <Button size="sm" onClick={() => onPick(m, s.items)}>
        Ekle
      </Button>
      <Button variant="secondary" size="sm" onClick={() => dropHint(m.id)}>
        Gerek yok
      </Button>
    </div>
  );
}

const dm = (d) => new Date(`${d}T12:00:00`);
const input = "h-10 w-full min-w-0 rounded-xl border border-transparent bg-bg px-3 text-base text-fg outline-none focus:border-acc focus:bg-card";
const dateFix = "appearance-none [&::-webkit-date-and-time-value]:text-left";

// Bulunan planlar: işaretli olanlar eklenir; satıra dokununca ad, gün, saat, yer düzeltilir
export const PlanPickSheet = ({ pick, onClose, onAdd }) => <PickSheet key={pick ? pick.m.id : "-"} pick={pick} onClose={onClose} onAdd={onAdd} />;
function PickSheet({ pick, onClose, onAdd }) {
  const [rows, setRows] = useState(() => (pick?.items || []).map((x) => ({ ...x, on: true })));
  const [open, setOpen] = useState(-1);
  const [busy, setBusy] = useState(false);
  const n = rows.filter((r) => r.on && r.title.trim() && r.date).length;
  const set = (i, patch) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const add = async () => {
    if (!n || busy) return;
    setBusy(true);
    await onAdd(rows.filter((r) => r.on && r.title.trim() && r.date).map((r) => ({ title: r.title, date: r.date, endDate: r.endDate, time: r.time, place: r.place, cat: r.cat })));
    setBusy(false);
  };
  return (
    <Sheet open={!!pick} onClose={onClose} title="Planlara ekle" footer={<SheetActions onCancel={onClose} yes={n ? `Ekle (${n})` : "Ekle"} onYes={add} disabled={!n || busy} />}>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {rows.map((r, i) => {
          const d = dm(r.date);
          return (
            <li key={i}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="w-11 shrink-0 rounded-[0.625rem] border border-line py-0.5 text-center leading-tight">
                    <b className="num block text-[1.0625rem]">{d.getDate()}</b>
                    <span className="block text-[0.625rem] text-mut">{d.toLocaleDateString("tr-TR", { month: "short", weekday: "short" })}</span>
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-[0.9375rem] font-semibold">{r.title || "Adsız"}</b>
                    <span className="block truncate text-[0.8125rem] text-mut">
                      {[r.endDate ? `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${dm(r.endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}` : r.time || "Tüm gün", r.place].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={r.on}
                  aria-label={r.on ? "Eklenecek" : "Eklenmeyecek"}
                  onClick={() => set(i, { on: !r.on })}
                  className={`grid size-7 shrink-0 place-items-center rounded-lg border ${r.on ? "border-acc bg-acc text-white" : "border-line bg-bg"}`}
                >
                  {r.on && <Icon name="check" className="size-4" />}
                </button>
              </div>
              {open === i && (
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  <input aria-label="Ad" className={`${input} col-span-2`} value={r.title} onChange={(e) => set(i, { title: e.target.value })} />
                  <input aria-label="Gün" type="date" className={`${input} ${dateFix}`} value={r.date} onChange={(e) => set(i, { date: e.target.value })} />
                  <input aria-label="Saat" type="time" className={`${input} ${dateFix}`} value={r.time} disabled={!!r.endDate} onChange={(e) => set(i, { time: e.target.value })} />
                  <input aria-label="Yer" placeholder="Yer" className={`${input} col-span-2`} value={r.place} onChange={(e) => set(i, { place: e.target.value })} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
