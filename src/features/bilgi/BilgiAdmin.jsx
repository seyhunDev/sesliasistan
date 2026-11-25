"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { bilgiOrg } from "@/lib/kinds";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { chooseDur, raceStart, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { mmss } from "@/lib/raceScore";
import { Sheet } from "@/components/ui/Sheet";
import { LIVE_MS, PK_NAMES, PK_TYPES, SEEN_WAIT, SES_MAX_SEC, SHOW, SHOW_DEF, buildCourse, deliveryOf, fmtPt, markKeys, membersOf, parsePt } from "@/lib/bilgi";
import { Switch } from "@/features/settings/ui";
import { MsgList } from "./BilgiMesaj";
import {
  closeKanal,
  deleteKanal,
  noteStart,
  ensureKanal,
  linkUrl,
  loadLog,
  loadPusula,
  logGelen,
  markLog,
  openKanal,
  reopenKanal,
  saveBilgi,
  sendMsg,
  sendSes,
  syncLink,
  useBilgi,
  useGelen,
  useKanallar,
  useTekneler,
} from "./bilgiStore";
import { TekneMap } from "./TekneMap";
import { usePtt } from "./usePtt";
import { Wave } from "./Wave";
import { IzPanel, KanalList, useIz } from "./BilgiIz";
import { AntrenmanSheets } from "./BilgiAntrenman";
import { ScAthPanel, ScGrpPanel, ScProgPanel, canliDay, scAth, useCanliRace } from "@/features/liveScreen/sonuclar";
import { dayProgram } from "@/features/liveScreen/program";
import { agendaView } from "@/lib/raceProgram";
import { addResults, importToast } from "@/features/athletes/resultsImport";
import { loadRace } from "@/features/athletes/races";
import { loadAthletes } from "@/features/athletes/data";
import { PlaceWx } from "@/features/weather/PlaceWx";
import { racePlace } from "@/features/athletes/raceWeather";
import { getPlace } from "@/features/weather/weather";
import { RecPick } from "@/features/raceMedia/RecPick";
import { setShooting } from "@/features/raceMedia/shooting";
import { hasCamera } from "@/lib/nativeIos";
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

