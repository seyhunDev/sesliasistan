"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { Countdown, holdMic, readTimer } from "@/features/training/Countdown";
import { micReset } from "@/lib/speech/audioSession";
import { voiceType } from "@/lib/chatFile";
import { COURSES, SES_MAX_SEC, SHOW, SHOW_DEF } from "@/lib/bilgi";
import { Switch } from "@/features/settings/ui";
import { linkUrl, loadLog, loadPusula, newLink, saveBilgi, sendMsg, sendSes, useBilgi, useTekneler } from "./bilgiStore";
import { TekneMap } from "./TekneMap";
import { bilgiOn, setBilgiOn } from "./BilgiSync";
import "./bilgi.css";

// Bilgi ekranı yönetimi (yalnız ana hesap): mesaj (ekranda görünür ve sesli okunur), bas-konuş, start sayacı (ortak sayaç), parkur.
// Bütün sporcular için tek ekran (Seyhun 2026-11-15 "genel yönetimden yönetilebiliyor olsun"; antrenmanda da yarışta da).

function Seg({ value, items, onPick }) {
  return (
    <div className="bzy-seg">
      {items.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onPick(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

// Bas konuş: basılı tutunca kaydeder, bırakınca gönderir (en çok 20 sn)
function PushTalk({ org, ctx, onSent }) {
  const toast = useToast();
  const [rec, setRec] = useState(false);
  const st = useRef(null);
  const stop = () => {
    const s = st.current;
    if (!s) return;
    st.current = null;
    clearTimeout(s.timer);
    if (s.mr.state !== "inactive") s.mr.stop();
    setRec(false);
  };
  const begin = async (e) => {
    e.preventDefault();
    if (st.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return toast("Bu cihazda ses kaydı yapılamıyor.");
    const s = { mr: null, timer: 0, up: false };
    st.current = s;
    // Geri sayım sürerken sayaç iPhone ses oturumunu "playback"e alır (bipler sessizde de çalsın); o kipte mikrofon açılmaz.
    // Kayıt boyunca sayaç kipi değiştirmez, mikrofon açılmadan önce kip "auto"ya döner (asistan mikrofonu gibi).
    holdMic(true);
    micReset();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      st.current = null;
      holdMic(false);
      return toast(err?.name === "NotAllowedError" ? "Mikrofon izni gerekli." : "Mikrofon açılamadı, tekrar dene.");
    }
    const type = voiceType();
    const mr = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
    const parts = [];
    const t0 = Date.now();
    mr.ondataavailable = (ev) => ev.data?.size && parts.push(ev.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      holdMic(false);
      const dur = (Date.now() - t0) / 1000;
      if (dur < 0.6) return;
      const blob = new Blob(parts, { type: mr.mimeType || type || "audio/mp4" });
      const ok = await sendSes(org, blob, dur, ctx).catch(() => false);
      toast(ok ? "Ses gönderildi" : "Ses gönderilemedi");
      if (ok) onSent?.();
    };
    s.mr = mr;
    mr.start();
    setRec(true);
    s.timer = setTimeout(stop, SES_MAX_SEC * 1000);
    if (s.up) stop(); // izin sorulurken parmak kalktıysa
  };
  const end = () => (st.current && !st.current.mr ? (st.current.up = true) : stop());
  useEffect(() => () => stop(), []);
  return (
    <button type="button" data-press className="btn btn-secondary bzy-ptt" data-rec={rec ? "1" : "0"} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} onContextMenu={(e) => e.preventDefault()}>
      {rec ? "Konuşuyorsun…" : "Bas konuş"}
    </button>
  );
}

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (t) => `${pad(new Date(t).getHours())}:${pad(new Date(t).getMinutes())}`;
const dayName = (t) => new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

// Gönderilenler: zaman, mesaj (ya da "Ses · 4 sn") ve o anki start yazısı / parkur durumu ("ne için")
function SentList({ rows }) {
  if (!rows?.length) return null;
  return (
    <section>
      <h2 className="bzy-h">Gönderilenler</h2>
      <div className="bzy-list">
        {rows.map((r, i) => (
          <div key={r.id} className="bzy-li">
            <time className="num">{i === 0 || dayName(rows[i - 1].at) !== dayName(r.at) ? `${dayName(r.at)} ${hhmm(r.at)}` : hhmm(r.at)}</time>
            <div className="min-w-0 flex-1">
              <b>{r.kind === "ses" ? `Ses · ${r.dur || 0} sn` : r.text}</b>
              {(r.label || r.state) && <span>{[r.label, r.state].filter(Boolean).join(" · ")}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Pusula kayıtları: aynı kişinin 3 dk'dan yakın parçaları tek oturum; yön aralığı ve yatış en çok
export function sessionsOf(docs) {
  const out = [];
  for (const d of [...(docs || [])].sort((a, b) => a.at - b.at)) {
    const n = Math.floor((d.pts?.length || 0) / 4);
    const last = out.findLast((x) => x.uid === d.uid);
    const end = d.at + (n ? d.pts[(n - 1) * 4] * 1000 : 0);
    const roll = [];
    for (let i = 0; i < n; i++) roll.push(Math.abs(d.pts[i * 4 + 2]));
    if (last && d.at - last.end < 180e3) {
      last.end = Math.max(last.end, end);
      last.n += n;
      last.roll = Math.max(last.roll, ...roll, 0);
    } else out.push({ uid: d.uid, name: d.name || "", at: d.at, end, n, roll: Math.max(...roll, 0) });
  }
  return out.reverse();
}

function CompassList({ rows }) {
  const list = sessionsOf(rows);
  if (!list.length) return null;
  return (
    <section>
      <h2 className="bzy-h">Pusula kayıtları</h2>
      <div className="bzy-list">
        {list.map((r) => (
          <div key={`${r.uid}${r.at}`} className="bzy-li">
            <time className="num">
              {dayName(r.at)} {hhmm(r.at)}
            </time>
            <div className="min-w-0 flex-1">
              <b>{r.name}</b>
              <span>
                {Math.max(1, Math.round((r.end - r.at) / 60e3))} dk · {r.n} ölçüm · en çok yatış {r.roll}°
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Tekneler (Seyhun 2026-11-15): bilgi ekranını açan telefonlar, yelken no + isimle, haritada ve listede. Yalnız bu sayfa açıkken dinlenir
const ago = (t, now) => {
  const s = Math.max(0, Math.round((now - t) / 1000));
  return s < 60 ? `${s} sn` : s < 3600 ? `${Math.round(s / 60)} dk önce` : `${Math.round(s / 3600)} sa önce`;
};
function Tekneler({ org }) {
  const boats = useTekneler(org);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  if (!boats?.length) return null;
  const list = [...boats].sort((a, b) => (b.t || 0) - (a.t || 0));
  const live = list.filter((b) => now - b.t < 60e3).length;
  return (
    <section>
      <h2 className="bzy-h">
        Tekneler <span>{live} açık</span>
      </h2>
      <TekneMap boats={list} />
      <div className="bzy-list mt-2.5">
        {list.map((b) => {
          const old = now - b.t >= 60e3;
          return (
            <div key={b.id} className={`bzy-li items-center${old ? " old" : ""}`}>
              <time className="num font-bold text-fg">{b.sail || "—"}</time>
              <div className="min-w-0 flex-1">
                <b>{b.name || "—"}</b>
              </div>
              <span className="num shrink-0 text-[0.8125rem] text-mut">{old ? ago(b.t, now) : `${ago(b.t, now)}${b.spd != null ? ` · ${String(b.spd).replace(".", ",")} kn` : ""}`}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Herkese açık link: kopyalanıp gönderilen kişi giriş yapmadan ekranı açar. Yenile: eski link çalışmaz olur
function PublicLink({ org, link }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const url = link ? linkUrl(link) : "";
  const make = async () => {
    setBusy(true);
    const k = await newLink(org).catch(() => "");
    setBusy(false);
    if (!k) return toast("Link açılamadı");
    copy(linkUrl(k), link ? "Yeni link kopyalandı" : "Link kopyalandı");
  };
  const copy = (u, msg = "Link kopyalandı") =>
    navigator.clipboard?.writeText(u).then(
      () => toast(msg),
      () => toast(u),
    ) ?? toast(u);
  return (
    <section>
      <h2 className="bzy-h">Herkese açık link</h2>
      {url && <div className="bzy-link num">{url.replace(/^https?:\/\//, "")}</div>}
      <div className="bzy-row">
        {url ? (
          <>
            <Button onClick={() => copy(url)}>Kopyala</Button>
            <Button variant="secondary" disabled={busy} onClick={make}>
              Yenile
            </Button>
          </>
        ) : (
          <Button disabled={busy} onClick={make}>
            Link oluştur
          </Button>
        )}
      </div>
    </section>
  );
}

export function BilgiAdmin() {
  const { profile } = useAuth();
  const toast = useToast();
  const org = profile?.role === "owner" ? profile?.orgId || "" : "";
  const b = useBilgi(org);
  const [text, setText] = useState("");
  const [on, setOn] = useState(() => (typeof window === "undefined" ? false : bilgiOn()));
  const [label, setLabel] = useState(null);
  const [state, setState] = useState(null);
  const [log, setLog] = useState(null);
  const [pus, setPus] = useState(null);
  const reload = () => org && loadLog(org).then(setLog, () => {});
  useEffect(() => {
    if (!org) return;
    loadLog(org).then(setLog, () => {});
    loadPusula(org).then(setPus, () => {});
  }, [org]);

  if (!org) return <main className="p-6 text-mut">Bu sayfa yalnız ana hesapta açılır.</main>;

  const ctx = { label: b?.label || "", state: b?.state || "", course: b?.course || "" };
  const send = async () => {
    const ok = await sendMsg(org, text, ctx).catch(() => false);
    if (ok) (setText(""), reload());
    toast(ok ? "Gönderildi" : "Gönderilemedi");
  };
  const pickOn = (v) => {
    const yes = v === "on";
    setOn(yes);
    setBilgiOn(yes);
    const t = readTimer();
    saveBilgi(org, { timer: yes ? { dur: t.dur ?? 300, end: t.end ?? null, left: t.left ?? null, mode: t.mode || "" } : null }).catch(() => {});
  };
  const saveText = (k, v) => {
    const cur = b?.[k] ?? "";
    if (v != null && v.trim() !== cur) saveBilgi(org, { [k]: v.trim() }).catch(() => toast("Kaydedilemedi"));
  };

  return (
    <main className="mx-auto max-w-[30rem] px-4">
      <section className="ck -mx-4 px-4 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Bilgi ekranı">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Bilgi ekranı</h1>
          <Link href="/bilgi" className="btn btn-secondary btn-sm" data-press>
            Ekranı aç
          </Link>
        </header>
        <div className="mt-4">
          <Countdown dark mode="start" where="Bilgi ekranı" />
        </div>
      </section>
      <div className="bzy-body">
        <section>
          <h2 className="bzy-h">Mesaj</h2>
          <textarea className="bzy-in" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} aria-label="Mesaj" />
          <div className="bzy-row">
            <PushTalk org={org} ctx={ctx} onSent={reload} />
            <Button disabled={!text.trim()} onClick={send}>
              Gönder
            </Button>
          </div>
        </section>
        <section>
          <h2 className="bzy-h">Start</h2>
          <Seg value={on ? "on" : "off"} items={[["on", "Ekranda"], ["off", "Kapalı"]]} onPick={pickOn} />
          <input className="bzy-in mt-2" value={label ?? b?.label ?? ""} maxLength={40} placeholder="Grup" onChange={(e) => setLabel(e.target.value)} onBlur={() => saveText("label", label)} aria-label="Start yazısı" />
        </section>
        <section>
          <h2 className="bzy-h">Parkur</h2>
          <Seg value={b?.course || "trapez"} items={Object.entries(COURSES).map(([k, c]) => [k, c.name])} onPick={(k) => saveBilgi(org, { course: k }).catch(() => toast("Kaydedilemedi"))} />
          <input className="bzy-in mt-2" value={state ?? b?.state ?? ""} maxLength={80} placeholder="Durum" onChange={(e) => setState(e.target.value)} onBlur={() => saveText("state", state)} aria-label="Parkur durumu" />
        </section>
        <section>
          <h2 className="bzy-h">Start sonrası ekranda</h2>
          <div className="bzy-list">
            {SHOW.map(([k, name]) => {
              const v = (b?.show || SHOW_DEF)[k];
              return (
                <div key={k} className="bzy-li items-center justify-between">
                  <b>{name}</b>
                  <Switch on={v} label={name} onChange={(x) => saveBilgi(org, { show: { [k]: x } }).catch(() => toast("Kaydedilemedi"))} />
                </div>
              );
            })}
          </div>
        </section>
        <Tekneler org={org} />
        <PublicLink org={org} link={b?.link || ""} />
        <SentList rows={log} />
        <CompassList rows={pus} />
      </div>
    </main>
  );
}
