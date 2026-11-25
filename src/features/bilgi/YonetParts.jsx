"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { RecPick } from "@/features/raceMedia/RecPick";
import { setShooting } from "@/features/raceMedia/shooting";
import { delKalip, openKanal, renameKalip, reopenKanal, saveKalip, sendKalip } from "./bilgiStore";

// Yönet yeni düzen (Seyhun 2026-11-25 örnekler "Yönet yeni düzen" + "Yönet hazır kalıplar" onaylandı "Yap"): günü başlat, hazır kalıplar,
// tekrar, Video kutusu, Araçlar penceresi. Ana ekran BilgiAdmin.jsx.

const pad = (n) => String(n).padStart(2, "0");
const P = {
  prev: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  rep: <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  stop: <path d="M7 7h10v10H7z" fill="currentColor" />,
};
const I = ({ n }) => (
  <svg viewBox="0 0 24 24" className="bzy-i" aria-hidden="true">
    {P[n]}
  </svg>
);

// Gün anahtarı: YYYY-AA-GG (yerel saat)
export const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const kanalDay = (k) => k?.day || (k?.at ? dayKey(k.at) : "");
const dayDate = (key) => new Date(`${key}T12:00:00`);
const shift = (key, n) => {
  const d = dayDate(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};
export const dayLabel = (key) => (key ? dayDate(key).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

// Günü başlat (kanal kapalıyken): link aynı; tarih bugün (oklarla değişir), ad antrenman ya da günün yarışı. O tarih varsa o gün sürer.
export function DayStart({ org, kanal, kanallar, names, onList, onIz }) {
  const toast = useToast();
  const [today] = useState(() => dayKey(Date.now()));
  const [day, setDay] = useState(today);
  const [pick, setPick] = useState(names[0] || "Antrenman");
  const [busy, setBusy] = useState(false);
  const have = (kanallar || []).find((k) => kanalDay(k) === day);
  const go = async () => {
    setBusy(true);
    await (have ? reopenKanal(org, have, kanal) : openKanal(org, pick, kanal, day)).catch(() => toast("Başlatılamadı"));
    setBusy(false);
  };
  const past = (kanallar || []).filter((k) => kanalDay(k) !== day).slice(0, 3);
  return (
    <section className="bzy-start bzy-day">
      <h1>Günü başlat</h1>
      <div className="bzy-dp">
        <button type="button" className="btn btn-round" aria-label="Önceki gün" onClick={() => setDay((d) => shift(d, -1))} data-press>
          <I n="prev" />
        </button>
        <b>
          <span className="num">{dayLabel(day)}</span>
          <small>{day === today ? "Bugün" : dayDate(day).toLocaleDateString("tr-TR", { weekday: "long" })}</small>
        </b>
        <button type="button" className="btn btn-round" aria-label="Sonraki gün" onClick={() => setDay((d) => shift(d, 1))} data-press>
          <I n="next" />
        </button>
      </div>
      {have ? (
        <p className="bzy-dhave">{have.name}</p>
      ) : (
        <div className="bzy-chips">
          {names.map((n) => (
            <button key={n} type="button" aria-pressed={pick === n} onClick={() => setPick(n)} data-press>
              {n}
            </button>
          ))}
        </div>
      )}
      <Button full loading={busy} className="bzy-open" onClick={go}>
        {have ? "Devam et" : "Başlat"}
      </Button>
      {past.length > 0 && (
        <div className="bzy-days">
          {past.map((k) => (
            <div key={k.id} className="bzy-drow">
              <span className="bzy-dt">
                <b className="num">{dayDate(kanalDay(k)).getDate()}</b>
                <small>{dayDate(kanalDay(k)).toLocaleDateString("tr-TR", { month: "short" })}</small>
              </span>
              <b className="flex-1 truncate">{k.name}</b>
              <button type="button" className="bzy-izle" onClick={() => onIz(k)} data-press>
                İzle
              </button>
            </div>
          ))}
          <button type="button" className="bzy-dall" onClick={onList} data-press>
            Günler
          </button>
        </div>
      )}
    </section>
  );
}

// Video kutusu: yalnız iPhone/iPad uygulamasında (ortak kamera RecPick, video Fotoğraflar'a kaydedilir)
export function VideoTile({ app, onDone }) {
  if (!app) return null;
  return (
    <RecPick onFile={onDone} className="bzy-vid" aria-label="Video çek">
      <small>Video</small>
      <span className="bzy-rec" aria-hidden="true" />
      <b>Çek</b>
    </RecPick>
  );
}
export const videoDone = (toast) => (f) => (setShooting(null), toast(f?.asset ? "Video Fotoğraflar'a kaydedildi" : "Video kaydedilemedi. Fotoğraflar iznini kontrol et."));

// Tekrar: kalıp her `every` sn'de bir, `times` kez; Hepsi seçiliyse her seferinde o an kanalda açık olanlara gider.
// Yönet ekranı açıkken çalışır (telefon kilitlenince tarayıcı durur); sürerken ekran kapanmaz.
export function useRepeat(org, list, ctx, onSent) {
  const [rep, setRep] = useState(null); // { kid, name, every, times, n, next, to }
  const busy = useRef(false);
  const live = useRef({ list, ctx, onSent });
  useEffect(() => {
    live.current = { list, ctx, onSent };
  });
  useEffect(() => {
    if (!rep) return;
    let lock = null;
    try {
      navigator.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    } catch {}
    const id = setInterval(async () => {
      if (busy.current) return;
      const r = rep;
      if (Date.now() < r.next) return;
      const k = (live.current.list || []).find((x) => x.id === r.kid);
      if (!k) return setRep(null);
      busy.current = true;
      const at = Date.now();
      live.current.onSent({ kind: "ses", dur: k.dur, to: r.to, at, ok: null, kalip: k.name });
      const res = await sendKalip(org, live.current.list, k, live.current.ctx, r.to).catch(() => ({ ok: false }));
      live.current.onSent({ kind: "ses", dur: k.dur, to: r.to, at, ...res, ok: !!res.ok, kalip: k.name });
      busy.current = false;
      setRep((o) => (o && o.kid === r.kid ? (o.n + 1 >= o.times ? null : { ...o, n: o.n + 1, next: o.next + o.every * 1000 }) : o));
    }, 400);
    return () => {
      clearInterval(id);
      lock?.release?.().catch?.(() => {});
    };
  }, [org, rep]);
  return {
    rep,
    start: (k, every, times, to) => setRep({ kid: k.id, name: k.name, every, times, n: 0, next: Date.now(), to }),
    stop: () => setRep(null),
  };
}

// Son 3 kalıp: dokun = seçilenlere bir kez; basılı tut = Tekrarla; tekrar sürerken dokun = Durdur
export function KalipRow({ list, rep, now, onSend, onHold, onStop, onAll }) {
  const t = useRef(null);
  const held = useRef(false);
  if (!list?.length) return null;
  const top = [...list].sort((a, b) => (b.used || 0) - (a.used || 0)).slice(0, 3);
  const down = (k) => {
    held.current = false;
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      held.current = true;
      onHold(k);
    }, 550);
  };
  const up = (k) => {
    clearTimeout(t.current);
    if (held.current) return;
    if (rep?.kid === k.id) onStop();
    else onSend(k);
  };
  return (
    <div className="bzy-kp">
      {top.map((k) => {
        const on = rep?.kid === k.id;
        const left = on ? Math.max(0, Math.ceil((rep.next - now) / 1000)) : 0;
        return (
          <button
            key={k.id}
            type="button"
            className="bzy-kb"
            data-rep={on ? "1" : undefined}
            style={on ? { "--p": `${(rep.n / rep.times) * 100}%` } : undefined}
            onPointerDown={() => down(k)}
            onPointerUp={() => up(k)}
            onPointerLeave={() => clearTimeout(t.current)}
            onPointerCancel={() => clearTimeout(t.current)}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={on ? `${k.name}: durdur` : `${k.name}: gönder`}
          >
            <b>{k.name}</b>
            <small className="num">{on ? `${rep.n}/${rep.times} · 0:${pad(left)}` : `${k.dur} sn`}</small>
          </button>
        );
      })}
      <button type="button" className="bzy-kmore" onClick={onAll} aria-label="Kalıplar" data-press>
        <I n="more" />
      </button>
    </div>
  );
}

