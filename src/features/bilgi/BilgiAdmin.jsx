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
import { COURSES, SEEN_WAIT, SES_MAX_SEC, SHOW, SHOW_DEF, deliveryOf, membersOf } from "@/lib/bilgi";
import { Switch } from "@/features/settings/ui";
import { closeKanal, linkUrl, loadLog, loadPusula, markLog, openKanal, saveBilgi, sendMsg, sendSes, useBilgi, useTekneler } from "./bilgiStore";
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
function PushTalk({ org, ctx, to, onSent }) {
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
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, at: Date.now(), ok: null });
      const r = await sendSes(org, blob, dur, ctx, to).catch(() => ({ ok: false }));
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, ...r, ok: !!r.ok });
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
    <button
      type="button"
      data-press
      className="btn btn-secondary bzy-ptt"
      data-rec={rec ? "1" : "0"}
      onPointerDown={begin}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {rec ? "Konuşuyorsun…" : "Bas konuş"}
    </button>
  );
}

const pad = (n) => String(n).padStart(2, "0");
const clock = () => Date.now();
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
              <b>
                {r.to ? `${r.to} · ` : ""}
                {r.kind === "ses" ? `Ses · ${r.dur || 0} sn` : r.text}
              </b>
              {(r.label || r.state) && <span>{[r.label, r.state].filter(Boolean).join(" · ")}</span>}
            </div>
            {r.st && (
              <span className={`bzy-st${r.st === "seen" ? " seen" : r.st === "sent" ? "" : " bad"}`}>
                {r.st === "seen" ? `Görüldü${r.of > 1 ? ` ${r.seen}/${r.of}` : ""}` : r.st === "part" ? `${r.seen}/${r.of}` : r.st === "sent" ? "İletildi" : "Ulaşmadı"}
              </span>
            )}
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
function Tekneler({ boats: all, ch, now }) {
  if (!all?.length) return null;
  const list = all.filter((b) => !ch || b.ch === ch).sort((a, b) => (b.t || 0) - (a.t || 0));
  if (!list.length) return null;
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
              <span className="num shrink-0 text-[0.8125rem] text-mut">
                {old ? ago(b.t, now) : `${ago(b.t, now)}${b.spd != null ? ` · ${String(b.spd).replace(".", ",")} kn` : ""}${b.lat == null ? " · konum yok" : ""}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Kanal (Seyhun 2026-11-15): ekranlar yalnız açık kanala katılarak başlar. Aç: ad + yeni link (eski link çalışmaz). Kapat: ekranlar durur
function Kanal({ org, kanal, link, count }) {
  const toast = useToast();
  const [name, setName] = useState("Antrenman");
  const [busy, setBusy] = useState(false);
  const url = link ? linkUrl(link) : "";
  const copy = (u) =>
    navigator.clipboard?.writeText(u).then(
      () => toast("Link kopyalandı"),
      () => toast(u),
    ) ?? toast(u);
  const open = async () => {
    setBusy(true);
    await openKanal(org, name).catch(() => toast("Kanal açılamadı"));
    setBusy(false);
  };
  if (!kanal?.open)
    return (
      <section>
        <h2 className="bzy-h">Kanal</h2>
        <div className="bzy-row mt-0">
          <input className="bzy-in" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} aria-label="Kanal adı" />
          <Button disabled={busy || !name.trim()} onClick={open} className="!flex-none">
            Kanal aç
          </Button>
        </div>
      </section>
    );
  return (
    <section>
      <h2 className="bzy-h">
        Kanal <span>Açık</span>
      </h2>
      <div className="bzy-list">
        <div className="bzy-li items-center">
          <b className="flex-1">{kanal.name}</b>
          <span className="shrink-0 text-[0.8125rem] text-mut">{count} kişi</span>
        </div>
      </div>
      {url && <div className="bzy-link num mt-2">{url.replace(/^https?:\/\//, "")}</div>}
      <div className="bzy-row">
        <Button disabled={!url} onClick={() => copy(url)}>
          Linki kopyala
        </Button>
        <Button variant="secondary" onClick={() => closeKanal(org).catch(() => toast("Kapatılamadı"))}>
          Kapat
        </Button>
      </div>
    </section>
  );
}

// Son gönderilenin durumu: İletildi (sunucu onayı, tik çizilerek) → Görüldü (ekran gösterdi/çaldı) → 15 sn'de görmeyen Ulaşmadı + Tekrar
function LastSent({ last, boats, ch, now, onAgain }) {
  const d = deliveryOf(last && { id: last.id, at: last.at, to: last.to?.dev || "", ok: last.ok }, boats, ch, now);
  if (!last || !d) return null;
  const what = last.kind === "ses" ? `Ses · ${last.dur || 0} sn` : last.text;
  const who = last.to ? `${last.to.name} · ` : "";
  return (
    <div className="bzy-sent" data-st={d.state}>
      <p>
        {who}
        {what}
      </p>
      {d.state === "wait" ? (
        <span className="bzy-st">…</span>
      ) : d.state === "sent" ? (
        <span className="bzy-st ok" key="ok">
          <svg viewBox="0 0 24 24" className="bzy-ck">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          İletildi
        </span>
      ) : d.state === "seen" ? (
        <span className="bzy-st seen" key="seen">
          <svg viewBox="0 0 26 24" className="bzy-ck w2">
            <path d="M2 12.5l4.5 4.5L16 7.5" />
            <path d="M8 12.5l4.5 4.5L22 7.5" />
          </svg>
          Görüldü{d.of > 1 ? ` ${d.seen}/${d.of}` : ""}
        </span>
      ) : (
        <>
          <span className="bzy-st bad">{d.state === "part" ? `${d.seen}/${d.of} · ${d.missing.join(", ")} görmedi` : "Ulaşmadı"}</span>
          <button type="button" className="bzy-again" onClick={onAgain}>
            Tekrar
          </button>
        </>
      )}
    </div>
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
  const boats = useTekneler(org);
  const [now, setNow] = useState(() => Date.now());
  const [toDev, setToDev] = useState("");
  const [last, setLast] = useState(null);
  const marked = useRef("");
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const reload = () => org && loadLog(org).then(setLog, () => {});
  useEffect(() => {
    if (!org) return;
    loadLog(org).then(setLog, () => {});
    loadPusula(org).then(setPus, () => {});
  }, [org]);

  const ctx = { label: b?.label || "", state: b?.state || "", course: b?.course || "" };
  const kanal = b?.kanal || null;
  const ch = kanal?.open ? kanal.id : "";
  const members = membersOf(boats, ch, now);
  const target = members.find((m) => m.id === toDev);
  const to = target ? { dev: target.id, name: [target.sail, target.name].filter(Boolean).join(" ") } : null;
  const got = (x) => {
    setLast((o) => ({ ...(o && o.at === x.at ? o : {}), ...x }));
    if (x.ok != null) reload();
  };
  const sendText = async (t, dest) => {
    const at = clock();
    got({ kind: "msg", text: t, to: dest, at, ok: null });
    const r = await sendMsg(org, t, ctx, dest).catch(() => ({ ok: false }));
    got({ kind: "msg", text: t, to: dest, at, ...r, ok: !!r.ok });
    return r.ok;
  };
  const send = async () => {
    const t = text;
    setText("");
    if (!(await sendText(t, to))) setText((x) => x || t);
  };
  const again = async () => {
    if (!last) return;
    if (last.kind === "ses" && last.blob) {
      const at = clock();
      got({ ...last, at, ok: null, id: "" });
      const r = await sendSes(org, last.blob, last.dur, ctx, last.to).catch(() => ({ ok: false }));
      got({ ...last, at, ...r, ok: !!r.ok });
    } else if (last.text) sendText(last.text, last.to);
  };
  // Sonuç belli olunca (hepsi gördü ya da 15 sn geçti) günlüğe yazılır
  const dl = last?.id ? deliveryOf({ id: last.id, at: last.at, to: last.to?.dev || "", ok: last.ok }, boats, ch, now) : null;
  const done = !!dl && !!last?.logId && (dl.state === "seen" || (now - last.at > SEEN_WAIT && dl.state !== "wait"));
  useEffect(() => {
    if (!done || !dl || marked.current === last.id) return;
    marked.current = last.id;
    markLog(org, last.logId, { st: dl.state, seen: dl.seen, of: dl.of });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
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

  if (!org) return <main className="p-6 text-mut">Bu sayfa yalnız ana hesapta açılır.</main>;

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
        <Kanal org={org} kanal={kanal} link={b?.link || ""} count={members.length} />
        <section>
          <h2 className="bzy-h">Mesaj</h2>
          {members.length > 0 && (
            <div className="bzy-to">
              <button type="button" aria-pressed={!to} onClick={() => setToDev("")}>
                Hepsi
              </button>
              {members.map((m) => (
                <button key={m.id} type="button" aria-pressed={to?.dev === m.id} onClick={() => setToDev(to?.dev === m.id ? "" : m.id)}>
                  {[m.sail, m.name].filter(Boolean).join(" ")}
                </button>
              ))}
            </div>
          )}
          <textarea className="bzy-in" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} aria-label="Mesaj" />
          <div className="bzy-row">
            <PushTalk org={org} ctx={ctx} to={to} onSent={got} />
            <Button disabled={!text.trim()} onClick={send}>
              Gönder
            </Button>
          </div>
          <LastSent last={last} boats={boats} ch={ch} now={now} onAgain={again} />
        </section>
        <section>
          <h2 className="bzy-h">Start</h2>
          <Seg
            value={on ? "on" : "off"}
            items={[
              ["on", "Ekranda"],
              ["off", "Kapalı"],
            ]}
            onPick={pickOn}
          />
          <input
            className="bzy-in mt-2"
            value={label ?? b?.label ?? ""}
            maxLength={40}
            placeholder="Grup"
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => saveText("label", label)}
            aria-label="Start yazısı"
          />
        </section>
        <section>
          <h2 className="bzy-h">Parkur</h2>
          <Seg value={b?.course || "trapez"} items={Object.entries(COURSES).map(([k, c]) => [k, c.name])} onPick={(k) => saveBilgi(org, { course: k }).catch(() => toast("Kaydedilemedi"))} />
          <input
            className="bzy-in mt-2"
            value={state ?? b?.state ?? ""}
            maxLength={80}
            placeholder="Durum"
            onChange={(e) => setState(e.target.value)}
            onBlur={() => saveText("state", state)}
            aria-label="Parkur durumu"
          />
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
        <Tekneler boats={boats} ch={kanal?.id || ""} now={now} />
        <SentList rows={log} />
        <CompassList rows={pus} />
      </div>
    </main>
  );
}
