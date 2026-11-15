"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { Countdown, readTimer } from "@/features/training/Countdown";
import { voiceType } from "@/lib/chatFile";
import { COURSES, SES_MAX_SEC } from "@/lib/bilgi";
import { saveBilgi, sendMsg, sendSes, useBilgi } from "./bilgiStore";
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
function PushTalk({ org }) {
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
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      st.current = null;
      return toast("Mikrofon izni gerekli.");
    }
    const type = voiceType();
    const mr = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
    const parts = [];
    const t0 = Date.now();
    mr.ondataavailable = (ev) => ev.data?.size && parts.push(ev.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const dur = (Date.now() - t0) / 1000;
      if (dur < 0.6) return;
      const blob = new Blob(parts, { type: mr.mimeType || type || "audio/mp4" });
      const ok = await sendSes(org, blob, dur).catch(() => false);
      toast(ok ? "Ses gönderildi" : "Ses gönderilemedi");
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

export function BilgiAdmin() {
  const { profile } = useAuth();
  const toast = useToast();
  const org = profile?.role === "owner" ? profile?.orgId || "" : "";
  const b = useBilgi(org);
  const [text, setText] = useState("");
  const [on, setOn] = useState(() => (typeof window === "undefined" ? false : bilgiOn()));
  const [label, setLabel] = useState(null);
  const [state, setState] = useState(null);

  if (!org) return <main className="p-6 text-mut">Bu sayfa yalnız ana hesapta açılır.</main>;

  const send = async () => {
    const ok = await sendMsg(org, text).catch(() => false);
    if (ok) setText("");
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
            <PushTalk org={org} />
            <Button disabled={!text.trim()} onClick={send}>
              Gönder
            </Button>
          </div>
          {b?.msg && <p className="bzy-last">Son: {b.msg.text}</p>}
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
      </div>
    </main>
  );
}
