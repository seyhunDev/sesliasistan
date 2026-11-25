"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/ToastProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { loadRoundsOf, loadSheets, saveRounds } from "@/features/athletes/raceLiveStore";
import { ensurePublic } from "@/features/liveScreen/liveActions";
import { raceName } from "@/lib/raceLive";
import { cleanEntry, currentStart, stampLegs, markName, nowPos, setRoute, whoBySail, whoOf } from "@/lib/raceRounds";
import { applySay, checkLeg, cleanRoute, entriesOf, entryClasses, localSay, notYet } from "@/lib/roundSay";
import { loadEntryDoc, sayOps } from "./roundsStore";
import { GROUP_PICK, groupColor, groupMap, groupsOn } from "@/lib/roundScore";
import { EntriesView } from "./EntriesView";

// Şamandıra dönüşlerini sesle girme (Seyhun 2026-11-01, örnek /mnt/project-files/samandira-donus/ornek2.png): tam ekran.
// "Konuş" ile numaralar sırayla söylenir ("24, 3542, 2"), düzeltme de sesle ("7. sırayı 512 yap", "7'yi sil", "5'ten sonra 88 ekle",
// "sonraki şamandıra", "parkur 1 4 1 2 3 finiş"). Söylenen yapay zekaya gider (api/round-say), yoksa yalnız numaralar eklenir.
// Üstte startın grubu (Mavi, Sarı…, Altın; sesle "sarı grup"); günün grup listesi varsa numaralar o grupla denetlenir.
// Numaralar kayıt listesiyle denetlenir: listede yoksa satır sarı, en yakın numaralar önerilir. Dönüşler canlı ekrana yazılır.
const noop = () => () => {};
const clsKey = (raceId) => `rnd-cls-${raceId}`;
const readCls = (raceId) => {
  try {
    return localStorage.getItem(clsKey(raceId));
  } catch {
    return null;
  }
};

// startId: yayın sayfasında seçilen yarış (yoksa sayacın yarışı; Seyhun 2026-11-01 "orada yarış seçmeliyiz")
// onStart: sesle başka grup söylenince o grubun yarışına geçildi (yayın sayfası seçimi izler)
export function RoundsScreen({ open, onClose, orgId, raceId, startId = "", onStart = null }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  if (!client || !open) return null;
  return createPortal(<Body orgId={orgId} raceId={raceId} startId={startId} onStart={onStart} onClose={onClose} />, document.body);
}

