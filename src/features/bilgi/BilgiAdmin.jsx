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
import { LIVE_MS, PK_NAMES, PK_TYPES, SEEN_WAIT, SES_MAX_SEC, SHOW, SHOW_DEF, buildCourse, deliveryOf, fmtPt, markKeys, membersOf, parsePt } from "@/lib/bilgi";
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

// Bölümler (Seyhun 2026-11-15 "karman çorman, bölüm bölüm olsun"): Canlı (kanal, mesaj, tekneler haritası), Parkur, Ekran, Kayıtlar
const TABS = [
  ["canli", "Canlı"],
  ["parkur", "Parkur"],
  ["ekran", "Ekran"],
  ["kayit", "Kayıtlar"],
];

// Bas konuş: basılı tutunca kaydeder, bırakınca gönderir (en çok 20 sn)
function usePtt({ org, ctx, onSent }) {
  const toast = useToast();
  const [rec, setRec] = useState(null); // { key, t0 } basılı tutulan hedef
  const st = useRef(null);
  const stop = () => {
    const s = st.current;
    if (!s) return;
    st.current = null;
    clearTimeout(s.timer);
    if (s.mr.state !== "inactive") s.mr.stop();
    setRec(null);
  };
  const begin = async (e, key, to) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    if (st.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return toast("Bu cihazda ses kaydı yapılamıyor.");
    const s = { mr: null, timer: 0, up: false };
    st.current = s;
    // Kısa dokunuş yalnız hedef seçer: 0,3 sn basılı kalmadıysa mikrofon hiç açılmaz
    await new Promise((r) => setTimeout(r, 300));
    if (s.up) {
      st.current = null;
      return;
    }
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
      if (dur < 0.6) return; // kısa dokunuş: yalnız hedef seçildi
      const blob = new Blob(parts, { type: mr.mimeType || type || "audio/mp4" });
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, at: Date.now(), ok: null });
      const r = await sendSes(org, blob, dur, ctx, to).catch(() => ({ ok: false }));
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, ...r, ok: !!r.ok });
    };
    s.mr = mr;
    mr.start();
    setRec({ key, t0 });
    s.timer = setTimeout(stop, SES_MAX_SEC * 1000);
    if (s.up) stop(); // izin sorulurken parmak kalktıysa
  };
  const end = () => (st.current && !st.current.mr ? (st.current.up = true) : stop());
  useEffect(() => () => stop(), []);
  return { rec, begin, end };
}

