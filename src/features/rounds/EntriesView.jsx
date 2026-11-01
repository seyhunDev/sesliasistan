"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { loadSheets } from "@/features/athletes/raceLiveStore";
import { sheetMatch } from "@/lib/resultSheet";
import { entryClasses, mergeEntries } from "@/lib/roundSay";
import { readEntryFile, readEntryText, saveEntries, saveGroups } from "./roundsStore";
import { cleanGroups, groupColor, groupMap } from "@/lib/roundScore";

// Yarışın kayıt listesi (sesle dönüş girişinin denetimi): organizasyonun listesi PDF, fotoğraf ya da Excel'den yapay zekayla okunur,
// günün grup listesi (Mavi, Sarı…; satırlarda grup yazan liste) aynı düğmeyle eklenir ve bugüne yazılır,
// önceki günlerin sonuç listelerinden alınabilir, yazılarak ya da söylenerek eklenir ("1234 Ali Kaya Dikili"). Yeni okunan eskisine eklenir.
const today = () => new Date().toLocaleDateString("sv-SE");

export function EntriesView({ onClose, orgId, raceId, rows, setRows, groups = {}, setGroups }) {
  const toast = useToast();
  const file = useRef(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("");
  const [sure, setSure] = useState(false);
  const [sheetRows, setSheetRows] = useState([]);
  const sp = useSpeech({ onFinal: (t) => setText((p) => (p ? `${p}\n${t}` : t)), onFail: (m) => toast(m) });
  const listening = sp.status === "listening";

  useEffect(() => {
    loadSheets(orgId, raceId)
      .then((s) => setSheetRows(s.flatMap((x) => (x.fleets || []).flatMap((f) => (f.rows || []).map((r) => ({ sail: r.sail, name: r.name, club: r.club, cls: f.cls, born: r.born, sex: r.sex, cat: r.cat }))))))
      .catch(() => {});
  }, [orgId, raceId]);

  const put = async (add, what) => {
    // Grup listesi (satırlarda grup yazıyorsa): bugünün grupları olarak da kaydedilir; gruplar her gün değişir
    const grouped = add.filter((r) => r.grp);
    if (grouped.length) {
      const list = grouped.map((r) => [r.sail, r.grp]);
      await saveGroups(orgId, raceId, today(), list);
      setGroups?.((g) => ({ ...g, ...cleanGroups({ [today()]: list }) }));
    }
    const next = mergeEntries(rows, add);
    const n = next.length - rows.length;
    await saveEntries(orgId, raceId, next);
    setRows(next);
    toast(`${what}: ${add.length} tekne${n > 0 && n !== add.length ? `, ${n} yeni` : ""}`);
  };
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e?.message || "Okunamadı, tekrar dene.");
    }
    setBusy(false);
  };
  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) run(async () => put(await readEntryFile(f), "Okundu"));
  };
  const addText = () => text.trim() && run(async () => (await put(await readEntryText(text), "Eklendi"), setText("")));
  const drop = (r) =>
    run(async () => {
      const next = rows.filter((x) => x !== r);
      await saveEntries(orgId, raceId, next);
      setRows(next);
      setOpen("");
    });
  const clear = () =>
    run(async () => {
      await saveEntries(orgId, raceId, []);
      setRows([]);
      setSure(false);
    });

  const classes = useMemo(() => entryClasses(rows), [rows]);
  const gm = groupMap(groups[today()]);
  const gCount = Object.values(gm).reduce((m, g) => ((m[g] = (m[g] || 0) + 1), m), {});
  const shown = rows.filter((r) => sheetMatch(r, q)).sort((a, b) => Number(a.sail) - Number(b.sail));

  return (
    <>
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <BackButton onClick={onClose} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.25rem] font-bold tracking-tight">Kayıt listesi</p>
          <p className="truncate text-[0.875rem] text-mut">{rows.length ? `${rows.length} tekne${classes.length > 1 ? ` · ${classes.map((c) => `${c.cls || "Sınıfsız"} ${c.n}`).join(", ")}` : ""}` : "Boş"}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className={`grid gap-2 ${sheetRows.length ? "grid-cols-2" : "grid-cols-1"}`}>
          <Button variant="secondary" loading={busy} onClick={() => file.current?.click()}>
            PDF / foto / Excel
          </Button>
          {sheetRows.length > 0 && (
            <Button variant="secondary" disabled={busy} onClick={() => run(() => put(sheetRows, "Sonuçlardan"))}>
              Sonuçlardan al
            </Button>
          )}
        </div>
        <input ref={file} type="file" accept="application/pdf,image/*,.xls,.xlsx,.csv,.ods,text/csv" className="hidden" onChange={pick} />

        <div className="rounded-2xl border border-line bg-card p-2">
          {listening ? (
            <p className="min-h-16 px-2 py-1.5 text-[0.9375rem]">{`${sp.finalText || ""}${sp.interim || ""}` || <span className="text-mut">Dinliyorum…</span>}</p>
          ) : (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="1234 Ali Kaya, Dikili YK" className="w-full resize-none bg-transparent px-2 py-1.5 text-[0.9375rem] outline-none [field-sizing:content] placeholder:text-mut" />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" full={false} onClick={() => (listening ? sp.stop("edit") : sp.start({ autoStop: 15000 }))}>
              {listening ? "Bitti" : <Icon name="mic" className="size-[1.125rem]" />}
            </Button>
            <Button size="sm" disabled={busy || listening || !text.trim()} onClick={addText}>
              Ekle
            </Button>
          </div>
        </div>

        {Object.keys(gCount).length > 0 && (
          <p className="rounded-xl border border-line bg-card px-3 py-2.5 text-[0.9375rem]">
            <span className="text-mut">Bugünün grupları: </span>
            {Object.entries(gCount)
              .map(([g, n]) => `${g} ${n}`)
              .join(" · ")}
          </p>
        )}
        {rows.length > 0 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: no, ad, kulüp" className="w-full rounded-xl border border-line bg-card px-3 py-2.5 outline-none" />}

        {shown.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {shown.map((r) => {
              const key = `${r.cls}|${r.sail}`;
              return (
                <div key={key} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => setOpen(open === key ? "" : key)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                    <span className="w-14 text-[1.0625rem] font-semibold tabular-nums">{r.sail}</span>
                    {gm[r.sail] ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(gm[r.sail]) }} aria-label={gm[r.sail]} /> : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{r.name || "–"}</span>
                      <span className="block truncate text-[0.8125rem] text-mut">{[r.club, r.born, r.sex === "K" ? "Kız" : "", classes.length > 1 ? r.cls : ""].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                  {open === key && (
                    <div className="px-3 pb-2.5">
                      <Button variant="danger" size="sm" disabled={busy} onClick={() => drop(r)}>
                        Sil
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {rows.length > 0 &&
          (sure ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setSure(false)}>
                Vazgeç
              </Button>
              <Button variant="danger" disabled={busy} onClick={clear}>
                Hepsini sil
              </Button>
            </div>
          ) : (
            <Button variant="text" onClick={() => setSure(true)}>
              Listeyi temizle
            </Button>
          ))}
      </div>
    </>
  );
}
