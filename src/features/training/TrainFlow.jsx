"use client";

import { addFinish, mmss, places, removeFinish } from "@/lib/raceScore";
import { useToast } from "@/components/ui/ToastProvider";

// Antrenman ekranı yeni akış (Seyhun 2026-11-01 onayı, örnek /mnt/project-files/antrenman-sayfasi/yeni-akis/ornek.png): tek ekran, yarışın
// evresine göre değişir. Hazır: süre seç, Başlat, yanında Video; altında günün yarışları (sıralama + videolar aynı satırda).
// Yarışta: gelen sporcuların adları kare kare, bitişi geçeni sırayla dokun (sıra + süre yazılır, tekrar dokununca geri alır); herkes dokununca
// yarış biter. Biten son yarış açık görünür: bütün sıralama süresiyle, Düzelt · Paylaş, genel durum.
const hm = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const first = (n) => String(n || "").split(" ")[0];
const sub = "flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[0.875rem] border border-line bg-card px-2 text-[0.9375rem] font-semibold shadow-[0_2px_0_var(--line)] active:translate-y-px active:shadow-none";

// Bitiren kim? (yarışta): kareler, sırası ve süresi; tekrar dokununca çıkar. Hepsi dokununca onAll (yarış biter)
export function FinishTap({ race, people, onSave, onAll, voice = null, extra = null }) {
  const pl = places(race);
  const fin = Object.fromEntries((race.finishes || []).map((f) => [f.id, f]));
  const all = [...people, ...(race.finishes || []).filter((f) => !people.some((p) => p.id === f.id))];
  const tap = (p) => {
    const next = fin[p.id] ? removeFinish(race, p.id) : addFinish(race, p);
    if (!fin[p.id] && all.every((x) => next.finishes.some((f) => f.id === x.id))) return onAll(next);
    onSave(next);
  };
  return (
    <section aria-label="Bitiren kim">
      <div className="mb-2 mt-4 flex items-baseline justify-between px-1 text-[0.8125rem] font-semibold text-mut">
        <span>Bitiren kim? Sırayla dokun</span>
        <span className="tabular-nums">
          {race.finishes.length} / {all.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {all.map((p) => {
          const f = fin[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => tap(p)}
              aria-pressed={!!f}
              className={`flex h-[3.625rem] min-w-0 flex-col items-center justify-center rounded-[0.9375rem] border px-1 active:translate-y-px ${f ? "border-acc/30 bg-accbg" : "border-line bg-card shadow-[0_3px_0_var(--line)] active:shadow-none"}`}
            >
              <b className="max-w-full truncate text-[0.9375rem] font-semibold">{first(p.name)}</b>
              {f && <small className="text-[0.75rem] font-bold tabular-nums text-acc">{[f.code || pl[p.id], f.t != null ? mmss(f.t) : ""].filter(Boolean).join(" · ")}</small>}
            </button>
          );
        })}
      </div>
      {(voice || extra) && (
        <div className="mt-2.5 flex gap-2">
          {voice}
          {extra}
        </div>
      )}
    </section>
  );
}

// Satırın sıralaması: "1 Ali · 2 Ege · 3 İlay"
const order = (r) => {
  const pl = places(r);
  return (r.finishes || []).map((f) => (f.code ? `${f.code} ${first(f.name)}` : `${pl[f.id]} ${first(f.name)}`)).join(" · ");
};

// MediaTab list (Start sekmesindeki gibi): her yarış bir satır, çekimleri satırın altında. open: biten son yarış açık (bütün sıralama)
export function useTrainList({ races, date, tr, open, table, onOpen, onAdd }) {
  const toast = useToast();
  const today = races.map((r, i) => ({ id: r.id, day: date, n: i + 1 }));
  const share = async (r) => {
    const pl = places(r);
    const text = [`${r.name} · ${hm(r.startAt ?? Date.now())}${r.fin != null ? ` · ${mmss(r.fin)}` : ""}`, ...r.finishes.map((f) => `${f.code || pl[f.id]}. ${f.name}${f.t != null ? ` ${mmss(f.t)}` : ""}`)].join("\n");
    try {
      if (navigator.share) return await navigator.share({ text });
      await navigator.clipboard.writeText(text);
      toast("Sonuç kopyalandı");
    } catch {}
  };
  const row = (s) => {
    const r = races.find((x) => x.id === s.id);
    if (!r) return null;
    const now = tr.t.rid === r.id && (tr.running || tr.t.left != null);
    const state = now ? (tr.up ? `yarışta +${mmss(Math.max(0, Math.round((tr.now - tr.t.end) / 1000)))}` : tr.running ? `starta ${mmss(Math.max(0, tr.rem))}` : "durdu") : "";
    const big = open === r.id && r.finishes.length > 0;
    const pl = places(r);
    return (
      <div>
        <button type="button" onClick={() => onOpen(r.id)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] font-semibold">{r.name}</b>
            <span className="block truncate text-[0.8125rem] text-mut">
              {[r.cd ? `${Math.round(r.cd / 60)} dk start` : "", big ? (r.fin != null ? `${mmss(r.fin)} sürdü` : "") : order(r)].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="shrink-0 text-right text-[0.875rem] tabular-nums text-fg2">
            {[Number.isFinite(r.startAt) ? hm(r.startAt) : "", !big && r.fin != null ? mmss(r.fin) : ""].filter(Boolean).join(" · ")}
            {state && <small className="block text-[0.75rem] font-semibold text-acc">{state}</small>}
          </span>
        </button>
        {big && (
          <>
            <ol className="border-t border-line">
              {r.finishes.map((f) => (
                <li key={f.id} className="flex items-center gap-3 border-b border-line px-4 py-2 text-[0.9375rem] last:border-b-0">
                  <i className={`grid size-[1.625rem] shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold not-italic ${f.code ? "bg-bg text-mut" : pl[f.id] === 1 ? "bg-[#f6d77a] text-[#5a4300]" : pl[f.id] === 2 ? "bg-[#dfe3e8] text-[#3d4554]" : pl[f.id] === 3 ? "bg-[#ecc9a6] text-[#5b3a1a]" : "bg-bg text-fg2"}`}>
                    {f.code ? "–" : pl[f.id]}
                  </i>
                  <b className="min-w-0 flex-1 truncate font-semibold">{f.name}</b>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-mut">{f.code || (f.t != null ? mmss(f.t) : "")}</span>
                </li>
              ))}
            </ol>
            <div className="flex gap-2 px-3 pb-3 pt-1">
              <button type="button" onClick={() => onOpen(r.id)} className={sub}>Düzelt</button>
              <button type="button" onClick={() => share(r)} className={sub}>Paylaş</button>
            </div>
            {table.races.length > 1 && <p className="truncate px-4 pb-3 text-[0.8125rem] text-mut">Genel durum: {table.rows.slice(0, 3).map((x) => `${first(x.name)} ${x.net}`).join(" · ")} puan</p>}
          </>
        )}
      </div>
    );
  };
  return {
    today,
    marks: null,
    empty: today.length ? null : <li className="px-4 py-3 text-[0.875rem] text-mut">Bugün yarış yok</li>,
    row,
    add: (
      <button type="button" onClick={onAdd} data-press="row" className="w-full px-4 py-3 text-left text-[0.9375rem] font-semibold text-acc">
        Yarış ekle
      </button>
    ),
    sheet: null,
  };
}
