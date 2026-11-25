"use client";

// Yayın › Dönüşler › Tekne takibi (Seyhun 2026-11-02): takibi aç/kapat, teknelere link, yayında harita, konumdan gelen dönüşler.
// Tekne sıradaki şamandırasının yanından geçince (lib/boatTrack.js stepWatch) dönüş önerisi çıkar: "Yaz" ile kayda girer;
// "Kendiliğinden yaz" açıksa öneri beklemeden yazılır. Algılama bu sayfa açıkken yapılır (konumlar canlı dinlenir).
import { useEffect, useRef, useState } from "react";
import { card } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { loadRoundsOf, saveRounds } from "@/features/athletes/raceLiveStore";
import { ensurePublic } from "@/features/liveScreen/liveActions";
import { markName } from "@/lib/raceRounds";
import { markPlace, nextMark, placeRound, startOfBoat, stepWatch, trackUrl } from "@/lib/boatTrack";
import { loadTrack, saveTrack, watchBoats } from "./trackStore";

const AUTO = "takip-oto";
const readAuto = () => {
  try {
    return localStorage.getItem(AUTO) === "1";
  } catch {
    return false;
  }
};
const hms = (t) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const row = "flex w-full items-center gap-3 px-4 py-3 text-left";

// starts: bugün süren startlar ({ id, grp }); rounds: L.rounds; groupOf: { yelken: grup } (bugün); course: günün parkuru
export function TrackPanel({ orgId, raceId, starts, rounds, groupOf, course }) {
  const toast = useToast();
  const [tk, setTk] = useState(null); // { on, map, k }
  const [boats, setBoats] = useState([]);
  const [props, setProps] = useState([]); // [{ id, sid, sail, k, mark, t, near }]
  const [auto, setAuto] = useState(readAuto);
  const [now, setNow] = useState(0);
  const watch = useRef(new Map()); // yelken → izleme durumu
  const ctx = useRef({});
  useEffect(() => {
    ctx.current = { starts, rounds, groupOf, course, auto };
  });
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let on = true;
    loadTrack(raceId).then((t) => on && setTk(t));
    return () => {
      on = false;
    };
  }, [raceId]);

  // Dönüşü yazar: her yazımdan önce kayıt sunucudan okunur (aynı anda gelen dönüşler birbirini silmesin), sırayla
  const write = (p) => {
    queue.current = queue.current.then(async () => {
      const L = await loadRoundsOf(orgId, raceId);
      const prev = L.rounds?.[p.sid];
      if (!prev) return;
      const next = placeRound(prev, p.k, p.sail, p.t);
      if (next) await saveRounds(orgId, raceId, p.sid, next, prev);
    });
    return queue.current.catch(() => toast("Dönüş yazılamadı"));
  };

  useEffect(() => {
    if (!tk?.on) return;
    const tick = () => setNow(Date.now());
    const t0 = setTimeout(tick, 0);
    const t = setInterval(tick, 5000);
    const stop = watchBoats(raceId, (list) => {
      setBoats(list);
      const c = ctx.current;
      const hits = [];
      for (const b of list) {
        const st = startOfBoat(b.sail, c.starts, c.groupOf);
        const e = st ? c.rounds?.[st.id] : null;
        const target = e ? nextMark(e, b.sail) : null;
        const place = target ? markPlace(c.course, target.mark) : null;
        const key = `${st?.id || ""}|${b.sail}`;
        const r = stepWatch(watch.current.get(key), b, target, place);
        if (r.watch) watch.current.set(key, r.watch);
        if (r.hit) hits.push({ id: `${st.id}|${r.hit.k}|${b.sail}`, sid: st.id, sail: b.sail, ...r.hit });
      }
      if (!hits.length) return;
      if (c.auto) hits.forEach(write);
      else setProps((p) => [...p.filter((x) => !hits.some((h) => h.id === x.id)), ...hits].sort((a, b) => a.t - b.t).slice(-40));
    });
    return () => {
      stop();
      clearTimeout(t0);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tk?.on, raceId]);

  // kayda girmiş (elle ya da sesle yazılmış) öneri düşer
  const live = props.filter((p) => !(rounds?.[p.sid]?.legs?.[p.k] || []).includes(p.sail));

  const put = async (patch) => {
    try {
      const next = await saveTrack(orgId, raceId, tk, patch);
      setTk(next);
      if (next.on) ensurePublic(raceId).catch(() => {});
    } catch {
      toast("Kaydedilemedi");
    }
  };
  const share = async () => {
    const url = trackUrl(window.location.origin, raceId, tk.k);
    try {
      if (navigator.share) await navigator.share({ title: "Tekne takibi", url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link kopyalandı");
      }
    } catch {}
  };
  const setA = () => {
    const v = !auto;
    setAuto(v);
    try {
      localStorage.setItem(AUTO, v ? "1" : "0");
    } catch {}
    if (v) {
      live.forEach(write);
      setProps([]);
    }
  };

  if (!tk) return <div className={`${card} h-[3.25rem]`} />;
  // parkurda yeri işaretlenmemiş noktalar (Parkur › "burada"): oralarda dönüş algılanmaz
  const routes = [...new Set((starts || []).flatMap((s) => rounds?.[s.id]?.route || []))];
  const noPlace = routes.filter((m) => !markPlace(course, m));
  const fresh = boats.filter((b) => !b.old);
  return (
    <>
      <div className={`${card} overflow-hidden`}>
        <button type="button" onClick={() => put({ on: !tk.on })} className={row} aria-pressed={tk.on}>
          <span className="min-w-0 flex-1 font-semibold">Takip</span>
          <span className="text-[0.875rem] font-semibold text-mut">{tk.on ? `${fresh.length} tekne` : "Kapalı"}</span>
          <span className={`masa-sw${tk.on ? " on" : ""}`} aria-hidden="true" />
        </button>
        {tk.on ? (
          <>
            <button type="button" onClick={() => put({ map: !tk.map })} className={`${row} border-t border-line`} aria-pressed={tk.map}>
              <span className="min-w-0 flex-1 font-semibold">Yayında harita</span>
              <span className={`masa-sw${tk.map ? " on" : ""}`} aria-hidden="true" />
            </button>
            <button type="button" onClick={setA} className={`${row} border-t border-line`} aria-pressed={auto}>
              <span className="min-w-0 flex-1 font-semibold">Dönüşü kendiliğinden yaz</span>
              <span className={`masa-sw${auto ? " on" : ""}`} aria-hidden="true" />
            </button>
            {boats.length ? (
              <div className="masa-sails border-t border-line">
                {boats.map((b) => (
                  <span key={b.sail} className={b.old ? "opacity-40" : ""}>{`${b.sail} · ${Math.max(0, Math.round((now - b.t) / 1000))} sn`}</span>
                ))}
              </div>
            ) : null}
            {noPlace.length ? <p className="border-t border-line px-4 py-3 text-[0.8125rem] font-semibold text-warn">{`Yeri işaretli değil: ${noPlace.map((m) => (m === "F" ? "Finiş hattı" : m)).join(", ")}`}</p> : null}
          </>
        ) : null}
      </div>
      {tk.on && live.length ? (
        <div className={`${card} mt-2 overflow-hidden`}>
          {live.map((p, i) => (
            <div key={p.id} className={`${row} ${i ? "border-t border-line" : ""}`}>
              <b className="tabular-nums">{p.sail}</b>
              <span className="min-w-0 flex-1 truncate text-[0.875rem]">{`${markName(p.mark)} · ${hms(p.t)}`}</span>
              <Button size="sm" variant="text" full={false} onClick={() => setProps((x) => x.filter((y) => y.id !== p.id))}>
                Sil
              </Button>
              <Button size="sm" full={false} onClick={() => (write(p), setProps((x) => x.filter((y) => y.id !== p.id)))}>
                Yaz
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {tk.on ? (
        <div className="mt-2">
          <Button variant="secondary" onClick={share}>
            Teknelere link gönder
          </Button>
        </div>
      ) : null}
    </>
  );
}
