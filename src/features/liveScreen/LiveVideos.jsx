"use client";

// /canli Kamera panelinde ana hesabın videoları (Seyhun 2026-11-05 "arka planda telefondan video çekip gösterebilir miyim"; "buluta
// eklemeyi şarta bağlayalım, sadece telefona eklenecek, isterse seçtiği videoları buluta yükleyebilir"): Video çek → yalnız telefonda
// (künyesi "Telefonda"); seçilenler "Buluta yükle"; buluttaki tek video seçiliyse "Ekrana al" (herkesin ekranında arka plan).
// Kayıt broadcastStore keepForScreen / cloudForScreen (Yayın › Ekran › Kayıtlar ile aynı).
import { useEffect, useState } from "react";
import { saveEvre, saveScreen } from "@/features/athletes/raceLiveStore";
import { cloudForScreen, keepForScreen, keptIds } from "@/features/broadcast/broadcastStore";
import { RecPick } from "@/features/raceMedia/RecPick";
import { recName } from "./liveActions";
import { cleanLive, dayOf } from "@/lib/raceLive";
import { todayStr } from "@/lib/utils/format";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function LiveVideos({ orgId, raceId, live, setLive, screen = null, ev = null, evre = "" }) {
  const [here, setHere] = useState(() => new Set()); // bu telefonda duran videolar
  const [pick, setPick] = useState([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [mine, setMine] = useState(null); // az önce verilen ekran (yayın sayfası belgeyi gecikmeli getirir)
  const today = todayStr();
  const vids = live.media.filter((m) => m.kind === "video" && (m.url || here.has(m.id)));
  const day = vids.filter((m) => dayOf(m.at) === today);
  const list = (day.length ? day : vids).slice(-8).reverse();
  const n = list.length;
  useEffect(() => {
    let on = true;
    keptIds(raceId).then((s) => on && setHere(s), () => {});
    return () => {
      on = false;
    };
  }, [raceId, n]);
  const scr = mine && mine.at === (screen?.at || "") ? mine.s : screen || {};
  const onAir = (m) => scr.kind === "rec" && scr.mid === m.id;
  const sel = list.filter((m) => pick.includes(m.id));
  const phSel = sel.filter((m) => m.ph);
  const one = sel.length === 1 && !sel[0].ph ? sel[0] : null;
  const toggle = (id) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const fail = (e) => (setBusy(""), setMsg(e?.message || "Kaydedilemedi. İnterneti kontrol et."));

  const take = async (file) => {
    if (!file || busy) return;
    setMsg("");
    try {
      const meta = await keepForScreen(orgId, raceId, file, live.starts, setBusy);
      setLive((l) => cleanLive({ ...l, media: [...l.media.filter((x) => x.id !== meta.id), meta] }));
      setHere((s) => new Set([...s, meta.id]));
      setPick([meta.id]);
      setBusy("");
    } catch (e) {
      fail(e);
    }
  };
  const toCloud = async () => {
    setMsg("");
    for (const m of phSel) {
      try {
        const next = await cloudForScreen(orgId, raceId, m, (s) => setBusy(phSel.length > 1 ? `${phSel.indexOf(m) + 1}/${phSel.length} · ${s}` : s));
        if (next) setLive((l) => cleanLive({ ...l, media: l.media.map((x) => (x.id === m.id ? next : x)) }));
      } catch (e) {
        return fail(e);
      }
    }
    setBusy("");
  };
  // Ekrana al: evreye ayrı görüntü atanmışsa o evrenin görüntüsü de bu olur (Yayın › Ekran "Ekrana al" gibi)
  const air = () => {
    const s = onAir(one) ? { kind: "" } : { kind: "rec", mid: one.id };
    const e = evre && ev?.[evre];
    if (e?.vid?.kind) saveEvre(orgId, raceId, evre, { ...e, vid: s }).catch(() => {});
    setMine({ s, at: screen?.at || "" });
    saveScreen(orgId, raceId, s).catch(fail);
  };

  return (
    <div className="lvd">
      {n ? (
        <div className="lvd-ts">
          {list.map((m) => {
            const on = pick.includes(m.id);
            return (
              <button key={m.id} type="button" className={`lvd-t${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(m.id)}>
                <span className="th">
                  {m.thumb ? <img src={m.thumb} alt="" /> : m.url ? <video src={`${m.url}#t=0.5`} preload="metadata" muted playsInline /> : null}
                  {m.dur ? <em>{mmss(m.dur)}</em> : null}
                  {m.ph ? <s>Telefonda</s> : onAir(m) ? <s className="air">Ekranda</s> : null}
                </span>
                <b>{recName(m, live.starts)}</b>
              </button>
            );
          })}
        </div>
      ) : null}
      {msg ? <p className="lst-msg">{msg}</p> : null}
      <div className="lvd-bs">
        <RecPick onFile={take} className="lvd-b" aria-busy={!!busy}>
          {busy || "Video çek"}
        </RecPick>
        {phSel.length && !busy ? (
          <button type="button" className="lvd-b go" onClick={toCloud}>
            {phSel.length > 1 ? `Buluta yükle (${phSel.length})` : "Buluta yükle"}
          </button>
        ) : one && !busy ? (
          <button type="button" className="lvd-b go" onClick={air}>
            {onAir(one) ? "Ekrandan kaldır" : "Ekrana al"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