// Hedef düğmesi = bas konuş (Seyhun 2026-11-15 "ayrı bas konuş olmasın, kime basarsam onunla konuşayım"): dokununca yazılı mesajın
// hedefi seçilir, basılı tutunca o kişiye (Hepsi: herkese) ses kaydı, bırakınca gider. Kayıtta düğme kırmızı, saniye yazar.
function TalkChip({ id, label, picked, ptt, to, now, onPick }) {
  const on = ptt.rec?.key === id;
  return (
    <button
      type="button"
      className="bzy-ptt"
      aria-pressed={picked}
      data-rec={on ? "1" : "0"}
      onPointerDown={(e) => {
        onPick();
        ptt.begin(e, id, to);
      }}
      onPointerUp={ptt.end}
      onPointerCancel={ptt.end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {on ? `● ${Math.max(0, Math.floor((now - ptt.rec.t0) / 1000))} sn` : label}
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
function Tekneler({ boats: all, ch, now, course }) {
  const list = (all || []).filter((b) => !ch || b.ch === ch).sort((a, b) => (b.t || 0) - (a.t || 0));
  const live = list.filter((b) => now - b.t < LIVE_MS).length;
  return (
    <section>
      <h2 className="bzy-h">
        Tekneler <span>{live} açık</span>
      </h2>
      <TekneMap boats={list} course={course} />
      {list.length > 0 && (
        <div className="bzy-list mt-2.5">
          {list.map((b) => {
            const old = now - b.t >= LIVE_MS;
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
      )}
    </section>
  );
}

// Telefonun konumu bir kez ("Konumum": hakem botundaysan ya da şamandıranın yanındaysan)
const here = () =>
  new Promise((ok) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) => ok({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6) }),
          () => ok(null),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        )
      : ok(null),
  );

// Sayı alanı: yazarken yerel, bırakınca kaydedilir
function NumIn({ value, onSave, label, unit }) {
  const [v, setV] = useState(null);
  return (
    <label className="bzy-fr">
      <b>{label}</b>
      <input
        className="num"
        inputMode="numeric"
        value={v ?? (value == null ? "" : String(value))}
        onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
        onBlur={() => {
          if (v != null && v !== String(value ?? "")) onSave(v === "" ? null : +v);
          setV(null);
        }}
      />
      <span>{unit}</span>
    </label>
  );
}

// Koordinat satırı: "39.0712, 26.8840" yazılır ya da "Konumum"; auto: hesaplanan (elle değilse soluk), onAuto: elleyi kaldır
function PtRow({ label, pt, manual, onSave, onAuto }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const save = (q) => {
    if (!q) return toast("Koordinat okunamadı");
    onSave(q);
    setOpen(false);
  };
  return (
    <div className="bzy-pt">
      <button type="button" className="bzy-fr" onClick={() => (setV(fmtPt(pt)), setOpen((x) => !x))}>
        <b>{label}</b>
        <span className={`num${pt && !manual && onAuto ? " auto" : ""}`}>{pt ? fmtPt(pt) : "—"}</span>
      </button>
      {open && (
        <div className="bzy-ptin">
          <input className="bzy-in num" value={v} inputMode="decimal" placeholder="39.07120, 26.88400" onChange={(e) => setV(e.target.value)} />
          <div className="bzy-row">
            <Button onClick={() => save(parsePt(v))}>Kaydet</Button>
            <Button variant="secondary" onClick={async () => save(await here())}>
              Konumum
            </Button>
            {manual && onAuto && (
              <Button variant="secondary" onClick={() => (onAuto(), setOpen(false))}>
                Otomatik
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Parkur (Seyhun 2026-11-15): rüzgâr + hakem botu girilince şamandıralar kendiliğinden yerleşir (lib/bilgi buildCourse); her biri elle
// düzeltilebilir. Harita Tekneler'deki gerçek haritanın aynısı (tek ortak harita; Seyhun 2026-11-15 "iki harita var, biri çalışmıyor")
function ParkurEdit({ org, pk, boats }) {
  const toast = useToast();
  const p = pk || { type: "trapez", wind: null, komite: null, line: 120, orsa: 900, marks: {} };
  const c = buildCourse(p);
  const put = (patch) => saveBilgi(org, { parkur: patch }).catch(() => toast("Kaydedilemedi"));
  const at = (k) => c.pts.find((x) => x.k === k) || null;
  return (
    <>
      <Seg value={p.type} items={PK_TYPES} onPick={(k) => put({ type: k })} />
      <div className="bzy-list mt-2">
        <NumIn label="Rüzgâr" unit="°" value={p.wind} onSave={(v) => put({ wind: v == null ? null : v % 360 })} />
        <PtRow label="Hakem botu" pt={p.komite} manual onSave={(q) => put({ komite: q })} />
        <NumIn label="Start hattı" unit="m" value={p.line} onSave={(v) => put({ line: v ?? 120 })} />
        <NumIn label="1 numaraya" unit="m" value={p.orsa} onSave={(v) => put({ orsa: v ?? 900 })} />
      </div>
      <div className="mt-2">
        <TekneMap boats={boats} course={c.has ? c : null} />
      </div>
      {c.has && (
        <div className="bzy-list mt-2">
          {markKeys(p.type).map((k) => (
            <PtRow key={k} label={k === "pin" ? "Pin" : PK_NAMES[k]} pt={at(k)} manual={!!p.marks?.[k]} onSave={(q) => put({ marks: { [k]: q } })} onAuto={() => put({ marks: { [k]: null } })} />
          ))}
        </div>
      )}
    </>
  );
}

// Kanal (Seyhun 2026-11-15): ekranlar yalnız açık kanala katılarak başlar. Aç: ad + yeni link (eski link çalışmaz). Kapat: ekranlar durur
function Kanal({ org, kanal, link, count }) {
  const toast = useToast();
  const [name, setName] = useState("Antrenman");
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
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
  // Açık kanal tek satır (Seyhun 2026-11-15 "çok yer kaplıyor"): yeşil nokta + ad + kişi sayısı, kopyala simgesi (link), ⋯ içinde Kapat
  return (
    <section>
      <div className="bzy-kanal">
        <i className="bzy-dot" aria-label="Açık" />
        <b>{kanal.name}</b>
        <span className="num">{count} kişi</span>
        <button type="button" className="bzy-ic" disabled={!url} onClick={() => copy(url)} aria-label="Linki kopyala" data-press>
          <svg viewBox="0 0 24 24">
            <rect x="8" y="8" width="12" height="12" rx="2.5" />
            <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
          </svg>
        </button>
        <button type="button" className="bzy-ic" onClick={() => setMore((x) => !x)} aria-label="Diğer" aria-expanded={more} data-press>
          ⋯
        </button>
      </div>
      {more && (
        <div className="bzy-row">
          <Button
            variant="secondary"
            onClick={() =>
              closeKanal(org).then(
                () => setMore(false),
                () => toast("Kapatılamadı"),
              )
            }
          >
            Kanalı kapat
          </Button>
        </div>
      )}
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
  const [tab, setTab] = useState("canli");
  const pickTab = (k) => {
    setTab(k);
    window.scrollTo?.({ top: 0 });
  };
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
  const ptt = usePtt({ org, ctx, onSent: (x) => got(x) });
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

  const course = buildCourse(b?.parkur);
  const chBoats = (boats || []).filter((x) => !ch || x.ch === ch);

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
      <div className="bzy-tabs">
        <Seg value={tab} items={TABS} onPick={pickTab} />
      </div>
      <div className="bzy-body">
        {tab === "canli" && (
          <>
            <Kanal org={org} kanal={kanal} link={b?.link || ""} count={members.length} />
            {kanal?.open && (
              <section>
                <h2 className="bzy-h">Mesaj</h2>
                <div className="bzy-to">
                  <TalkChip id="" label="Hepsi" picked={!to} ptt={ptt} to={null} now={now} onPick={() => setToDev("")} />
                  {members.map((m) => {
                    const dest = { dev: m.id, name: [m.sail, m.name].filter(Boolean).join(" ") };
                    return <TalkChip key={m.id} id={m.id} label={dest.name} picked={to?.dev === m.id} ptt={ptt} to={dest} now={now} onPick={() => setToDev(m.id)} />;
                  })}
                </div>
                <textarea className="bzy-in" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} aria-label="Mesaj" />
                <div className="bzy-row">
                  <Button disabled={!text.trim()} onClick={send}>
                    Gönder
                  </Button>
                </div>
                <LastSent last={last} boats={boats} ch={ch} now={now} onAgain={again} />
              </section>
            )}
            <Tekneler boats={boats} ch={ch} now={now} course={course.has ? course : null} />
          </>
        )}
        {tab === "parkur" && (
          <section>
            <ParkurEdit org={org} pk={b?.parkur} boats={chBoats} />
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
        )}
        {tab === "ekran" && (
          <>
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
          </>
        )}
        {tab === "kayit" && (
          <>
            <SentList rows={log} />
            <CompassList rows={pus} />
            {!log?.length && !sessionsOf(pus).length && <p className="text-mut">Kayıt yok</p>}
          </>
        )}
      </div>
    </main>
  );
}
