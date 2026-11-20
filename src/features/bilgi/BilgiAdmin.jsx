"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { chooseDur, raceStart, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { mmss } from "@/lib/raceScore";
import { Sheet } from "@/components/ui/Sheet";
import { LIVE_MS, PK_NAMES, PK_TYPES, SEEN_WAIT, SES_MAX_SEC, SHOW, SHOW_DEF, buildCourse, deliveryOf, fmtPt, markKeys, membersOf, parsePt } from "@/lib/bilgi";
import { Switch } from "@/features/settings/ui";
import {
  closeKanal,
  deleteKanal,
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
import { PttCancel, Wave } from "./Wave";
import { IzPanel, KanalList, useIz } from "./BilgiIz";
import { ScAthPanel, ScGrpPanel, ScProgPanel, canliDay, scAth, useCanliRace } from "@/features/liveScreen/sonuclar";
import { dayProgram } from "@/features/liveScreen/program";
import { agendaView } from "@/lib/raceProgram";
import { addResults, importToast } from "@/features/athletes/resultsImport";
import { loadRace } from "@/features/athletes/races";
import { loadAthletes } from "@/features/athletes/data";
import { PlaceWx } from "@/features/weather/PlaceWx";
import { racePlace } from "@/features/athletes/raceWeather";
import { getPlace } from "@/features/weather/weather";
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

// Hedef düğmesi = bas konuş (Seyhun 2026-11-15 "ayrı bas konuş olmasın, kime basarsam onunla konuşayım"): dokununca yazılı mesajın
// hedefi seçilir, basılı tutunca o kişiye (Hepsi: herkese) ses kaydı, bırakınca gider. Kayıtta düğme yeşil yanar, içe basılı kalır, saniye yazar;
// genişliği hiç değişmez (2026-11-16).
function TalkChip({ id, label, picked, ptt, to, now, onPick }) {
  const on = ptt.rec?.key === id;
  const ok = !on && ptt.done?.key === id && now - ptt.done.at < 2000;
  return (
    <button
      type="button"
      className="bzy-ptt"
      aria-pressed={picked}
      data-rec={on ? "1" : "0"}
      data-cancel={on && ptt.rec.cancel ? "1" : undefined}
      data-ok={ok ? "1" : "0"}
      onPointerDown={(e) => {
        onPick();
        ptt.begin(e, id, to);
      }}
      onPointerMove={ptt.move}
      onPointerUp={ptt.end}
      onPointerCancel={ptt.end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {ok ? (
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </>
        )}
      </svg>
      {/* Genişlik sabit (Seyhun 2026-11-16 "bastığımda küçülüyor"): ad, sayaç ve en geniş sayaç ("20 sn") aynı hücrede üst üste; düğme hep en genişi kadar */}
      <span className="bzy-ptt-l">
        <span data-v={on ? "0" : "1"}>{label}</span>
        <span data-v={on ? "1" : "0"}>{on ? (ptt.rec.cancel ? "İptal" : `${Math.max(0, Math.floor((now - ptt.rec.t0) / 1000))} sn`) : ""}</span>
        <span data-v="0" aria-hidden="true">{`${SES_MAX_SEC} sn`}</span>
      </span>
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
                {old ? ago(b.t, now) : `${ago(b.t, now)}${b.spd != null ? ` · ${String(b.spd).replace(".", ",")} kn` : ""}${b.lat == null ? " · konum yok" : ""}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Küçük sayaç (tam ekran haritanın üstünde; ortak sayaç, start dizisi): süre, durunca süre seçimi + Başlat, çalışırken Bitir
const DURS = [300, 240, 120, 60];
function MiniTimer() {
  const { t, now, running, rem, up } = useTimerRun();
  const time = up ? `+${mmss(Math.max(0, Math.floor((now - t.end) / 1000)))}` : mmss(Math.max(0, running ? rem : (t.left ?? t.dur)));
  const next = DURS[(DURS.indexOf(t.dur) + 1) % DURS.length];
  return (
    <div className="bzy-tm" data-run={running ? "1" : "0"}>
      <b className="num">{up || running ? (up ? time : `-${time}`) : time}</b>
      {running ? (
        <button type="button" className="bzy-tb" data-press onClick={() => writeTimer({ dur: t.dur, end: null, left: null, zero: up ? t.end : t.zero, own: "", where: "" })}>
          Bitir
        </button>
      ) : (
        <>
          <button type="button" className="bzy-tb bzy-tb2" data-press onClick={() => chooseDur(next)}>
            {Math.round(t.dur / 60)} dk
          </button>
          <button type="button" className="bzy-tb bzy-go" data-press onClick={() => raceStart(null, "start", "Bilgi ekranı")}>
            Başlat
          </button>
        </>
      )}
    </div>
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

// Kanal (Seyhun 2026-11-15): ekranlar yalnız açık kanala katılarak başlar. Aç: ad + yeni link (eski link çalışmaz). Kapat: ekranlar durur
function Kanal({ org, kanal, link, count, def = "Antrenman", onList }) {
  const toast = useToast();
  const [name, setName] = useState(def);
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
    await openKanal(org, name, kanal).catch(() => toast("Kanal açılamadı"));
    setBusy(false);
  };
  if (!kanal?.open)
    return (
      <section>
        <div className="bzy-row mt-0">
          <input className="bzy-in" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} aria-label="Kanal adı" />
          <Button disabled={busy || !name.trim()} onClick={open} className="!flex-none">
            Kanal aç
          </Button>
          <button type="button" className="bzy-ic" onClick={onList} aria-label="Kanallar" data-press>
            <svg viewBox="0 0 24 24">
              <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
          </button>
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
        <button type="button" className="bzy-ic" onClick={onList} aria-label="Kanallar" data-press>
          <svg viewBox="0 0 24 24">
            <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
        </button>
        <button type="button" className="bzy-ic" disabled={!url} onClick={() => copy(url)} aria-label="Linki kopyala" data-press>
          <svg viewBox="0 0 24 24">
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </svg>
        </button>
        <button type="button" className="bzy-ic" onClick={() => setMore((x) => !x)} aria-label="Diğer" aria-expanded={more} data-press>
          <svg viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
        </button>
      </div>
      {more && (
        <div className="bzy-row">
          <Link href="/bilgi" className="btn btn-secondary" data-press>
            Ekranı aç
          </Link>
          <Button
            variant="secondary"
            onClick={() =>
              closeKanal(org, kanal.id).then(
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

// Sporcudan gelen bas-konuş (Seyhun 2026-11-17, örnek C): yeni gelen ses sırayla çalınır, çalarken o teknenin haritadaki işareti atar
// ve üstünde dalga görünür. Taze olmayan (20 sn'den eski) ses çalınmaz. Çalınan her ses Kayıtlar'a yazılır.
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
    // İlk cevaptaki eski sesler çalınmaz (yalnız 30 sn içinde gelen); sonra gelen her yeni ses çalınır (telefon saatleri farklı olabilir)
    const first = seen.current === null;
    if (first) seen.current = new Set();
    for (const g of g0.list) {
      if (!g.id || seen.current.has(g.id)) continue;
      seen.current.add(g.id);
      if (g.data && (first ? Date.now() - (g.at || 0) < 30000 : true)) q.current.push(g);
    }
    q.current.sort((x, y) => x.at - y.at);
    next();
  }, [g0]); // eslint-disable-line react-hooks/exhaustive-deps
  return talk;
}

export function BilgiAdmin() {
  const { profile } = useAuth();
  // Bugünün antrenmanından gelindi (Seyhun 2026-11-17 "antrenmanı oradan yöneteceğim"): ?ant=plan id, ?ad=antrenmanın adı.
  // Kanal adı antrenmanın adıyla hazır gelir; üstte Antrenman düğmesi eski sayfayı (yoklama, günlük, sıralama) açar
  const q = useSearchParams();
  const ant = (q.get("ant") || "").replace(/[^\w-]/g, "").slice(0, 60);
  const antAd = (q.get("ad") || "").trim().slice(0, 30);
  const toast = useToast();
  const org = profile?.role === "owner" ? profile?.orgId || "" : "";
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
  // Canlı'nın Sonuçlar, Gruplar, Program'ı (Seyhun 2026-11-19 örnek onaylandı): o günün yarışı; pencere açıkken 20 sn, kapalıyken 2 dk'da bir
  const yaris = useCanliRace(!!org, ["sonuc", "grup", "prog"].includes(sheet) ? 20e3 : 120e3);
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

  if (!org) return <main className="p-6 text-mut">Bu sayfa yalnız ana hesapta açılır.</main>;

  // Tam ekran harita düzeni (Seyhun 2026-11-15 örnek C "Harita tam olanı yap"): alt çubuk yok, kaydırma yok. Harita bütün ekran;
  // üstte geri + kanal satırı + küçük sayaç + Parkur/Ekran/Kayıtlar, altta bas-konuş isimleri ve tek satır mesaj. İkinciller alttan pencere.
  return (
    <main className="bzy-app" aria-label="Bilgi ekranı yönetimi">
      <TekneMap boats={izK ? iz.boats : chBoats} tracks={izK ? iz.tracks : null} course={course.has ? course : null} talk={izK ? "" : talk?.dev || ""} full />
      {izK && <IzPanel k={izK} iz={iz} onClose={() => setIzK(null)} />}
      {!izK && talk && !chBoats.some((x) => x.id === talk.dev && Number.isFinite(x.lat)) && (
        <div className="bzy-talk" role="status">
          {talk.who}
          <Wave />
        </div>
      )}
      <div className="bzy-top" style={izK ? { display: "none" } : undefined}>
        <div className="bzy-bar">
          <Link href="/" className="bzy-ic" aria-label="Geri" data-press>
            <svg viewBox="0 0 24 24">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <Kanal org={org} kanal={kanal} link={b?.link || ""} count={members.length} def={antAd || "Antrenman"} onList={() => setSheet("kanallar")} />
          </div>
        </div>
        <MiniTimer />
        <div className="bzy-pills">
          {ant ? (
            <Link href={`/training/day?id=${ant}`} data-press>
              Antrenman
            </Link>
          ) : null}
          {[
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
            ["kayit", "Kayıtlar"],
          ].map(([k, l]) => (
            <button key={k} type="button" data-press onClick={() => setSheet(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {kanal?.open && !izK && (
        <div className="bzy-dock">
          {ptt.rec && <PttCancel on={!!ptt.rec.cancel} />}
          <div className="bzy-to">
            <TalkChip id="" label="Hepsi" picked={!to} ptt={ptt} to={null} now={now} onPick={() => setToDev("")} />
            {members.map((m) => {
              const dest = { dev: m.id, name: [m.sail, m.name].filter(Boolean).join(" ") };
              return <TalkChip key={m.id} id={m.id} label={dest.name} picked={to?.dev === m.id} ptt={ptt} to={dest} now={now} onPick={() => setToDev(m.id)} />;
            })}
          </div>
          <form
            className="bzy-msg"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send();
            }}
          >
            <input
              className="bzy-in"
              value={text}
              maxLength={200}
              onChange={(e) => setText(e.target.value)}
              placeholder={to ? `${to.name} · mesaj yaz` : "Mesaj yaz"}
              aria-label="Mesaj"
              enterKeyHint="send"
            />
            <button type="submit" className="bzy-send" disabled={!text.trim()} aria-label="Gönder" data-press>
              <svg viewBox="0 0 24 24">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
          <LastSent last={last} boats={boats} ch={ch} now={now} onAgain={again} />
        </div>
      )}
      <Sheet open={sheet === "kanallar"} onClose={() => setSheet("")} title="Kanallar">
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
      <Sheet open={sheet === "hava"} onClose={() => setSheet("")} title="Hava">
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
      <Sheet open={sheet === "kayit"} onClose={() => setSheet("")} title="Kayıtlar">
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
      <Sheet open={sheet === "sonuc"} onClose={onClose} title={name ? `Sonuçlar · ${name}` : "Sonuçlar"}>
        <div className="sc-res bare">
          <ScAthPanel data={data} ath={scAth(data, day)} day={day} onResult={onResult} resMsg={resMsg} />
        </div>
      </Sheet>
      <Sheet open={sheet === "grup"} onClose={onClose} title={name ? `Gruplar · ${name}` : "Gruplar"}>
        <div className="sc-res bare">
          <ScGrpPanel data={data} day={day} />
        </div>
      </Sheet>
      <Sheet open={sheet === "prog"} onClose={onClose} title={name ? `Program · ${name}` : "Program"}>
        <div className="sc-res bare">
          {prog.length || ag ? <ScProgPanel prog={prog} ag={ag} /> : <p className="sc-vno">Program yok</p>}
        </div>
      </Sheet>
    </>
  );
}
