"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { lastZero } from "@/features/training/Countdown";
import { CODES, addFinish, cleanRaces, mmss, moveFinish, newRace, places, removeFinish, setCode, standings, startFor } from "@/lib/raceScore";

const stamp = () => Date.now();

// Antrenman yarışları penceresi: bugünün yarışları + puan durumu → yarışa dokun → bitiş sırası.
// Bitiş: bekleyen sporcunun adına dokun, sıradaki yeri alır. Sıradakine dokun: DNF/DNS/BFD/OCS/RET/DSQ, sıra değiştir, çıkar.
// Sayaçla da sayaçsız da çalışır; sayaç 0'a ulaştıysa ilk bitişte o an start sayılır ve süreler yazılır.
// Kayıt antrenman planının `races` alanına (lib/raceScore.js); her dokunuş hemen yazılır.
export function Races({ open, onClose, races, onSave, present, others }) {
  const [rid, setRid] = useState(null); // açık yarış
  const [who, setWho] = useState(null); // kod penceresindeki sporcu
  const [more, setMore] = useState(false); // yoklamada olmayan sporcular
  const [now, setNow] = useState(0);
  const race = races.find((r) => r.id === rid);
  const close = () => {
    setRid(null);
    onClose();
  };
  const openRace = (id) => {
    setNow(stamp());
    setRid(id);
  };
  useEffect(() => {
    if (!race?.startAt) return;
    const id = setInterval(() => setNow(stamp()), 1000);
    return () => clearInterval(id);
  }, [race?.startAt]);

  const save = (list) => onSave(cleanRaces(list));
  const put = (r) => save(races.map((x) => (x.id === r.id ? r : x)));
  const create = () => {
    const r = newRace(races);
    save([...races, r]);
    openRace(r.id);
  };
  const finish = (a) => {
    const st = startFor(race, races, lastZero());
    const n = stamp();
    setNow(n);
    put(addFinish(st != null ? { ...race, startAt: st } : race, a, n));
  };
  const drop = () => {
    save(races.filter((r) => r.id !== rid));
    setRid(null);
  };

  const table = standings(races, present);
  const winner = (r) => r.finishes.find((f) => !f.code)?.name.split(" ")[0];

  return (
    <>
      <Sheet open={open} onClose={close} title={race ? race.name : "Bugünkü yarışlar"}>
        {race ? (
          <RaceView
            key={race.id}
            race={race}
            now={now}
            waiting={present.filter((a) => !race.finishes.some((f) => f.id === a.id))}
            others={others.filter((a) => !race.finishes.some((f) => f.id === a.id))}
            more={more}
            onMore={() => setMore((m) => !m)}
            onName={(name) => put({ ...race, name })}
            onFinish={finish}
            onRow={setWho}
            onBack={() => setRid(null)}
            onDelete={drop}
          />
        ) : (
          <>
            {races.length > 0 && (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {races.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => openRace(r.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left active:bg-bg">
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{r.name}</span>
                      <span className="shrink-0 text-[0.875rem] text-mut">{winner(r) ? `${winner(r)} birinci` : "Sonuç yok"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {races.length > 0 && table.rows.length > 0 && <Table table={table} races={races} />}
            <button onClick={create} className="mt-4 h-12 w-full rounded-2xl bg-acc text-[1rem] font-semibold text-white active:scale-[.99]">
              Yeni yarış
            </button>
          </>
        )}
      </Sheet>
      <CodeSheet
        f={race?.finishes.find((x) => x.id === who)}
        place={race && who ? places(race)[who] : null}
        penalty={table.penalty}
        n={table.n}
        onClose={() => setWho(null)}
        onCode={(c) => put(setCode(race, who, c))}
        onMove={(d) => put(moveFinish(race, who, d))}
        onRemove={() => {
          put(removeFinish(race, who));
          setWho(null);
        }}
      />
    </>
  );
}

function RaceView({ race, now, waiting, others, more, onMore, onName, onFinish, onRow, onBack, onDelete }) {
  const [name, setName] = useState(race.name);
  const [sure, setSure] = useState(false); // silmek için ikinci dokunuş
  const pl = places(race);
  const nb = "min-h-12 rounded-xl border border-line bg-card px-2 py-2 text-[0.9375rem] font-medium shadow-[0_2px_0_var(--line)] active:translate-y-px active:shadow-none";
  return (
    <div className="pb-2">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="h-9 shrink-0 rounded-full bg-bg px-3 text-[0.875rem] font-semibold text-acc">‹ Yarışlar</button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== race.name && onName(name.trim())}
          aria-label="Yarışın adı"
          className="h-9 min-w-0 flex-1 rounded-xl bg-bg px-3 text-[0.9375rem] outline-none"
        />
      </div>
      {race.startAt && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-line px-4 py-2.5">
          <span className="text-[0.9375rem] text-fg2">Startan beri</span>
          <b className="text-[1.75rem] font-semibold tabular-nums">{mmss(Math.max(0, Math.floor((now - race.startAt) / 1000)))}</b>
        </div>
      )}
      {race.finishes.length > 0 && (
        <>
          <p className="mb-1.5 mt-4 text-[0.875rem] font-semibold text-fg2">Bitiş sırası</p>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {race.finishes.map((f) => (
              <li key={f.id}>
                <button onClick={() => onRow(f.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-bg">
                  <span className={`w-9 shrink-0 text-[0.9375rem] font-semibold ${f.code ? "text-rec" : "text-acc"}`}>{f.code || pl[f.id]}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{f.name}</span>
                  {f.t != null && <span className="shrink-0 text-[0.875rem] tabular-nums text-mut">{mmss(f.t)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {waiting.length > 0 && (
        <>
          <p className="mb-1.5 mt-4 text-[0.875rem] font-semibold text-fg2">Bekleyenler · {waiting.length}</p>
          <div className="grid grid-cols-2 gap-2">
            {waiting.map((a) => (
              <button key={a.id} onClick={() => onFinish(a)} className={nb}>{a.name}</button>
            ))}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          <button onClick={onMore} className="mt-4 w-full rounded-xl py-2 text-[0.875rem] font-semibold text-acc">
            {more ? "Diğer sporcuları gizle" : `Yoklamada olmayanlar · ${others.length}`}
          </button>
          {more && (
            <div className="grid grid-cols-2 gap-2">
              {others.map((a) => (
                <button key={a.id} onClick={() => onFinish(a)} className={`${nb} text-fg2`}>{a.name}</button>
              ))}
            </div>
          )}
        </>
      )}
      <button onClick={() => (sure ? onDelete() : setSure(true))} className="mt-5 w-full py-2 text-[0.875rem] font-semibold text-rec">
        {sure ? "Silmek için tekrar dokun" : "Yarışı sil"}
      </button>
    </div>
  );
}

function Table({ table, races }) {
  const { rows, n, discard } = table;
  return (
    <>
      <p className="mb-1 mt-5 text-[0.875rem] font-semibold text-fg2">
        Puan durumu · {n} sporcu{discard ? " · en kötü sonuç atıldı" : ""}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.875rem] tabular-nums">
          <thead>
            <tr className="border-b border-line text-[0.75rem] text-mut">
              <th className="w-6 py-1.5" />
              <th className="py-1.5 text-left font-semibold">Sporcu</th>
              {races.map((r, i) => (
                <th key={r.id} className="px-1 py-1.5 font-semibold">Y{i + 1}</th>
              ))}
              <th className="py-1.5 pl-1 font-semibold">Puan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="py-2 text-center font-semibold text-mut">{r.rank}</td>
                <td className="max-w-[8rem] truncate py-2">{r.name}</td>
                {r.cells.map((c, i) => (
                  <td key={i} className={`px-1 py-2 text-center ${c.drop ? "text-mut" : ""}`}>
                    {c.drop ? `(${c.pts})` : c.pts}
                    {c.code && <small className="block text-[0.6875rem] font-semibold leading-none text-rec">{c.code}</small>}
                  </td>
                ))}
                <td className="py-2 pl-1 text-center font-semibold">{r.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CodeSheet({ f, place, penalty, n, onClose, onCode, onMove, onRemove }) {
  const cell = (on) => `rounded-xl border px-1 py-2 text-center active:scale-95 ${on ? "border-rec bg-rec text-white" : "border-line bg-bg"}`;
  return (
    <Sheet open={!!f} onClose={onClose} title={f ? `${f.name}${place ? ` · ${place}.` : ""}` : ""}>
      {f && (
        <div className="pb-2">
          <div className="grid grid-cols-3 gap-2">
            {CODES.map(([k, l]) => (
              <button key={k} onClick={() => onCode(f.code === k ? "" : k)} className={cell(f.code === k)}>
                <b className="block text-[1rem] font-semibold">{k}</b>
                <small className={`text-[0.75rem] ${f.code === k ? "text-white" : "text-fg2"}`}>{l}</small>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.875rem] text-fg2">
            Kodlu sonuç {penalty} puan · katılan {n} sporcu + 1
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => onMove(-1)} className="h-11 flex-1 rounded-xl border border-line text-[0.9375rem] font-semibold">Yukarı</button>
            <button onClick={() => onMove(1)} className="h-11 flex-1 rounded-xl border border-line text-[0.9375rem] font-semibold">Aşağı</button>
          </div>
          <button onClick={onRemove} className="mt-3 w-full py-2 text-[0.9375rem] font-semibold text-rec">Sıradan çıkar</button>
        </div>
      )}
    </Sheet>
  );
}
