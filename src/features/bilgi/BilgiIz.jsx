"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { izAt, izTracks } from "@/lib/bilgi";
import { loadIz, renameKanal } from "./bilgiStore";

// Kanallar ve iz (Seyhun 2026-11-17 "yap", örnek NfHsyaZBkVVH3Rc91hUWCQ): kanallar listesi (izi izle, tekrar aç, kapat, adını değiştir,
// sil + Geri al) ve seçilen kanalın izini geri oynatma (her tekne kendi renginde, kaydırma çubuğu, ▶ hızlı oynatma).

const pad = (n) => String(n).padStart(2, "0");
const hm = (t) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const day = (t) => new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const len = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ""}`;
};
const kn = (v) => (v == null ? "" : `${String(v.toFixed(1)).replace(".", ",")} kn`);

// İz verisi ve oynatıcı durumu; kid değişince baştan
const SPEEDS = [10, 30, 1];
export function useIz(org, kid) {
  const [data, setData] = useState(null);
  const [st, setSt] = useState({ kid: "", rel: 0, play: false, sp: 0 });
  useEffect(() => {
    if (!org || !kid) return;
    let live = true;
    loadIz(org, kid).then(
      (docs) => live && setData({ kid, ...izTracks(docs) }),
      () => live && setData({ kid, tracks: [], t0: 0, t1: 0, err: true }),
    );
    return () => {
      live = false;
    };
  }, [org, kid]);
  const d = kid && data?.kid === kid ? data : null;
  const s = st.kid === kid ? st : { kid, rel: 0, play: false, sp: 0 };
  const span = d ? Math.max(0, Math.round((d.t1 - d.t0) / 1000)) : 0;
  const play = s.play && s.rel < span;
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setSt((o) => (o.kid !== kid ? o : { ...o, rel: Math.min(span, o.rel + SPEEDS[o.sp] / 5), play: o.rel + SPEEDS[o.sp] / 5 < span })), 200);
    return () => clearInterval(id);
  }, [play, kid, span]);
  const T = d ? d.t0 + s.rel * 1000 : 0;
  const boats = (d?.tracks || [])
    .map((x) => {
      const p = izAt(x, T);
      return p && { id: x.id, sail: x.sail, name: x.name, lat: p.lat, lon: p.lon, spd: p.spd, keep: true, color: x.color };
    })
    .filter(Boolean);
  const tracks = (d?.tracks || []).map((x) => ({ id: x.id, color: x.color, line: x.p.map((p) => [p.lon, p.lat]) }));
  const set = (patch) => setSt({ ...s, ...patch });
  return {
    loading: !!kid && !d,
    empty: !!d && !d.tracks.length,
    T,
    rel: s.rel,
    span,
    play,
    speed: SPEEDS[s.sp],
    boats,
    tracks,
    seek: (rel) => set({ rel: Math.max(0, Math.min(span, rel)) }),
    toggle: () => set({ play: !play, rel: !play && s.rel >= span ? 0 : s.rel }),
    faster: () => set({ sp: (s.sp + 1) % SPEEDS.length }),
  };
}

// Oynatıcı: üstte geri + kanal adı, altta ▶, kaydırma çubuğu, saat ve teknelerin o andaki hızı
export function IzPanel({ k, iz, onClose }) {
  return (
    <>
      <div className="bzy-top">
        <div className="bzy-bar">
          <button type="button" className="bzy-ic" aria-label="Geri" onClick={onClose} data-press>
            <svg viewBox="0 0 24 24">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="bzy-kanal min-w-0 flex-1">
            <b>{k.name}</b>
            <span className="num">{day(k.at)}</span>
          </div>
        </div>
      </div>
      <div className="bzy-dock bzy-iz">
        {iz.loading ? (
          <p className="text-mut">İz yükleniyor…</p>
        ) : iz.empty ? (
          <p className="text-mut">Bu kanalda iz yok.</p>
        ) : (
          <>
            <div className="bzy-izr">
              <button type="button" className="bzy-send" onClick={iz.toggle} aria-label={iz.play ? "Durdur" : "Oynat"} data-press>
                <svg viewBox="0 0 24 24">{iz.play ? <path d="M8 5v14M16 5v14" /> : <path d="M7 4.5v15l12-7.5z" className="bzy-fill" />}</svg>
              </button>
              <input type="range" className="bzy-sl" min={0} max={iz.span} step={1} value={Math.round(iz.rel)} onChange={(e) => iz.seek(+e.target.value)} aria-label="Zaman" />
              <span className="num bzy-izt">{hm(iz.T)}</span>
            </div>
            <div className="bzy-izc">
              {iz.boats.map((x) => (
                <span key={x.id} style={{ "--c": x.color }}>
                  {[x.sail, x.name].filter(Boolean).join(" ")}
                  {x.spd != null && ` · ${kn(x.spd)}`}
                </span>
              ))}
              <button type="button" className="bzy-izx" onClick={iz.faster} data-press>
                ×{iz.speed}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// Kanallar listesi (Kanal penceresi). onDel: silme (Geri al'lı) yukarıda yapılır, liste o kanalı hemen gizler
export function KanalList({ org, list, cur, hidden, busy, onIz, onOpen, onClose, onDel }) {
  const toast = useToast();
  const [menu, setMenu] = useState("");
  const [edit, setEdit] = useState(null);
  const rows = (list || []).filter((x) => !hidden.includes(x.id));
  if (!list) return <p className="text-mut">Yükleniyor…</p>;
  if (!rows.length) return <p className="text-mut">Kanal yok</p>;
  const save = async (k) => {
    const n = edit?.v ?? "";
    setEdit(null);
    if (n.trim() && n.trim() !== k.name) await renameKanal(org, k.id, n, cur?.open && cur.id === k.id).catch(() => toast("Kaydedilemedi"));
  };
  return (
    <div className="bzy-list">
      {rows.map((k) => {
        const open = !!cur?.open && cur.id === k.id;
        return (
          <div key={k.id} className="bzy-kli">
            <div className="bzy-li">
              <i className={`bzy-dot${open ? "" : " off"}`} />
              <div className="min-w-0 flex-1">
                {edit?.id === k.id ? (
                  <input
                    className="bzy-in"
                    autoFocus
                    value={edit.v}
                    maxLength={30}
                    onChange={(e) => setEdit({ id: k.id, v: e.target.value })}
                    onBlur={() => save(k)}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    aria-label="Kanal adı"
                  />
                ) : (
                  <>
                    <b>{k.name}</b>
                    <span>{open ? `Açık · ${hm(k.at)}'den beri` : `${day(k.at)} · ${hm(k.at)}${k.end ? ` · ${len(k.end - k.at)}` : ""}`}</span>
                  </>
                )}
              </div>
              <button type="button" className="bzy-ic" onClick={() => setMenu((x) => (x === k.id ? "" : k.id))} aria-label="Diğer" aria-expanded={menu === k.id} data-press>
                <svg viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                </svg>
              </button>
            </div>
            {menu === k.id && (
              <div className="bzy-kmenu">
                <button type="button" onClick={() => (setMenu(""), onIz(k))} data-press>
                  İzi izle
                </button>
                {open ? (
                  <button type="button" disabled={busy} onClick={() => (setMenu(""), onClose(k))} data-press>
                    Kapat
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => (setMenu(""), onOpen(k))} data-press>
                    Tekrar aç
                  </button>
                )}
                <button type="button" onClick={() => (setMenu(""), setEdit({ id: k.id, v: k.name }))} data-press>
                  Adını değiştir
                </button>
                <button type="button" className="del" onClick={() => (setMenu(""), onDel(k))} data-press>
                  Sil
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