// Sesin ilk kelimeleri (kalıp adı önerisi); çevrilemezse boş
async function firstWords(blob) {
  try {
    const fd = new FormData();
    fd.append("audio", blob, (blob.type || "").includes("webm") ? "kalip.webm" : "kalip.m4a");
    const res = await authFetch("/api/transcribe", { method: "POST", body: fd, timeout: 15000 });
    const d = await res.json().catch(() => ({}));
    return String(d.text || "")
      .replace(/[.,!?]+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(" ");
  } catch {
    return "";
  }
}

const EVERY = [15, 30, 60];
const TIMES = [3, 5, 10];

// Kalıp pencereleri: yap (ad ver, sakla), tekrarla (aralık, kaç kez, başlat), hepsi (gönder, tekrarla, ad, sil)
export function KalipSheets({ org, list, view, onView, src, to, members, onSend, repeat, onSaved }) {
  const toast = useToast();
  return (
    <>
      <Sheet open={view === "kyap"} onClose={() => onView("")} title="Kalıp yap">
        {view === "kyap" && src?.blob && <KalipYap org={org} list={list} src={src} onDone={() => (onView(""), onSaved?.(), toast("Kalıp kaydedildi"))} />}
      </Sheet>
      <Sheet open={view?.startsWith("ktek:")} onClose={() => onView("")} title={(list || []).find((x) => `ktek:${x.id}` === view)?.name || "Tekrarla"}>
        {view?.startsWith("ktek:") && (
          <KalipTekrar
            k={(list || []).find((x) => `ktek:${x.id}` === view)}
            to={to}
            online={members}
            onGo={(k, e, n) => (repeat.start(k, e, n, to), onView(""))}
          />
        )}
      </Sheet>
      <Sheet big open={view === "kaliplar"} onClose={() => onView("")} title="Kalıplar">
        {view === "kaliplar" && <KalipList org={org} list={list} to={to} onSend={(k) => (onSend(k), onView(""))} onRep={(k) => onView(`ktek:${k.id}`)} />}
      </Sheet>
    </>
  );
}

function KalipYap({ org, list, src, onDone }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [guess, setGuess] = useState(null);
  const [busy, setBusy] = useState(false);
  const url = useMemo(() => URL.createObjectURL(src.blob), [src.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    let live = true;
    firstWords(src.blob).then((w) => live && setGuess(w));
    return () => {
      live = false;
    };
  }, [src.blob]);
  const v = name || guess || "";
  const save = async () => {
    setBusy(true);
    try {
      await saveKalip(org, list, { blob: src.blob, dur: src.dur, name: v || `Kalıp ${(list?.length || 0) + 1}` });
      onDone();
    } catch {
      toast("Kaydedilemedi");
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-col gap-3 pb-2">
      <audio src={url} controls className="w-full" />
      <input className="bzy-in" value={v} maxLength={30} placeholder={guess === null ? "Ad yazılıyor…" : "Ad"} onChange={(e) => setName(e.target.value)} aria-label="Kalıp adı" />
      <Button full loading={busy} onClick={save}>
        Kaydet
      </Button>
    </div>
  );
}

function KalipTekrar({ k, to, online, onGo }) {
  const [every, setEvery] = useState(30);
  const [times, setTimes] = useState(5);
  if (!k) return null;
  return (
    <div className="flex flex-col gap-3 pb-2">
      <h2 className="bzy-h">Aralık</h2>
      <div className="bzy-seg2">
        {EVERY.map((e) => (
          <button key={e} type="button" aria-pressed={every === e} onClick={() => setEvery(e)} data-press>
            {e} <small>sn</small>
          </button>
        ))}
      </div>
      <h2 className="bzy-h">Kaç kez</h2>
      <div className="bzy-seg2">
        {TIMES.map((n) => (
          <button key={n} type="button" aria-pressed={times === n} onClick={() => setTimes(n)} data-press>
            {n}
          </button>
        ))}
      </div>
      <p className="text-mut text-sm">{to ? `Kime: ${to.name}` : `Kime: Hepsi · şu an ${online} kişi açık`}</p>
      <Button full onClick={() => onGo(k, every, times)}>
        Başlat
      </Button>
    </div>
  );
}

function KalipList({ org, list, to, onSend, onRep }) {
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  if (!list?.length) return <p className="text-mut">Kalıp yok</p>;
  const del = (k) => delKalip(org, list, k.id).catch(() => toast("Silinemedi"));
  return (
    <div className="bzy-list">
      {list.map((k) => (
        <div key={k.id} className="bzy-li items-center">
          <div className="min-w-0 flex-1">
            {edit?.id === k.id ? (
              <input
                className="bzy-in"
                autoFocus
                value={edit.v}
                maxLength={30}
                onChange={(e) => setEdit({ id: k.id, v: e.target.value })}
                onBlur={() => (edit.v.trim() && edit.v.trim() !== k.name && renameKalip(org, list, k.id, edit.v).catch(() => toast("Kaydedilemedi")), setEdit(null))}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                aria-label="Kalıp adı"
              />
            ) : (
              <button type="button" className="bzy-kname" onClick={() => setEdit({ id: k.id, v: k.name })}>
                <b>{k.name}</b>
                <span>
                  {k.dur} sn{k.n ? ` · ${k.n} kez` : ""}
                </span>
              </button>
            )}
          </div>
          <button type="button" className="btn btn-round btn-sm" aria-label={`${k.name}: tekrarla`} onClick={() => onRep(k)} data-press>
            <I n="rep" />
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onSend(k)} data-press>
            {to ? to.name : "Gönder"}
          </button>
          <button type="button" className="btn btn-text btn-sm text-rec" onClick={() => del(k)} data-press>
            Sil
          </button>
        </div>
      ))}
    </div>
  );
}

// Araçlar penceresi (Seyhun 2026-11-25 "çok şey gösterilip karmaşa olmasın"): ⋯ ile açılır; en altta Günü bitir
export function ToolsSheet({ open, onClose, tools, Ic, onPick, onEnd }) {
  return (
    <Sheet open={open} onClose={onClose} title="Araçlar">
      <div className="bzy-tg">
        {tools.map(([k, l]) => (
          <button key={k} type="button" className="bzy-tgb" onClick={() => onPick(k)} data-press>
            <Ic n={k} />
            <small>{l}</small>
          </button>
        ))}
      </div>
      <Button variant="danger" full className="mt-3" onClick={onEnd}>
        Günü bitir
      </Button>
    </Sheet>
  );
}