function Body({ orgId, raceId, startId = "", onStart = null, onClose }) {
  // Sesle grup (Seyhun 2026-11-04 aynı anda üç grup): "Sarı birinci şamandıra 12 34" Sarı'nın süren yarışına geçer, sonra yazar
  const [curId, setCurId] = useState(startId);
  const pendRef = useRef("");
  const startOf = (d) => (curId && d.starts.find((x) => x.id === curId)) || currentStart(d.starts, d.timer);
  const toast = useToast();
  const [L, setL] = useState(null);
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState({});
  const [sheetWho, setSheetWho] = useState({});
  const [cls, setCls] = useState(() => readCls(raceId));
  const [entry, setEntry] = useState({ route: [], legs: [] });
  const [k, setK] = useState(0);
  const [hist, setHist] = useState([]);
  const [heard, setHeard] = useState("");
  const [busy, setBusy] = useState(false);
  const [openRow, setOpenRow] = useState(-1);
  const [menu, setMenu] = useState(false);
  const [list, setList] = useState(false);
  const [routeText, setRouteText] = useState(null);
  const [missing, setMissing] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let off = false;
    Promise.all([loadRoundsOf(orgId, raceId), loadEntryDoc(orgId, raceId).catch(() => ({ rows: [], groups: {} }))]).then(
      ([d, en]) => {
        if (off) return;
        setL(d);
        setEntries(en.rows);
        setGroups(en.groups);
        const st = startOf(d);
        const e = st ? cleanEntry(d.rounds[st.id] || { route: cleanRoute(st.course), legs: [] }) : { route: [], legs: [] };
        setEntry(e);
        setK(Math.max(0, nowPos(e)));
        if (!e.route.length) setRouteText("");
      },
      () => toast("Yüklenemedi, tekrar dene."),
    );
    loadSheets(orgId, raceId)
      .then((s) => !off && setSheetWho(whoBySail(s.flatMap((x) => x.fleets || []))))
      .catch(() => {});
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, raceId]);

  const st = L ? startOf(L) : null;
  const classes = useMemo(() => entryClasses(entries), [entries]);
  const pickCls = classes.some((c) => c.cls === cls) ? cls : classes[0]?.cls || "";
  // Günün grup listesi varsa yalnız bu startın grubundakiler (gruplar her gün değişir)
  const gm = useMemo(() => groupMap(groupsOn(groups, st?.day || "")), [groups, st?.day]);
  const inGrp = entry.grp && Object.values(gm).includes(entry.grp);
  const pool = useMemo(() => entriesOf(entries, pickCls).filter((r) => !inGrp || gm[r.sail] === entry.grp), [entries, pickCls, inGrp, gm, entry.grp]);
  const known = useMemo(() => pool.map((r) => r.sail), [pool]);
  const who = useMemo(() => Object.fromEntries(entries.map((r) => [r.sail, r])), [entries]);
  const leg = entry.legs[k] || [];
  const checks = checkLeg(leg, known);

  const commit = async (next, msg) => {
    const e = stampLegs({ grp: entry.grp, pen: entry.pen, tm: entry.tm, ...next }); // her numaraya söylendiği an (lidere fark)
    setHist((h) => [...h.slice(-30), { entry, k }]);
    setEntry(e);
    try {
      await saveRounds(orgId, raceId, st.id, e, entry);
      ensurePublic(raceId).catch(() => {});
      if (msg) toast(msg);
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    }
  };
  const undo = async () => {
    const last = hist.at(-1);
    if (!last) return;
    setHist((h) => h.slice(0, -1));
    setEntry(last.entry);
    setK(last.k);
    try {
      await saveRounds(orgId, raceId, st.id, last.entry, entry);
      toast("Geri alındı");
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    }
  };

  const handle = async (text) => {
    const t = String(text || "").trim();
    if (!t || !st) return;
    setHeard(t);
    setBusy(true);
    let ops = null;
    try {
      ops = await sayOps({ text: t, leg, known, route: entry.route, k });
    } catch (e) {
      ops = localSay(t, known);
      if (!ops) {
        setBusy(false);
        return toast(e.status === 429 ? "Yapay zeka şu an meşgul. Yalnız numaraları söyle." : "İnternet yok gibi. Yalnız numaraları söyle.");
      }
    }
    setBusy(false);
    if (!ops.length) return toast("Anlaşılamadı, tekrar söyle.");
    // başka grubun adı söylendiyse (bu yarışın grubu değil) o grubun bugünkü yarışı: önce süren, yoksa en son biten
    const say = ops.find((o) => o.op === "grp")?.grp || "";
    if (say && say !== (entry.grp || st.grp || "")) {
      const d = await loadRoundsOf(orgId, raceId).catch(() => null);
      const gOf = (x) => x.grp || d?.rounds?.[x.id]?.grp || "";
      const mine = (d?.starts || []).filter((x) => !x.void && x.day === st.day && gOf(x) === say && Date.parse(x.at) <= Date.now());
      const tgt = mine.filter((x) => !x.fin).at(-1) || mine.at(-1);
      if (tgt) {
        const e = cleanEntry(d.rounds[tgt.id] || { route: cleanRoute(tgt.course), legs: [] });
        setL(d);
        setEntry(e);
        setK(Math.max(0, nowPos(e)));
        setHist([]);
        onStart?.(tgt.id);
        toast(`${say} grup · ${raceName(tgt)}`);
        if (ops.some((o) => o.op !== "grp")) pendRef.current = t;
        setCurId(tgt.id);
        return;
      }
      // grubu belli yarış başka grubun adıyla yeniden adlanmaz (yanlış gruba yazmasın)
      if (entry.grp || st.grp) return toast(`${say} grubun bugün başlamış yarışı yok`);
    }
    const routeOp = ops.find((o) => o.op === "route");
    let base = entry;
    if (routeOp) base = setRoute(entry, routeOp.route);
    if (!base.route.length) return toast("Önce parkuru söyle: parkur 1 4 1 2 3 finiş");
    const r = applySay({ legs: base.legs, k: Math.min(k, base.route.length - 1), route: base.route, grp: entry.grp, pen: entry.pen }, ops.filter((o) => o.op !== "route"), known);
    const notes = [];
    if (r.dup.length) notes.push(`${r.dup.join(", ")} zaten yazılı`);
    if (r.skip.length) notes.push("bir kısmı uygulanamadı");
    if (r.k !== k) notes.unshift(markName(base.route[r.k]));
    if (r.grp && r.grp !== entry.grp) notes.unshift(`${r.grp} grup`);
    for (const o of ops) if (o.op === "pen" && o.sails?.length) notes.unshift(o.code === "-" ? `${o.sails.join(", ")} cezası kalktı` : `${o.code} ${o.sails.join(", ")}`);
    setK(r.k);
    if (!r.done && !routeOp) return toast(notes.join(", ") || "Değişiklik yok");
    await commit({ route: base.route, legs: r.legs, grp: r.grp || entry.grp || "", pen: r.pen }, notes.join(", "));
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }));
  };

  // gruba geçtikten sonra aynı cümlenin geri kalanı o grubun yarışına yazılır
  useEffect(() => {
    if (!pendRef.current) return;
    const t = pendRef.current;
    pendRef.current = "";
    handle(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curId]);
  const sp = useSpeech({ names: [], terms: ["şamandıra", "parkur", "finiş", "sıra", "grup", "OCS", "BFD", "DSQ", "DNF", "kara bayrak", ...GROUP_PICK], onFinal: handle, onFail: (m) => toast(m) });
  const listening = sp.status === "listening";
  const talk = () => (listening ? sp.stop("send") : sp.start({ autoStop: 20000 }));

  const edit = (fn) => {
    const legs = entry.legs.map((l) => [...l]);
    if (!legs[k]) return;
    fn(legs[k]);
    setOpenRow(-1);
    commit({ route: entry.route, legs });
  };
  const saveRoute = () => {
    const r = cleanRoute(routeText);
    if (r.length < 2) return toast("Örnek: 1 4 1 2 3 F");
    commit(setRoute(entry, r), "Parkur kaydedildi");
    setK((x) => Math.min(x, r.length - 1));
    setRouteText(null);
  };
  const chooseCls = (c) => {
    setCls(c);
    try {
      localStorage.setItem(clsKey(raceId), c);
    } catch {}
  };

  const total = pool.length || null;
  const rest = notYet(entry.legs, k, known);
  const label = (s) => who[s] || whoOf(sheetWho, s);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
      {list && (
        <div className="absolute inset-0 z-10 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
          <EntriesView onClose={() => setList(false)} orgId={orgId} raceId={raceId} rows={entries} setRows={setEntries} groups={groups} setGroups={setGroups} />
        </div>
      )}
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <BackButton onClick={onClose} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.25rem] font-bold tracking-tight">{st ? `${raceName(st)} · ${entry.route[k] ? markName(entry.route[k]) : "Parkur"}` : "Dönüşler"}</p>
          <p className="truncate text-[0.875rem] text-mut">{[pickCls || (entries.length ? "" : "Kayıt listesi yok"), entry.grp ? `${entry.grp} grup` : "", total ? `${total} tekne` : ""].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      {!L ? (
        <div className="flex-1" />
      ) : !st ? (
        <p className="px-5 py-6 text-mut">Önce yarışı başlat; dönüşler o yarışa yazılır.</p>
      ) : (
        <>
          {classes.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2">
              {classes.map((c) => (
                <button key={c.cls} type="button" onClick={() => chooseCls(c.cls)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.875rem] font-semibold ${c.cls === pickCls ? "border-acc bg-acc text-white" : "border-line bg-card"}`}>
                  {c.cls || "Sınıfsız"}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-2">
            {GROUP_PICK.map((g) => {
              const on = entry.grp === g;
              return (
                <button key={g} type="button" onClick={() => commit({ ...entry, grp: on ? "" : g }, on ? "Grup kaldırıldı" : `${g} grup`)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.875rem] font-semibold ${on ? "border-acc bg-acc text-white" : "border-line bg-card"}`}>
                  <span className="size-2.5 rounded-full" style={{ background: groupColor(g) }} />
                  {g}
                </button>
              );
            })}
          </div>
          {routeText !== null ? (
            <div className="flex gap-2 px-4 pb-2">
              <input value={routeText} onChange={(e) => setRouteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveRoute()} placeholder="Parkur: 1 4 1 2 3 F" inputMode="numeric" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2.5 outline-none" />
              <Button full={false} onClick={saveRoute}>
                Kaydet
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5 px-4 pb-2">
              {entry.route.map((m, i) => (
                <button key={i} type="button" onClick={() => (setK(i), setOpenRow(-1))} className={`min-w-0 flex-1 rounded-[0.625rem] border py-1.5 text-[0.9375rem] font-semibold ${i === k ? "border-acc bg-acc text-white" : entry.legs[i]?.length ? "border-line bg-card" : "border-line bg-card text-mut"}`}>
                  {m}
                  {i !== k && entry.legs[i]?.length ? <span className="ml-0.5 text-ok">✓</span> : null}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-between px-5 pb-1.5 pt-1 text-[0.875rem] text-mut">
            <span>Geçenler</span>
            <span className="tabular-nums">{total ? `${leg.length}/${k > 0 ? entry.legs[k - 1]?.length || total : total}` : leg.length}</span>
          </div>
          <div ref={listRef} className="mx-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-card">
            {checks.map((c, i) => {
              const w = label(c.sail);
              const warn = !c.ok;
              return (
                <div key={`${c.sail}-${i}`} className={`border-b border-line last:border-0 ${warn ? "bg-warnbg" : ""}`}>
                  <button type="button" onClick={() => setOpenRow(openRow === i ? -1 : i)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                    <span className="w-6 text-right text-[0.875rem] tabular-nums text-mut">{i + 1}</span>
                    <span className="w-14 text-[1.1875rem] font-semibold tabular-nums">{c.sail}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{warn ? "Listede yok" : w?.name || "–"}</span>
                      <span className={`block truncate text-[0.8125rem] ${warn ? "text-warn" : "text-mut"}`}>{warn ? (c.near.length ? `${c.near.join(" ya da ")} mü?` : "Benzeri yok") : w?.club || ""}</span>
                    </span>
                    {warn &&
                      c.near.slice(0, 2).map((n) => (
                        <span
                          key={n}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => (e.stopPropagation(), edit((l) => l.splice(i, 1, n)))}
                          className="rounded-[0.625rem] border border-warn bg-card px-2.5 py-1 text-[0.875rem] font-semibold tabular-nums text-warn"
                        >
                          {n}
                        </span>
                      ))}
                  </button>
                  {openRow === i && (
                    <div className="grid grid-cols-3 gap-2 px-3 pb-2.5">
                      <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => edit((l) => l.splice(i - 1, 0, ...l.splice(i, 1)))}>
                        Yukarı
                      </Button>
                      <Button variant="secondary" size="sm" disabled={i === leg.length - 1} onClick={() => edit((l) => l.splice(i + 1, 0, ...l.splice(i, 1)))}>
                        Aşağı
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => edit((l) => l.splice(i, 1))}>
                        Sil
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {!leg.length && <p className="px-4 py-5 text-mut">{entries.length ? "Konuş'a dokun, geçen numaraları sırayla söyle." : "Önce kayıt listesini ekle (⋯ › Kayıt listesi)."}</p>}
          </div>
          {missing && (
            <div className="mx-4 mt-2 max-h-28 overflow-y-auto rounded-2xl border border-line bg-card px-3 py-2 text-[0.9375rem]">
              <span className="text-mut">{`Henüz geçmeyen ${rest.length}: `}</span>
              <span className="tabular-nums">{rest.join(", ") || "yok"}</span>
            </div>
          )}
          <p className="mx-4 mt-2 truncate rounded-xl border border-line bg-card px-3 py-2.5 text-[0.9375rem]">
            <span className="text-mut">{listening ? "Dinliyor: " : busy ? "Anlaşılıyor: " : "Duyulan: "}</span>
            {listening ? `${sp.finalText || ""}${sp.interim || ""}` : heard || "–"}
          </p>
        </>
      )}

      <div className="flex items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <Button variant="secondary" full={false} className="size-13 shrink-0 !px-0 text-xl" aria-label="Geri al" disabled={!hist.length || busy} onClick={undo}>
          ↶
        </Button>
        <button type="button" data-press disabled={!st || busy} onClick={talk} className={`h-16 min-w-0 flex-1 rounded-full text-[1.125rem] font-semibold text-white disabled:opacity-50 ${listening ? "bg-rec" : "bg-acc"}`}>
          {listening ? "Bitti" : busy ? "Anlaşılıyor…" : "Konuş"}
        </button>
        <Button variant="secondary" full={false} className="size-13 shrink-0 !px-0 text-xl" aria-label="Diğer" onClick={() => setMenu(true)}>
          ⋯
        </Button>
      </div>

      {menu && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/40" onClick={() => setMenu(false)}>
          <div className="rounded-t-[1.5rem] bg-bg px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
              {[
                ["Kayıt listesi", () => setList(true), entries.length ? `${entries.length}` : "Yok"],
                ["Parkuru değiştir", () => setRouteText(entry.route.join(" ")), entry.route.join(" · ") || ""],
                [missing ? "Geçmeyenleri gizle" : "Henüz geçmeyenler", () => setMissing((x) => !x), st ? `${rest.length}` : ""],
                ["Bu şamandırayı temizle", () => leg.length && edit((l) => l.splice(0)), ""],
              ].map(([t, fn, v]) => (
                <button key={t} type="button" disabled={!st && t !== "Kayıt listesi"} onClick={() => (setMenu(false), fn())} className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left text-[0.9375rem] font-semibold last:border-0 disabled:opacity-40">
                  <span className="min-w-0 flex-1">{t}</span>
                  <span className="truncate text-mut">{v}</span>
                </button>
              ))}
            </div>
            <Button variant="secondary" full className="mt-2" onClick={() => setMenu(false)}>
              Kapat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
