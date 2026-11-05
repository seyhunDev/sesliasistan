"use client";

// /canli Video sekmesi (ana hesap, yalnız uygulama içinde; Seyhun 2026-11-05 "canlı yayına göndermeyelim, o sadece benim uygulamamda,
// iPad'imde, telefonumda olsun; canlı yayın linkinde görüntü devam eder"): "Video çek" ile çekilen video yalnız bu cihazda saklanır
// (pendingStore, 7 gün), hiçbir yere yüklenmez. Videoya dokununca bu ekranın arka planında oynar, yeniden dokununca kalkar.
import { useEffect, useMemo, useState } from "react";
import { keepLocal, listKept } from "@/features/raceMedia/pendingStore";
import { RecPick } from "@/features/raceMedia/RecPick";
import { recName } from "./liveActions";
import { momentAt } from "@/lib/raceLive";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const hm = (t) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const newId = () => `my${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// videonun süresi (okunamazsa 0)
function durOf(blob) {
  return new Promise((res) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (d) => (URL.revokeObjectURL(url), res(Number.isFinite(d) ? Math.round(d) : 0));
    v.onloadedmetadata = () => done(v.duration);
    v.onerror = () => done(0);
    setTimeout(() => done(v.duration), 6000);
    v.src = url;
  });
}

export function LiveVideos({ raceId, starts = [], playing = "", onPlay }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let on = true;
    listKept().then((l) => on && setList(l.filter((x) => x.mine && x.raceId === raceId && x.blob).sort((a, b) => (a.at < b.at ? 1 : -1))), () => {});
    return () => {
      on = false;
    };
  }, [raceId]);
  // küçük resimler için yerel adresler
  const urls = useMemo(() => Object.fromEntries(list.map((x) => [x.id, URL.createObjectURL(x.blob)])), [list]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const take = async (file) => {
    if (!file || busy) return;
    if (!/^video\//.test(file.type || "") && !/\.(mov|mp4|m4v)$/i.test(file.name || "")) return setMsg("Video çek");
    setMsg("");
    setBusy(true);
    const dur = await durOf(file);
    const end = file.lastModified || Date.now();
    const x = { id: newId(), raceId, kind: "video", mine: true, size: file.size, blob: file, at: new Date(end - dur * 1000).toISOString(), dur };
    await keepLocal(x);
    setList((l) => [x, ...l]);
    setBusy(false);
    onPlay?.(x.id, x.blob); // çekilen hemen arka planda
  };

  return (
    <div className="lvd">
      <div className="lvd-hd">
        <b>Video</b>
        {list.some((x) => x.id === playing) ? <span>Ekranda: {hm(list.find((x) => x.id === playing).at)}</span> : null}
      </div>
      <RecPick onFile={take} className="lvd-rec" aria-busy={busy}>
        <i aria-hidden="true" />
        {busy ? "Kaydediliyor…" : "Video çek"}
      </RecPick>
      {msg ? <p className="lst-msg">{msg}</p> : null}
      {list.length ? (
        <div className="lvd-g">
          {list.map((x) => {
            const on = playing === x.id;
            const name = recName({ at: x.at, ...(momentAt(x.at, starts) || {}) }, starts);
            return (
              <button key={x.id} type="button" className={`lvd-t${on ? " on" : ""}`} aria-pressed={on} onClick={() => (on ? onPlay?.("", null) : onPlay?.(x.id, x.blob))}>
                <span className="th">
                  <video src={`${urls[x.id]}#t=0.5`} preload="metadata" muted playsInline />
                  {on ? <s>Ekranda</s> : null}
                  {x.dur ? <em>{mmss(x.dur)}</em> : null}
                </span>
                <b>{[name, hm(x.at)].filter(Boolean).join(" · ")}</b>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