// Son gönderinin bu satırdaki durumu: … gidiyor, ✓ iletildi, ✓✓ gördü, görmedi / ulaşmadı
function rowSt(last, m, now) {
  if (!last || (last.to && last.to.dev !== m.id)) return null;
  if (last.ok === false) return { k: "bad", t: "Ulaşmadı" };
  if (last.ok == null) return { k: "wait", t: "Gidiyor…" };
  if (m.seen === last.id) return { k: "seen", t: `✓✓ ${hhmm(last.at)}` };
  return now - last.at > SEEN_WAIT ? { k: "bad", t: "Görmedi" } : { k: "ok", t: `✓ ${hhmm(last.at)}` };
}
function allSt(d, last) {
  if (!d) return null;
  if (d.state === "wait") return { k: "wait", t: "Gidiyor…" };
  if (d.state === "fail") return { k: "bad", t: "Ulaşmadı" };
  if (d.state === "seen") return { k: "seen", t: `✓✓ ${d.of > 1 ? `${d.seen}/${d.of}` : hhmm(last.at)}` };
  if (d.state === "part") return { k: "bad", t: `${d.seen}/${d.of} gördü` };
  return { k: "ok", t: `✓ ${hhmm(last.at)}` };
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
                {r.kind === "gelen" ? `${r.from || "Sporcu"} · Gelen ses · ${r.dur || 0} sn` : r.to ? `${r.to} · ` : ""}
                {r.kind === "gelen" ? "" : r.kind === "ses" ? `Ses · ${r.dur || 0} sn` : r.text}
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
  const list = (all || []).filter((b) => !ch || b.ch === ch).sort((a, b) => (b.t || 0) - (a.t || 0));
  if (!list.length) return null;
  const live = list.filter((b) => now - b.t < LIVE_MS).length;
  return (
    <section>
      <h2 className="bzy-h">
        Tekneler <span>{live} açık</span>
      </h2>
      <div className="bzy-list">
        {list.map((b) => {
          const old = now - b.t >= LIVE_MS;
          return (
            <div key={b.id} className={`bzy-li items-center${old ? " old" : ""}`}>
              <time className="num font-bold text-fg">{b.sail || "—"}</time>
              <div className="min-w-0 flex-1">
                <b>{b.name || "—"}</b>
              </div>
              <span className="num shrink-0 text-[0.8125rem] text-mut">
                {old ? "Offline" : `${ago(b.t, now)}${b.spd != null ? ` · ${String(b.spd).replace(".", ",")} kn` : ""}${b.lat == null ? " · konum yok" : ""}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Süre paneli (Seyhun 2026-11-22 örnek "Yönet alt kısım 2" onaylandı "Yap"): konuşmadan ayrı, en altta. Start öncesi büyük süre + küçük "4 dk"
// (dokununca 5·4·2·1 açılır, seçince kapanır) ve en altta boydan boya Başlat. Geri sayımda mavi süre + 5·4·1·0, aynı yerde içi süreyle boşalan
// Bitir. Start sonrası akan süre, start saati ve Bitir.
const DURS = [300, 240, 120, 60];
function PanelClock({ org }) {
  const { t, now, running, rem, up } = useTimerRun();
  const [pick, setPick] = useState(false);
  const time = up ? `+${mmss(Math.max(0, Math.floor((now - t.end) / 1000)))}` : mmss(Math.max(0, running ? rem : (t.left ?? t.dur)));
  const stop = () => writeTimer({ dur: t.dur, end: null, left: null, zero: up ? t.end : t.zero, own: "", where: "" });
  if (!running)
    return (
      <>
        <div className="bzy-clk">
          <b className="num">{time}</b>
          <button type="button" className="bzy-dur" aria-expanded={pick} onClick={() => setPick((x) => !x)} data-press>
            {Math.round(t.dur / 60)} dk
            <Ic n={pick ? "chev" : "up"} />
          </button>
        </div>
        {pick && (
          <div className="bzy-durs" role="group" aria-label="Süre">
            {DURS.map((d) => (
              <button key={d} type="button" aria-pressed={t.dur === d} onClick={() => (chooseDur(d), setPick(false))} data-press>
                {d / 60}
              </button>
            ))}
            <em>dk</em>
          </div>
        )}
        <Button full className="bzy-goB" onClick={() => (setPick(false), raceStart({ onStart: (end) => noteStart(org, end) }, "start", "Bilgi ekranı", "/bilgi/yonet"))}>
          Başlat
        </Button>
      </>
    );
  const flag = rem > 240 ? "5" : rem > 60 ? "4" : "1";
  const left = up ? 0 : Math.max(0, Math.min(100, (rem / (t.dur || 1)) * 100));
  return (
    <>
      <div className="bzy-clk" data-run="1" data-up={up ? "1" : undefined}>
        <b className="num">{up ? time : `−${time}`}</b>
        {up ? (
          <span className="bzy-sat num">Start {hhmm(t.end)}</span>
        ) : t.dur === 300 ? (
          <span className="bzy-lad" aria-hidden="true">
            {["5", "4", "1", "0"].map((x) => (
              <i key={x} data-on={x === flag ? "1" : undefined}>
                {x}
              </i>
            ))}
          </span>
        ) : null}
      </div>
      <Button variant="secondary" full className="bzy-goB bzy-stopB" style={{ "--p": `${left}%` }} onClick={stop}>
        <span>Bitir</span>
      </Button>
    </>
  );
}
// Video (Seyhun 2026-11-21 "yönetim ekranında video butonu olmalı, geri sayımı gösteren"): ortak kamera (RecPick), üstünde bu sayaç akar.
// Video iPhone'un Fotoğraflar'ına kaydedilir. Sayaç yalnız uygulamada görünür, bu yüzden düğme yalnız uygulamada.
const noSub = () => () => {};
function VideoBtn() {
  const toast = useToast();
  const app = useSyncExternalStore(noSub, hasCamera, () => false);
  if (!app) return null;
  const done = (f) => (setShooting(null), toast(f?.asset ? "Video Fotoğraflar'a kaydedildi" : "Video kaydedilemedi. Fotoğraflar iznini kontrol et."));
  return (
    <RecPick onFile={done} className="btn btn-round bzy-fab" aria-label="Video çek">
      <Ic n="cam" />
    </RecPick>
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
function PtRow({ label, pt, manual, onSave, onAuto, offLabel = "Otomatik" }) {
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
            {manual && onAuto && pt && (
              <Button variant="secondary" onClick={() => (onAuto(), setOpen(false))}>
                {offLabel}
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
function ParkurEdit({ org, pk }) {
  const toast = useToast();
  const p = pk || { type: "trapez", wind: null, komite: null, line: 120, orsa: 900, marks: {} };
  const c = buildCourse(p);
  const put = (patch) =>
    saveBilgi(org, { parkur: patch }).then(
      () => true,
      () => (toast("Kaydedilemedi"), false),
    );
  const at = (k) => c.pts.find((x) => x.k === k) || null;
  const ask = useConfirm();
  // Sıfırla / sil (Seyhun 2026-11-16 "konumları sıfırlayabilmemiz, istediğimizi değiştirebilmemiz ya da tamamen silebilmemiz gerekiyor"):
  // elle düzeltilen şamandıralar tek dokunuşla otomatiğe döner; Parkuru sil bütün parkuru (tip, rüzgâr, hakem botu, uzunluklar,
  // şamandıralar) belgeden kaldırır, link kopyasına da yazılır (saveBilgi); ekranlarda harita boşalır.
  const nManual = markKeys(p.type).filter((k) => p.marks?.[k]).length;
  const any = !!(pk && (pk.komite || pk.wind != null || Object.values(pk.marks || {}).some(Boolean)));
  const wipe = () =>
    ask({
      title: "Parkur silinsin mi?",
      text: "Hakem botu, rüzgâr ve bütün şamandıra konumları silinir; ekranlarda parkur kaybolur. Yeniden baştan kurabilirsin.",
      yes: "Parkuru sil",
      run: () =>
        saveBilgi(org, { parkur: null }).then(
          () => toast("Parkur silindi"),
          (e) => {
            toast("Silinemedi");
            throw e;
          },
        ),
    });
  return (
    <>
      <Seg value={p.type} items={PK_TYPES} onPick={(k) => put({ type: k })} />
      <div className="bzy-list mt-2">
        <NumIn label="Rüzgâr" unit="°" value={p.wind} onSave={(v) => put({ wind: v == null ? null : v % 360 })} />
        <PtRow label="Hakem botu" pt={p.komite} manual onSave={(q) => put({ komite: q })} onAuto={() => put({ komite: null })} offLabel="Kaldır" />
        <NumIn label="Start hattı" unit="m" value={p.line} onSave={(v) => put({ line: v ?? 120 })} />
        <NumIn label="1 numaraya" unit="m" value={p.orsa} onSave={(v) => put({ orsa: v ?? 900 })} />
      </div>
      {c.has && (
        <div className="bzy-list mt-2">
          {markKeys(p.type).map((k) => (
            <PtRow key={k} label={k === "pin" ? "Pin" : PK_NAMES[k]} pt={at(k)} manual={!!p.marks?.[k]} onSave={(q) => put({ marks: { [k]: q } })} onAuto={() => put({ marks: { [k]: null } })} />
          ))}
        </div>
      )}
      {(nManual > 0 || any) && (
        <div className="bzy-row bzy-pkact">
          {nManual > 0 && (
            <Button variant="secondary" onClick={() => put({ marks: null }).then((ok) => ok && toast("Şamandıralar otomatiğe döndü"))}>
              Şamandıraları sıfırla
            </Button>
          )}
          {any && (
            <Button variant="danger" onClick={wipe}>
              Parkuru sil
            </Button>
          )}
        </div>
      )}
    </>
  );
}

// Simgeler (Yönet harita düzeni, Seyhun 2026-11-22 örnek onaylandı): sol araçlar, sağ harita düğmeleri, alt panel
const IC = {
  back: <path d="M15 5l-7 7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  fit: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  cam: <path d="M3 9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 11l5-3v9l-5-3" />,
  ant: <path d="M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6" />,
  sonuc: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />,
  grup: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 14.5a5 5 0 0 1 5 5" />
      <circle cx="17" cy="9" r="2.5" />
    </>
  ),
  prog: <path d="M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM4 10h16M9 3v4M15 3v4" />,
  hava: <path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7" />,
  parkur: (
    <>
      <path d="M6 21V4l10 4-10 4" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  ekran: <path d="M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2" />,
  mesaj: <path d="M4 5h16v11H8l-4 4z" />,
  kayit: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  kapat: <path d="M12 3v9M6.3 7a8 8 0 1 0 11.4 0" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  mic: <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />,
  kb: <path d="M4.5 6h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />,
  chev: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
  send: <path d="M5 12h13M13 6l6 6-6 6" />,
};
const Ic = ({ n }) => (
  <svg viewBox="0 0 24 24" className="bzy-i" aria-hidden="true">
    {IC[n]}
  </svg>
);

// Kanal aç ekranı (Seyhun 2026-11-22 "kanalı açmadan bu sayfayı göstermemiz mantıklı"): kanal kapalıyken yalnız bu kart. Ad o günün
// antrenmanı ya da yarışıyla hazır gelir; link her kanalda aynı kalır. Eski kanallar listesi (tekrar aç, iz, sil) buradan da açılır.
function KanalStart({ org, kanal, def, onList }) {
  const toast = useToast();
  const [name, setName] = useState(def);
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    await openKanal(org, name, kanal).catch(() => toast("Kanal açılamadı"));
    setBusy(false);
  };
  return (
    <form
      className="bzy-start"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && !busy) open();
      }}
    >
      <h1>Yeni kanal</h1>
      <p>Sporcular linkle katılır, ekranları başlar.</p>
      <input className="bzy-in" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} aria-label="Kanal adı" />
      <Button type="submit" full loading={busy} disabled={!name.trim()} className="bzy-open">
        Kanal aç
      </Button>
      <Button type="button" variant="text" full onClick={onList}>
        Eski kanallar
      </Button>
    </form>
  );
}

// Kanal penceresi (alt paneldeki küçük kanal adına dokununca): Link, Ekranı aç, Eski kanallar ve izler
function KanalInfo({ kanal, link, count, onList }) {
  const toast = useToast();
  const url = link ? linkUrl(link) : "";
  const copy = () =>
    navigator.clipboard?.writeText(url).then(
      () => toast("Link kopyalandı"),
      () => toast(url),
    ) ?? toast(url);
  return (
    <div className="flex flex-col gap-3 pb-2">
      <p className="bzy-kinfo">
        <i className="bzy-dot" aria-hidden="true" />
        Açık · {count} kişi{kanal?.at ? ` · ${hhmm(kanal.at)}'den beri` : ""}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={!url} onClick={copy}>
          <Ic n="link" />
          Link
        </Button>
        <Link href="/bilgi" className="btn btn-secondary" data-press>
          <Ic n="ekran" />
          Ekranı aç
        </Link>
        <Button variant="secondary" className="col-span-2" onClick={onList}>
          <Ic n="kayit" />
          Eski kanallar ve izler
        </Button>
      </div>
    </div>
  );
}

// Konuşma (Seyhun 2026-11-22 örnek "Yönet alt kısım 2"): süreden ayrı, sağda haritanın üstünde. Büyük mikrofon en sağda (basılı tut, konuş;
// uzağa kaydırınca iptal), solunda kime ("Hepsi"ye dokununca isimler açılır) ve klavye (yazarak mesaj). Kayıtta mikrofon yeşil olur, solunda
// kime konuştuğun, süre ve ses seviyesi görünür. Mikrofon yerinden oynamaz (parmak onun üstünde kalır).
function TalkBar({ to, ptt, now, who, onWho, onType }) {
  const rec = ptt.rec;
  const st = rec ? (rec.cancel ? "cancel" : "rec") : ptt.arm ? "arm" : "";
  const sec = rec ? Math.max(0, Math.floor((now - rec.t0) / 1000)) : 0;
  const name = to?.name || "Hepsi";
  return (
    <div className="bzy-tk" data-st={st || undefined}>
      {rec ? (
        <div className="bzy-bub" aria-live="polite">
          <b>{rec.cancel ? "Bırak: iptal" : name}</b>
          <small className="num">{rec.cancel ? "Ses gönderilmez" : `Konuşuyorsun · 0:${pad(sec)}`}</small>
          <span className="bzy-tkl" aria-hidden="true">
            {[0.5, 0.85, 1, 0.75, 0.55].map((f, i) => (
              <i key={i} style={{ height: `${0.375 + Math.min(1, ptt.lvl * f * 1.6) * 1.25}rem` }} />
            ))}
          </span>
        </div>
      ) : (
        <>
          <button type="button" className="bzy-whob" onClick={onWho} aria-expanded={who} aria-label={`Kime: ${name}`} data-press>
            <span>{name}</span>
            <Ic n="chev" />
          </button>
          <button type="button" className="btn btn-round bzy-fab bzy-kb" onClick={onType} aria-label="Yazarak mesaj" data-press>
            <Ic n="kb" />
          </button>
        </>
      )}
      <button
        type="button"
        className="bzy-mic bzy-ptt"
        aria-label={`Bas konuş · ${name}`}
        onPointerDown={(e) => ptt.begin(e, "big", to)}
        onPointerMove={ptt.move}
        onPointerUp={ptt.end}
        onPointerCancel={ptt.end}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Ic n="mic" />
      </button>
    </div>
  );
}
// Kanal satırının sağındaki durum: konuşurken ne olduğu, sonra son gidenin durumu (birkaç saniye)
function talkSt(ptt, last, d, now, to) {
  const name = last?.to?.name || "Hepsi";
  if (ptt.rec) return ptt.rec.cancel ? ["bad", "Bırak: iptal"] : ["rec", `${to?.name || "Hepsi"} · iptal için kaydır`];
  if (ptt.arm) return ["", "Mikrofon açılıyor…"];
  if (ptt.tap && now - ptt.tap.at < 1800) return ["", "Basılı tut, konuş"];
  if (!last || !d || now - last.at > 8000) return null;
  if (d.state === "wait") return ["", `${name} · gidiyor…`];
  if (d.state === "seen") return ["ok", `✓✓ ${name} gördü`];
  if (d.state === "sent") return ["", `✓ ${name} · iletildi`];
  return ["bad", d.state === "part" ? `${d.seen}/${d.of} gördü` : "Ulaşmadı"];
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

// Sporcudan gelen bas-konuş (Seyhun 2026-11-17, örnek C): yeni gelen ses sırayla çalınır, çalarken o teknenin haritadaki işareti atar
// ve üstünde dalga görünür. Taze olmayan (20 sn'den eski) ses çalınmaz. Çalınan her ses Kayıtlar'a yazılır.
const HEARD = "bilgiGelenDuyuldu";
const heardIds = () => {
  try {
    const v = JSON.parse(localStorage.getItem(HEARD) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const saveHeard = (set) => {
  try {
    localStorage.setItem(HEARD, JSON.stringify([...set].slice(-200)));
  } catch {}
};
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
function useGelenPlay(org, ctx, onLog) {
  const toast = useToast();
  const g0 = useGelen(org);
  const [talk, setTalk] = useState(null);
  const seen = useRef(null);
  const q = useRef([]);
  const playing = useRef(false);
  const el = useRef(null);
  const warned = useRef(false);
  const audio = () => el.current || (el.current = new Audio());
  // Tarayıcı sesi yalnız dokunuştan sonra çalar: ilk dokunuşta aynı ses öğesi sessizce bir kez çalınır
  useEffect(() => {
    const u = () => {
      const a = audio();
      if (playing.current) return;
      a.src = SILENT;
      a.play().catch(() => {});
    };
    window.addEventListener("pointerdown", u, { once: true });
    return () => window.removeEventListener("pointerdown", u);
  }, []);
  // Okunamıyorsa (Seyhun 2026-11-18 "sporcunun sesi duyulmuyor, gösterilmiyor"): sessiz kalmasın, sebep yazsın
  useEffect(() => {
    if (!g0.err || warned.current) return;
    warned.current = true;
    toast("Sporcudan gelen sesler okunamıyor. Firestore kuralları yayınlandı mı?", { duration: 8000 });
  }, [g0.err]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const next = () => {
      if (playing.current || !q.current.length) return;
      const g = q.current.shift();
      const a = audio();
      playing.current = true;
      const who = [g.sail, g.name].filter(Boolean).join(" ") || "Sporcu";
      let shown = false;
      const fin = () => {
        a.onended = a.onerror = a.onplaying = null;
        playing.current = false;
        setTalk(null);
        next();
      };
      // Çalınamasa da (izin, ses biçimi) kim konuştu süre kadar haritada görünür
      const showOnly = (msg) => {
        a.onended = a.onerror = a.onplaying = null;
        toast(msg);
        if (shown) return fin();
        shown = true;
        setTalk({ dev: g.dev, who });
        setTimeout(fin, Math.max(2, Math.min(20, g.dur || 3)) * 1000);
      };
      a.onplaying = () => {
        shown = true;
        setTalk({ dev: g.dev, who });
      };
      a.onended = fin;
      a.onerror = () => showOnly(`${who} sesli mesaj gönderdi ama bu cihazda çalınamadı.`);
      a.src = `data:${g.type || "audio/mp4"};base64,${g.data}`;
      a.play().catch((e) => {
        if (a.onerror) showOnly(e?.name === "NotAllowedError" ? `${who} sesli mesaj gönderdi; ses için ekrana bir kez dokun.` : `${who} sesli mesaj gönderdi ama çalınamadı.`);
      });
      logGelen(org, g, ctx).then(onLog);
    };
    if (!g0.ready) return;
    // İlk cevaptaki eski sesler çalınmaz (yalnız 30 sn içinde gelen); sonra gelen her yeni ses çalınır (telefon saatleri farklı olabilir).
    // Çalınan/görülen sesler cihazda saklanır (Seyhun 2026-11-21 "güncellemeden sonra eski ses yeniden seslendirildi"): uygulama
    // yeniden açılınca ya da güncellenip yenilenince aynı ses bir daha çalınmaz; sporcu telefonunun saati ileri olsa da çalınmaz.
    const first = seen.current === null;
    if (first) seen.current = new Set(heardIds());
    let added = false;
    for (const g of g0.list) {
      if (!g.id || seen.current.has(g.id)) continue;
      seen.current.add(g.id);
      added = true;
      if (g.data && (first ? Math.abs(Date.now() - (g.at || 0)) < 30000 : true)) q.current.push(g);
    }
    if (added) saveHeard(seen.current);
    q.current.sort((x, y) => x.at - y.at);
    next();
  }, [g0]); // eslint-disable-line react-hooks/exhaustive-deps
  return talk;
}

export function BilgiAdmin() {
  const { profile } = useAuth();
  // Bugünün antrenmanından gelindi (Seyhun 2026-11-17 "antrenmanı oradan yöneteceğim"): ?ant=plan id, ?ad=antrenmanın adı.
  // Kanal adı antrenmanın adıyla hazır gelir; soldaki Antrenman düğmesi Yoklama, Günlük ve "Antrenman olarak kaydet" penceresini açar (BilgiAntrenman.jsx)
  const q = useSearchParams();
  const ant = (q.get("ant") || "").replace(/[^\w-]/g, "").slice(0, 60);
  const antAd = (q.get("ad") || "").trim().slice(0, 30);
  const toast = useToast();
  // Ana hesap kulübün alanını, antrenör kendi alanını (orgs/k-{uid}, Seyhun 2026-11-24) yönetir. Antrenörde kulübün yarışı ve
  // antrenman kaydı (yoklama, günlük) yok: onlar kulübün verisi.
  const org = bilgiOrg(profile);
  const club = profile?.role === "owner";
  const b = useBilgi(org);
  const [text, setText] = useState("");
  const [label, setLabel] = useState(null);
  const [state, setState] = useState(null);
  const [log, setLog] = useState(null);
  const [pus, setPus] = useState(null);
  const boats = useTekneler(org);
  const [now, setNow] = useState(() => Date.now());
  const [toDev, setToDev] = useState("");
  const [last, setLast] = useState(null);
  const marked = useRef("");
  const [sheet, setSheet] = useState("");
  const [who, setWho] = useState(false);
  const [typing, setTyping] = useState(false);
  const mapApi = useRef(null);
  const ask = useConfirm();
  // Canlı'nın Sonuçlar, Gruplar, Program'ı (Seyhun 2026-11-19 örnek onaylandı): o günün yarışı; pencere açıkken 20 sn, kapalıyken 2 dk'da bir
  const yaris = useCanliRace(club && !!org, ["sonuc", "grup", "prog"].includes(sheet) ? 20e3 : 120e3);
  const [resMsg, setResMsg] = useState("");
  const addRes = (file) => {
    setResMsg("Okunuyor…");
    (async () => {
      const race = await loadRace(org, yaris.id);
      if (!race) return setResMsg("Yarış bulunamadı");
      const { athletes } = await loadAthletes();
      const { got } = await addResults({ orgId: org, race, athletes: athletes || [], file });
      setResMsg(importToast(got) || "Sonuçlar eklendi");
      yaris.reload();
    })().catch((e) => setResMsg(e?.message ? `Okunamadı: ${e.message}` : "Okunamadı. İnterneti kontrol et."));
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

  // Yönet açılınca linkin kopyası ana belgeden tazelenir (kopya eksik/eskiyse sporcu linki "Kanal açık değil" der)
  const linkKey = b?.link || "";
  useEffect(() => {
    if (org && linkKey) syncLink(org).catch(() => {});
  }, [org, linkKey]);

  const kanal = b?.kanal || null;
  const ch = kanal?.open ? kanal.id : "";
  const ctx = { label: b?.label || "", state: b?.state || "", course: b?.course || "", ch };
  // Kanallar (Seyhun 2026-11-17): liste, tekrar aç, sil (Geri al'lı, verisiyle), izi geri oynat
  const kanallar = useKanallar(org);
  const [hidden, setHidden] = useState([]);
  const [izK, setIzK] = useState(null);
  const [kbusy, setKbusy] = useState(false);
  const [antK, setAntK] = useState(null); // kapanınca kaydetme özeti için kapanan kanal
  const [antUsed, setAntUsed] = useState(false);
  // Asistan "antrenmanı kaydet" (isler/antrenmanSes.js): ?kaydet=1 açık kanalı, yoksa son kanalı kaydetme penceresinde açar
  const [kaydetQ, setKaydetQ] = useState(() => q.get("kaydet") === "1" && profile?.role === "owner");
  if (kaydetQ && kanallar && b !== undefined) {
    setKaydetQ(false);
    const k = kanal?.open ? kanal : kanallar[0];
    if (k) {
      setAntK(k);
      setSheet("kaydet");
    }
  }
  const iz = useIz(org, izK?.id || "");
  useEffect(() => {
    if (org && kanal?.open && kanal.id && kanallar && !kanallar.some((x) => x.id === kanal.id)) ensureKanal(org, kanal).catch(() => {});
  }, [org, kanal, kanallar]);
  const kRun = async (fn, err) => {
    setKbusy(true);
    await fn().catch(() => toast(err));
    setKbusy(false);
  };
  const delK = (k) => {
    let undone = false;
    const wasOpen = !!kanal?.open && kanal.id === k.id;
    setHidden((h) => [...h, k.id]);
    toast(`"${k.name}" silindi`, {
      action: {
        label: "Geri al",
        onClick: () => {
          undone = true;
          setHidden((h) => h.filter((x) => x !== k.id));
        },
      },
      duration: 6000,
    });
    setTimeout(async () => {
      if (undone) return;
      if (wasOpen) await closeKanal(org, "").catch(() => {});
      await deleteKanal(org, k.id).catch(() => toast("Silinemedi"));
      setHidden((h) => h.filter((x) => x !== k.id));
      reload();
    }, 6500);
  };
  const members = membersOf(boats, ch, now);
  const target = members.find((m) => m.id === toDev);
  const to = target ? { dev: target.id, name: [target.sail, target.name].filter(Boolean).join(" ") } : null;
  const talk = useGelenPlay(org, ctx, () => reload());
  const ptt = usePtt({ send: (blob, dur, to) => sendSes(org, blob, dur, ctx, to), onSent: (x) => got(x) });
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
  const dl0 = last ? deliveryOf({ id: last.id, at: last.at, to: last.to?.dev || "", ok: last.ok }, boats, ch, now) : null;
  // Sonuç belli olunca (hepsi gördü ya da 15 sn geçti) günlüğe yazılır
  const dl = last?.id ? deliveryOf({ id: last.id, at: last.at, to: last.to?.dev || "", ok: last.ok }, boats, ch, now) : null;
  const done = !!dl && !!last?.logId && (dl.state === "seen" || (now - last.at > SEEN_WAIT && dl.state !== "wait"));
  useEffect(() => {
    if (!done || !dl || marked.current === last.id) return;
    marked.current = last.id;
    markLog(org, last.logId, { st: dl.state, seen: dl.seen, of: dl.of });
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveText = (k, v) => {
    const cur = b?.[k] ?? "";
    if (v != null && v.trim() !== cur) saveBilgi(org, { [k]: v.trim() }).catch(() => toast("Kaydedilemedi"));
  };

  const course = buildCourse(b?.parkur);
  const chBoats = (boats || []).filter((x) => !ch || x.ch === ch);
  // Haritada yalnız açık (son 90 sn'de haber veren) tekneler (Seyhun 2026-11-25): çıkan, uygulamayı kapatan ya da arka plana atanın eski
  // konumu donup kalmaz; listede "Offline" yazar
  const liveBoats = chBoats.filter((x) => now - (x.t || 0) < LIVE_MS);

  if (!org) return <main className="p-6 text-mut">Bu sayfa ana hesapta ve antrenörde açılır.</main>;

  // Harita düzeni (Seyhun 2026-11-22 örnekler "Yönet harita düzeni" + "Yönet alt panel" onaylandı "Yap"): harita bütün ekran. Kanal kapalıyken
  // yalnız Kanal aç kartı. Açıkken üstte yalnız geri; solda araçlar (en altta onaylı Kapat), sağda yakınlaştır/uzaklaştır/sığdır/video;
  // altta süre paneli (küçük kanal adı → Link, Ekranı aç, Eski kanallar; süre; boydan boya Başlat), üstünde sağda ayrı konuşma (örnek "Yönet alt kısım 2").
  const open = !!kanal?.open;
  const tools = [
    ...(yaris.data
      ? [
          ["sonuc", "Sonuçlar"],
          ["grup", "Gruplar"],
          ["prog", "Program"],
        ]
      : []),
    ["hava", "Hava"],
    ["parkur", "Parkur"],
    ["ekran", "Ekran"],
    ["mesaj", "Mesajlar"],
    ["kayit", "Kayıtlar"],
  ];
  const closeAsk = () => {
    let err = false;
    return ask({
      title: "Kanal kapatılsın mı?",
      text: "Sporcuların ekranı durur. İz ve kayıtlar saklanır.",
      yes: "Kapat",
      run: () => closeKanal(org, kanal.id).catch((e) => ((err = true), Promise.reject(e))),
    }).then((ok) => {
      if (err) return toast("Kapatılamadı");
      // Antrenmanda kapanınca "Antrenman olarak kaydet?" (Seyhun 2026-11-23); yarış gününde sorulmaz
      if (ok && antOn) setAntK(kanal), setSheet("kaydet");
    });
  };
  const tst = talkSt(ptt, last, dl0, now, to);
  // Antrenman (BilgiAntrenman.jsx): yarış günü değilse ya da antrenmandan gelindiyse; kanal kaydı listeden (starts, end, plan)
  const antOn = club && (!!ant || !yaris.data);
  // Sporcular (kulüp listesi) yalnız Antrenman penceresi ilk açılınca okunur; sonra iç pencereler (Yoklama, Günlük) için açık kalır
  if (!antUsed && (sheet === "ant" || sheet === "kaydet")) setAntUsed(true);
  const antBase = sheet === "kaydet" && antK ? antK : kanal;
  const antDoc = antBase?.id ? { ...antBase, ...(kanallar?.find((x) => x.id === antBase.id) || {}) } : null;
  return (
    <main className="bzy-app" aria-label="Bilgi ekranı yönetimi" data-open={open ? "1" : undefined}>
      <TekneMap boats={izK ? iz.boats : liveBoats} tracks={izK ? iz.tracks : null} course={course.has ? course : null} talk={izK ? "" : talk?.dev || ""} full api={mapApi} />
      {izK && <IzPanel k={izK} iz={iz} onClose={() => setIzK(null)} />}
      {!izK && talk && !liveBoats.some((x) => x.id === talk.dev && Number.isFinite(x.lat)) && (
        <div className="bzy-talk" role="status">
          {talk.who}
          <Wave />
        </div>
      )}
      {!izK && (
        <Link href="/" className="btn btn-round bzy-fab bzy-back" aria-label="Geri" data-press>
          <Ic n="back" />
        </Link>
      )}
      {!izK && !open && (
        <>
          <div className="bzy-veil" />
          <KanalStart key={kanal?.id || "yok"} org={org} kanal={kanal} def={antAd || yaris.data?.race?.name?.slice(0, 30) || "Antrenman"} onList={() => setSheet("kanallar")} />
        </>
      )}
      {!izK && open && (
        <>
          <nav className="bzy-rail" aria-label="Araçlar">
            {antOn ? (
              <button type="button" className="bzy-tool" onClick={() => setSheet("ant")} data-press>
                <Ic n="ant" />
                <small>Antrenman</small>
              </button>
            ) : null}
            {tools.map(([k, l]) => (
              <button key={k} type="button" className="bzy-tool" onClick={() => setSheet(k)} data-press>
                <Ic n={k} />
                <small>{l}</small>
              </button>
            ))}
            <i className="bzy-sep" />
            <button type="button" className="bzy-tool bzy-off" onClick={closeAsk} data-press>
              <Ic n="kapat" />
              <small>Kapat</small>
            </button>
          </nav>
          <div className="bzy-rr">
            <div className="bzy-zm">
              <button type="button" className="btn btn-icon" aria-label="Yakınlaştır" onClick={() => mapApi.current?.zoom(1)} data-press>
                <Ic n="plus" />
              </button>
              <button type="button" className="btn btn-icon" aria-label="Uzaklaştır" onClick={() => mapApi.current?.zoom(-1)} data-press>
                <Ic n="minus" />
              </button>
            </div>
            <button type="button" className="btn btn-round bzy-fab" aria-label="Tekneleri sığdır" onClick={() => mapApi.current?.fit()} data-press>
              <Ic n="fit" />
            </button>
            <VideoBtn />
          </div>
          <div className="bzy-bot">
            {who && (
              <div className="bzy-who" aria-label="Kime">
                {[{ id: "", label: "Hepsi", st: !last?.to ? allSt(dl0, last) : null }, ...members.map((m) => ({ id: m.id, no: m.sail || "", label: m.name || m.sail || "Sporcu", st: rowSt(last, m, now) }))].map((m) => (
                  <button
                    key={m.id || "hepsi"}
                    type="button"
                    aria-pressed={(to?.dev || "") === m.id}
                    onClick={() => (setToDev(m.id), setWho(false))}
                    data-press
                  >
                    {m.no ? <u className="num">{m.no}</u> : null}
                    {m.label}
                    {m.st && <i data-k={m.st.k} aria-label={m.st.t} />}
                  </button>
                ))}
              </div>
            )}
            {typing ? (
              <form
                className="bzy-typ"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  setTyping(false);
                  await send();
                }}
              >
                <button type="button" className="bzy-whob" onClick={() => setWho((x) => !x)} aria-expanded={who} aria-label={`Kime: ${to?.name || "Hepsi"}`} data-press>
                  <span>{to?.name || "Hepsi"}</span>
                  <Ic n="chev" />
                </button>
                <input
                  className="bzy-in"
                  autoFocus
                  value={text}
                  maxLength={200}
                  onChange={(e) => setText(e.target.value)}
                  onBlur={() => !text.trim() && setTimeout(() => setTyping(false), 150)}
                  placeholder="Mesaj yaz"
                  aria-label="Mesaj"
                  enterKeyHint="send"
                />
                <button type="submit" className="btn btn-primary btn-round bzy-snd" disabled={!text.trim()} aria-label="Gönder" data-press>
                  <Ic n="send" />
                </button>
              </form>
            ) : (
              <TalkBar to={to} ptt={ptt} now={now} who={who} onWho={() => setWho((x) => !x)} onType={() => (setWho(false), setTyping(true))} />
            )}
            {(dl0?.state === "fail" || dl0?.state === "part") && <LastSent last={last} boats={boats} ch={ch} now={now} onAgain={again} />}
            <section className="bzy-pnl" aria-label="Süre">
              <div className="bzy-kl">
                <button type="button" className="bzy-kn2" onClick={() => setSheet("kanal")} data-press>
                  <i className="bzy-dot" aria-hidden="true" />
                  <span>
                    {kanal.name} · {members.length} kişi
                  </span>
                </button>
                {tst && (
                  <span className="bzy-tst" data-k={tst[0] || undefined} aria-live="polite">
                    {tst[1]}
                  </span>
                )}
              </div>
              <PanelClock org={org} />
            </section>
          </div>
        </>
      )}
      {antUsed && club && <AntrenmanSheets org={org} view={sheet} onView={setSheet} k={antDoc} boats={boats} ant={ant} />}
      <Sheet open={sheet === "kanal"} onClose={() => setSheet("")} title={kanal?.name || "Kanal"}>
        <KanalInfo kanal={kanal} link={b?.link || ""} count={members.length} onList={() => setSheet("kanallar")} />
      </Sheet>
      <Sheet big open={sheet === "kanallar"} onClose={() => setSheet("")} title="Kanallar">
        <KanalList
          org={org}
          list={kanallar}
          cur={kanal}
          hidden={hidden}
          busy={kbusy}
          onIz={(k) => (setSheet(""), setIzK(k))}
          onOpen={(k) => kRun(() => reopenKanal(org, k, kanal), "Açılamadı")}
          onClose={(k) => kRun(() => closeKanal(org, k.id), "Kapatılamadı")}
          onDel={delK}
        />
      </Sheet>
      <YarisSheets yaris={yaris} now={now} sheet={sheet} onClose={() => setSheet("")} onResult={addRes} resMsg={resMsg} />
      <Sheet big open={sheet === "hava"} onClose={() => setSheet("")} title="Hava">
        {sheet === "hava" && <RaceAtWx org={org} id={yaris.id} />}
      </Sheet>
      <Sheet open={sheet === "parkur"} onClose={() => setSheet("")} title="Parkur">
        <ParkurEdit org={org} pk={b?.parkur} />
        <input
          className="bzy-in mt-2"
          value={state ?? b?.state ?? ""}
          maxLength={80}
          placeholder="Durum"
          onChange={(e) => setState(e.target.value)}
          onBlur={() => saveText("state", state)}
          aria-label="Parkur durumu"
        />
      </Sheet>
      <Sheet open={sheet === "ekran"} onClose={() => setSheet("")} title="Ekran">
        <input
          className="bzy-in"
          value={label ?? b?.label ?? ""}
          maxLength={40}
          placeholder="Grup"
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => saveText("label", label)}
          aria-label="Start yazısı"
        />
        <h2 className="bzy-h mt-4">Start sonrası ekranda</h2>
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
      </Sheet>
      <Sheet big open={sheet === "mesaj"} onClose={() => setSheet("")} title="Mesajlar">
        <MsgList org={org} b={b} log={log} now={now} onChange={reload} />
      </Sheet>
      <Sheet big open={sheet === "kayit"} onClose={() => setSheet("")} title="Kayıtlar">
        <div className="flex flex-col gap-6">
          <Tekneler boats={boats} ch={ch} now={now} />
          <SentList rows={log} />
          <CompassList rows={pus} />
          {!log?.length && !sessionsOf(pus).length && !chBoats.length && <p className="text-mut">Kayıt yok</p>}
        </div>
      </Sheet>
    </main>
  );
}

// Hava penceresi (Seyhun 2026-11-20 "yarışın yapıldığı yerdeki hava durumunu göstermeliyiz"): o günün yarışının yeri (yarış sahası,
// yoksa Çevre'deki alan, yoksa ilçesi; racePlace yarış sayfasıyla aynı). Yarış yoksa seçili hava konumu. Tasarım ana sayfanın Hava kutusu (PlaceWx).
function RaceAtWx({ org, id }) {
  const [at, setAt] = useState(null);
  useEffect(() => {
    let on = true;
    (async () => {
      const race = id ? await loadRace(org, id) : null;
      const p = race ? await racePlace(race) : null;
      if (on) setAt(p?.lat != null ? { name: (p.name !== "Seçilen yer" && p.name) || race?.district || "Yarış yeri", lat: +p.lat, lon: +p.lon } : getPlace());
    })().catch(() => on && setAt(getPlace()));
    return () => {
      on = false;
    };
  }, [org, id]);
  if (!at) return <div className="ck-shim h-[22rem] rounded-[1.5rem]" role="status" aria-label="Hava yükleniyor" />;
  return <PlaceWx at={at} />;
}

// Sonuçlar, Gruplar, Program (canlı ekranla aynı bileşenler, liveScreen/sonuclar.jsx); başlık pencerenin kendi başlığı, yarışın adı altında
function YarisSheets({ yaris, now, sheet, onClose, onResult, resMsg }) {
  const data = yaris.data;
  if (!data) return null;
  const day = canliDay(data, now);
  const name = data.race?.name || "";
  const hm = new Date(now + 3 * 3600e3).toISOString().slice(11, 16);
  const ag = agendaView(data.plan?.agenda, day, hm);
  const prog = dayProgram(data, day);
  return (
    <>
      <Sheet big open={sheet === "sonuc"} onClose={onClose} title={name ? `Sonuçlar · ${name}` : "Sonuçlar"}>
        <div className="sc-res bare">
          <ScAthPanel data={data} ath={scAth(data, day)} day={day} onResult={onResult} resMsg={resMsg} />
        </div>
      </Sheet>
      <Sheet big open={sheet === "grup"} onClose={onClose} title={name ? `Gruplar · ${name}` : "Gruplar"}>
        <div className="sc-res bare">
          <ScGrpPanel data={data} day={day} />
        </div>
      </Sheet>
      <Sheet big open={sheet === "prog"} onClose={onClose} title={name ? `Program · ${name}` : "Program"}>
        <div className="sc-res bare">{prog.length || ag ? <ScProgPanel prog={prog} ag={ag} /> : <p className="sc-vno">Program yok</p>}</div>
      </Sheet>
    </>
  );
}
