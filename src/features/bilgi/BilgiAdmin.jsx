"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { isLive, syncClock } from "@/lib/serverClock";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { bilgiOrg } from "@/lib/kinds";
import { Button } from "@/components/ui/Button";
import { RecPick } from "@/features/raceMedia/RecPick";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { chooseDur, raceStart, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { mmss } from "@/lib/raceScore";
import { Sheet } from "@/components/ui/Sheet";
import { LIVE_MS, PEN, PK_NAMES, PK_TYPES, SEEN_WAIT, SES_MAX_SEC, SHOW, SHOW_DEF, buildCourse, deliveryOf, isFor, fmtPt, kareSpans, markKeys, membersOf, parsePt } from "@/lib/bilgi";
import { Switch } from "@/features/settings/ui";
import { MsgList } from "./BilgiMesaj";
import {
  closeKanal,
  arsivKanal,
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
  sendKalip,
  sendMsg,
  sendSes,
  sendSesPart,
  finishSes,
  cancelSes,
  syncLink,
  useBilgi,
  useGelen,
  useKaliplar,
  useKanallar,
  useTekneler,
  setCeza,
  sendNot,
  logEv,
  sesYazi,
  yaziHata,
  loadGunKaydi,
} from "./bilgiStore";
import { DayStart, KalipKayit, KalipRow, KalipSheets, kalipEntry, ToolsSheet, VideoTags, VideoTile, dayKey, dayLabel, kanalDay, useRepeat } from "./YonetParts";
import { saveYonetVideo } from "./yonetVideo";
import { setShooting } from "@/features/raceMedia/shooting";
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
import { YonetWx } from "./YonetWx";
import { racePlace } from "@/features/athletes/raceWeather";
import { getPlace } from "@/features/weather/weather";
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
  if (!last || (last.to && !isFor(last.to.dev, m.id))) return null;
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
                {r.kind === "gelen" ? "" : r.kind === "ses" ? (r.yazi ? `“${r.yazi}”` : `Ses · ${r.dur || 0} sn`) : r.text}
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
// Süre kutusu (Seyhun 2026-11-28 örnek "Yönet yeni düzen 2" "Yap": çok sık kullanılır, büyük): solda büyük süre, sağda büyük BAŞLAT
// (işlerken DURDUR), altında 1–5 dk tek dokunuşla. Geri sayımda 5·4·1·0, start sonrası start saati.
const DURS = [60, 120, 180, 240, 300];
function PanelClock({ org, mini = false }) {
  const { t, now, running, rem, up } = useTimerRun();
  const time = up ? `+${mmss(Math.max(0, Math.floor((now - t.end) / 1000)))}` : mmss(Math.max(0, running ? rem : (t.left ?? t.dur)));
  const stop = () => writeTimer({ dur: t.dur, end: null, left: null, zero: up ? t.end : t.zero, own: "", where: "" });
  const go = () => raceStart({ onStart: (end) => noteStart(org, end) }, "start", "Bilgi ekranı", "/bilgi/yonet");
  const flag = rem > 240 ? "5" : rem > 60 ? "4" : "1";
  const left = up || !running ? 0 : Math.max(0, Math.min(100, (rem / (t.dur || 1)) * 100));
  if (mini)
    return (
      <button type="button" className="bzk-mclk" data-run={running ? "1" : undefined} onClick={running ? stop : go} data-press>
        <b className="num">{running && !up ? `−${time}` : time}</b>
        <small>{running ? "Durdur" : "Başlat"}</small>
      </button>
    );
  return (
    <div className="bzk-clk" data-run={running ? "1" : undefined} data-up={up ? "1" : undefined} style={{ "--p": `${left}%` }}>
      <div className="bzk-clt">
        <b className="num">{running && !up ? `−${time}` : time}</b>
        <button type="button" className="bzk-go" data-stop={running ? "1" : undefined} onClick={running ? stop : go} data-press>
          {running ? "Durdur" : "Başlat"}
        </button>
      </div>
      {!running ? (
        <div className="bzk-durs" role="group" aria-label="Süre (dakika)">
          {DURS.map((d) => (
            <button key={d} type="button" aria-pressed={t.dur === d} onClick={() => chooseDur(d)} data-press>
              {d / 60}
            </button>
          ))}
        </div>
      ) : up ? (
        <small className="bzk-cls num">Start {hhmm(t.end)}</small>
      ) : t.dur === 300 ? (
        <span className="bzy-lad bzk-lad" aria-hidden="true">
          {["5", "4", "1", "0"].map((x) => (
            <i key={x} data-on={x === flag ? "1" : undefined}>
              {x}
            </i>
          ))}
        </span>
      ) : null}
    </div>
  );
}
const noSub = () => () => {};
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

// Parkur (Seyhun 2026-11-15): rüzgâr + hakem botu girilince şamandıralar kendiliğinden yerleşir (lib/bilgi buildCourse); her biri elle
// düzeltilebilir. Adım adım kurma (Seyhun 2026-11-27 örnek 9quvtj9qsA6sx7wBJEodEC "İkisi de"): 1 Rüzgâr, 2 Start hattı, 3 Hakem botu,
// 4 Pin, 5 Şamandıralar; her adımda tek iş. Konum için üç yol hep aynı: Konumum, Haritada yerleştir (onPick: pencere kapanır, haritanın
// ortasındaki nişan), Koordinat yaz.
const PK_STEPS = ["Rüzgâr", "Start hattı", "Hakem botu", "Pin", "Şamandıralar"];
const WIND_CH = [
  [0, "K"],
  [45, "KD"],
  [90, "D"],
  [135, "GD"],
  [180, "G"],
  [225, "GB"],
  [270, "B"],
  [315, "KB"],
];
const LINE_CH = [80, 100, 120, 150];

// Büyük sayı: − / + ve dokunup yazma
function BigNum({ value, unit, step, min, max, onSave, label }) {
  const [v, setV] = useState(null);
  const clamp = (x) => (unit === "°" ? ((x % 360) + 360) % 360 : Math.min(max, Math.max(min, x)));
  return (
    <div className="bzy-pkbig">
      <button type="button" aria-label={`${label} azalt`} onClick={() => onSave(clamp((value ?? 0) - step))} data-press>
        −
      </button>
      <label>
        <input
          className="num"
          inputMode="numeric"
          aria-label={label}
          value={v ?? (value == null ? "" : String(value))}
          placeholder="—"
          onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          onBlur={() => {
            if (v != null && v !== "" && v !== String(value ?? "")) onSave(clamp(+v));
            setV(null);
          }}
        />
        <small>{unit}</small>
      </label>
      <button type="button" aria-label={`${label} artır`} onClick={() => onSave(clamp((value ?? 0) + step))} data-press>
        +
      </button>
    </div>
  );
}

// Konum: Konumum, Haritada yerleştir, Koordinat yaz (hakem botu, pin, şamandıra için aynı)
function PtWays({ label, pt, onSave, onPick, primary }) {
  const toast = useToast();
  const [typing, setTyping] = useState(false);
  const [v, setV] = useState("");
  const save = (q) => {
    if (!q) return toast("Koordinat okunamadı");
    onSave(q);
    setTyping(false);
  };
  return (
    <div className="bzy-pkways">
      <button type="button" className={primary ? "on" : ""} onClick={async () => save(await here())} data-press>
        Konumum
      </button>
      <button type="button" onClick={() => onPick(label, pt, save)} data-press>
        Haritada yerleştir
      </button>
      <button type="button" aria-expanded={typing} onClick={() => (setV(fmtPt(pt)), setTyping((x) => !x))} data-press>
        Koordinat yaz
      </button>
      {typing && (
        <div className="bzy-pkin">
          <input className="bzy-in num" value={v} inputMode="decimal" placeholder="39.07120, 26.88400" onChange={(e) => setV(e.target.value)} aria-label={`${label} koordinatı`} />
          <Button onClick={() => save(parsePt(v))}>Kaydet</Button>
        </div>
      )}
    </div>
  );
}

function ParkurEdit({ org, pk, step, setStep, onPick, onDone, extra }) {
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
  const [mk, setMk] = useState("");
  // Sıfırla / sil (Seyhun 2026-11-16): elle düzeltilen şamandıralar tek dokunuşla otomatiğe döner; Parkuru sil bütün parkuru belgeden kaldırır
  const nManual = markKeys(p.type).filter((k) => p.marks?.[k]).length;
  const any = !!(pk && (pk.komite || pk.wind != null || Object.values(pk.marks || {}).some(Boolean)));
  const wipe = () =>
    ask({
      title: "Parkur silinsin mi?",
      text: "Hakem botu, rüzgâr ve bütün şamandıra konumları silinir; ekranlarda parkur kaybolur. Yeniden baştan kurabilirsin.",
      yes: "Parkuru sil",
      run: () =>
        saveBilgi(org, { parkur: null }).then(
          () => (toast("Parkur silindi"), setStep(0)),
          (e) => {
            toast("Silinemedi");
            throw e;
          },
        ),
    });
  const pin = at("pin");
  const last = step === PK_STEPS.length - 1;
  return (
    <div className="bzy-pk">
      <div className="bzy-pksteps" role="tablist" aria-label="Parkur adımları">
        {PK_STEPS.map((n, i) => (
          <button key={n} type="button" role="tab" aria-selected={i === step} aria-label={`${i + 1}. ${n}`} data-st={i < step ? "done" : i === step ? "cur" : ""} onClick={() => setStep(i)} />
        ))}
      </div>
      <p className="bzy-pksn">
        {step + 1} / {PK_STEPS.length} · {PK_STEPS[step]}
      </p>
      {step === 0 && (
        <>
          <h3 className="bzy-pkq">Rüzgâr nereden esiyor?</h3>
          <BigNum label="Rüzgâr" unit="°" step={5} value={p.wind} onSave={(v) => put({ wind: v })} />
          <div className="bzy-pkch">
            {WIND_CH.map(([d, n]) => (
              <button key={d} type="button" aria-pressed={p.wind === d} onClick={() => put({ wind: d })} data-press>
                {n} {d}°
              </button>
            ))}
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <h3 className="bzy-pkq">Start hattı ne kadar?</h3>
          <BigNum label="Start hattı" unit="m" step={10} min={20} max={2000} value={p.line} onSave={(v) => put({ line: v })} />
          <div className="bzy-pkch">
            {LINE_CH.map((m) => (
              <button key={m} type="button" aria-pressed={p.line === m} onClick={() => put({ line: m })} data-press>
                {m} m
              </button>
            ))}
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <h3 className="bzy-pkq">Hakem botu nerede?</h3>
          <PtWays label="Hakem botu" pt={p.komite} primary onSave={(q) => put({ komite: q })} onPick={onPick} />
          <div className="bzy-pkval">
            <span>Şu an</span>
            <b className="num">{p.komite ? fmtPt(p.komite) : "—"}</b>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <h3 className="bzy-pkq">Pin</h3>
          <div className="bzy-pkval">
            <span>{p.marks?.pin ? "Elle" : "Otomatik"}</span>
            <b className="num" data-auto={p.marks?.pin ? undefined : "1"}>
              {pin ? fmtPt(pin) : "Önce rüzgâr ve hakem botu"}
            </b>
          </div>
          <PtWays label="Pin" pt={pin} onSave={(q) => put({ marks: { pin: q } })} onPick={onPick} />
          {p.marks?.pin && (
            <Button variant="secondary" onClick={() => put({ marks: { pin: null } })}>
              Otomatiğe dön
            </Button>
          )}
        </>
      )}
      {last && (
        <>
          <Seg value={p.type} items={PK_TYPES} onPick={(k) => put({ type: k })} />
          <div className="bzy-list">
            <NumIn label="1 numaraya" unit="m" value={p.orsa} onSave={(v) => put({ orsa: v ?? 900 })} />
          </div>
          {c.has ? (
            <div className="bzy-list bzy-pkmk">
              {markKeys(p.type)
                .filter((k) => k !== "pin")
                .map((k) => {
                  const q = at(k);
                  return (
                    <div key={k} className="bzy-pkr">
                      <button type="button" className="bzy-fr" aria-expanded={mk === k} onClick={() => setMk((x) => (x === k ? "" : k))}>
                        <b>{PK_NAMES[k]}</b>
                        <span className={`num${p.marks?.[k] ? "" : " auto"}`}>{q ? fmtPt(q) : "—"}</span>
                      </button>
                      {mk === k && (
                        <div className="bzy-ptin">
                          <PtWays label={PK_NAMES[k]} pt={q} onSave={(x) => (put({ marks: { [k]: x } }), setMk(""))} onPick={onPick} />
                          {p.marks?.[k] && (
                            <Button variant="secondary" onClick={() => (put({ marks: { [k]: null } }), setMk(""))}>
                              Otomatiğe dön
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="bzy-pksn">Şamandıralar rüzgâr ve hakem botu girilince yerleşir.</p>
          )}
          {extra}
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
      )}
      <div className="bzy-pknav">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Geri
        </Button>
        <Button onClick={() => (last ? onDone() : setStep(step + 1))}>{last ? "Bitti" : "İleri"}</Button>
      </div>
    </div>
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
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  rota: (
    <>
      <path d="M4 19c4 0 4-6 8-6s4-8 8-8" />
      <circle cx="4" cy="19" r="1.5" />
      <circle cx="20" cy="5" r="1.5" />
    </>
  ),
};
const Ic = ({ n }) => (
  <svg viewBox="0 0 24 24" className="bzy-i" aria-hidden="true">
    {IC[n]}
  </svg>
);

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

// Sporcu kareleri (Seyhun 2026-11-28 "Hangisine basarsam onunla konuşurum", örnek 2 "Yap"): sayıya göre alttan dolar (kareSpans,
// 6 sütunlu ızgara), en çok 3 satır görünür, fazlası kaydırılır. Kayıttaki kare kırmızı; basılı tutunca sporcu penceresi.
const sailNo = (m) => String(m?.sail || "").match(/\d+/)?.[0] || (m?.name || "?").slice(0, 3);
function Kareler({ list, ceza, hot, cd, stOf, hold, onTap }) {
  const sp = kareSpans(list.length);
  return (
    <div className="bzk-g" data-c={list.length <= 4 ? "2" : "3"}>
      {list.map((m, i) => {
        const st = stOf?.(m);
        return (
          <button
            key={m.id}
            type="button"
            className="bzk-k"
            style={{ gridColumn: `span ${sp[i]}` }}
            data-hot={hot?.key === m.id ? hot.st : undefined}
            data-cd={cd === m.id ? "1" : undefined}
            aria-label={`${m.sail || ""} ${m.name || ""}`.trim() || "Sporcu"}
            onPointerDown={hold ? () => hold.on(m.id) : undefined}
            onPointerUp={hold?.off}
            onPointerLeave={hold?.off}
            onPointerCancel={hold?.off}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => onTap(e, m)}
            data-press
          >
            <b className="num">{sailNo(m)}</b>
            <small>{m.name || m.sail || "Sporcu"}</small>
            {st && <i data-k={st.k} aria-label={st.t} />}
            {ceza[m.id] ? <em data-k={ceza[m.id].k}>{PEN[ceza[m.id].k].short}</em> : null}
          </button>
        );
      })}
    </div>
  );
}
// Konuşurken üstte kırmızı şerit: kime, süre, Vazgeç (gönderilmeden kapanır). Göndermek için aynı kareye bir daha dokunulur.
function RecBar({ ptt, name, now }) {
  const rec = ptt.rec;
  const sec = rec ? Math.max(0, Math.floor((now - rec.t0) / 1000)) : 0;
  return (
    <div className="bzk-rec" data-st={rec ? (rec.cancel ? "cancel" : "rec") : "arm"} aria-live="polite">
      <span>
        {rec ? `● ${name} · ${Math.floor(sec / 60)}:${pad(sec % 60)}${ptt.max - sec <= 10 ? ` · ${ptt.max - sec} sn kaldı` : ""}` : `${name} · mikrofon açılıyor…`}
      </span>
      {rec && (
        <button type="button" onClick={ptt.cancel} data-press>
          Vazgeç
        </button>
      )}
    </div>
  );
}
// Sporcu penceresi (Seyhun 2026-11-25 örnek "Yönet Ceza Uyarısı"): adına basılı tutunca açılır. Ceza: 360° / 720° / FD (faux départ);
// sporcunun ekranında 10 sn tam ekran, sonra şerit; buradan "Cezayı kaldır" ile kalkar. Haritada noktası renkli, adının yanında rozet.
const sailName = (bt) => [bt?.sail, bt?.name].filter(Boolean).join(" · ");
// Ceza sayfası (Seyhun 2026-11-28 "Ceza ver bastığımda yine aynı kare formatta sporcular çıkar… 3 saniye geri sayımdan sonra gönderilir…
// iptal edebilirim"): üstte ceza türü (1 dönüş seçili), altta aynı kareler; kareye dokununca 3 sn, İptal ile durur, süre bitince gider.
// Cezası olan kareye dokununca aynı 3 sn ile kaldırılır.
function PenPage({ org, members, ceza, ctx, onDone }) {
  const toast = useToast();
  const [k, setK] = useState(Object.keys(PEN)[0]);
  const [cd, setCd] = useState(null); // { id, v, end }
  const [tk, setTk] = useState(0);
  useEffect(() => {
    if (!cd) return;
    const iv = setInterval(() => setTk(Date.now()), 200);
    const to = setTimeout(async () => {
      const m = members.find((x) => x.id === cd.id);
      const cur = ceza[cd.id];
      setCd(null);
      try {
        await setCeza(org, cd.id, cd.v);
        if (cd.v || cur?.k) logEv(org, cd.v ? { kind: "ceza", k: cd.v, to: sailName(m), dev: cd.id } : { kind: "ceza-off", k: cur.k, to: sailName(m), dev: cd.id }, ctx);
        toast(cd.v ? `${sailName(m) || "Sporcu"} · ${PEN[cd.v].name} gönderildi` : "Ceza kaldırıldı");
        onDone();
      } catch {
        toast("Gönderilemedi, tekrar dene.");
      }
    }, Math.max(0, cd.end - Date.now()));
    return () => (clearInterval(iv), clearTimeout(to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cd]);
  const left = cd ? Math.max(1, Math.ceil((cd.end - tk) / 1000)) : 0;
  const cm = cd && members.find((x) => x.id === cd.id);
  return (
    <>
      <div className="bzk-seg" role="radiogroup" aria-label="Ceza türü">
        {Object.entries(PEN).map(([v, p]) => (
          <button key={v} type="button" role="radio" aria-checked={k === v} data-k={v} disabled={!!cd} onClick={() => setK(v)} data-press>
            {v === "fd" || v === "sb" ? p.name : p.short}
          </button>
        ))}
      </div>
      {cd ? (
        <div className="bzk-cd" data-k={cd.v || "off"} aria-live="polite">
          <b className="num">{left}</b>
          <span>
            {cm?.name || cm?.sail || "Sporcu"} · {cd.v ? PEN[cd.v].name : "ceza kaldırılıyor"}
          </span>
          <button type="button" onClick={() => setCd(null)} data-press>
            İptal
          </button>
        </div>
      ) : null}
      <Kareler
        list={members}
        ceza={ceza}
        cd={cd?.id}
        onTap={(e, m) => {
          if (cd) return;
          const t = Date.now();
          setTk(t);
          setCd({ id: m.id, v: ceza[m.id]?.k === k ? "" : k, end: t + 3000 });
        }}
      />
    </>
  );
}
function SporcuSheet({ org, id, boat, cur, ctx, onClose, onVideo, onNot }) {
  const toast = useToast();
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const k = pick || cur?.k || "";
  const name = [boat?.sail, boat?.name].filter(Boolean).join(" · ") || "Sporcu";
  const run = async (v) => {
    setBusy(true);
    try {
      await setCeza(org, id, v);
      if (v || cur?.k) logEv(org, v ? { kind: "ceza", k: v, to: sailName(boat), dev: id } : { kind: "ceza-off", k: cur.k, to: sailName(boat), dev: id }, ctx);
      toast(v ? `${PEN[v].name} gönderildi` : "Ceza kaldırıldı");
      setPick("");
      onClose();
    } catch {
      toast("Gönderilemedi, tekrar dene.");
    }
    setBusy(false);
  };
  return (
    <Sheet open={!!id} onClose={() => (setPick(""), onClose())} title={name}>
      <div className="bzy-pens" role="radiogroup" aria-label="Ceza">
        {Object.entries(PEN).map(([v, p]) => (
          <button key={v} type="button" role="radio" aria-checked={k === v} data-k={v} onClick={() => setPick(v)} data-press>
            <b>{p.name}</b>
            <small>{p.deg}</small>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <RecPick onFile={onVideo(boat)} className="btn btn-secondary w-full" aria-label={`${name}: video çek`}>
            ● Video
          </RecPick>
          <Button variant="secondary" full onClick={() => onNot(id)}>
            Sesli not
          </Button>
        </div>
        <Button variant="primary" full disabled={busy || !k || k === cur?.k} onClick={() => run(k)}>
          {cur && k !== cur.k ? "Cezayı değiştir" : "Cezayı gönder"}
        </Button>
        {cur && (
          <Button variant="danger" full disabled={busy} onClick={() => run("")}>
            Cezayı kaldır
          </Button>
        )}
      </div>
    </Sheet>
  );
}

// Kanal satırının sağındaki durum: konuşurken ne olduğu, sonra son gidenin durumu (birkaç saniye)
function talkSt(ptt, last, d, now, to) {
  const name = last?.to?.name || "Hepsi";
  if (ptt.rec) return ["rec", `${to?.name || "Hepsi"} · bitirmek için dokun`];
  if (ptt.arm) return ["", "Mikrofon açılıyor…"];
  if (!last || !d || now - last.at > 8000) return null;
  if (d.state === "wait") return ["", `${name} · gidiyor…`];
  if (d.state === "seen") return ["ok", `✓✓ ${name} gördü`];
  if (d.state === "sent") return ["", `✓ ${name} · iletildi`];
  return ["bad", d.state === "part" ? `${d.seen}/${d.of} gördü` : "Ulaşmadı"];
}

// Son gönderilenin durumu: İletildi (sunucu onayı, tik çizilerek) → Görüldü (ekran gösterdi/çaldı) → 15 sn'de görmeyen Ulaşmadı + Tekrar
// Ulaşmayan gönderim (Seyhun 2026-11-27 "istersem gönderirim, istersem iptal"): kendiliğinden yeniden gitmez; Gönder ya da İptal.
// Bir dakikadan eskiyse ne zaman gönderildiği yazar.
function LastSent({ last, boats, ch, now, onAgain, onDrop }) {
  const d = deliveryOf(last && { id: last.id, at: last.at, to: last.to?.dev || "", ok: last.ok }, boats, ch, now);
  if (!last || !d) return null;
  const what = last.kind === "ses" ? `Ses · ${last.dur || 0} sn` : last.text;
  const who = last.to ? `${last.to.name} · ` : "";
  const age = Math.floor((now - last.at) / 60000);
  return (
    <div className="bzy-sent" data-st={d.state}>
      <p>
        {who}
        {what}
        {age >= 1 ? <small className="bzy-age"> · {age} dk önce</small> : null}
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
          <button type="button" className="bzy-again" onClick={onAgain} data-press>
            Gönder
          </button>
          <button type="button" className="bzy-drop" onClick={onDrop} aria-label="İptal" data-press>
            İptal
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
    // Gelen ses yalnız 30 sn içindeyse çalınır (sunucu saatiyle; ilk cevapta da sonra bağlanınca da).
    // Çalınan/görülen sesler cihazda saklanır (Seyhun 2026-11-21 "güncellemeden sonra eski ses yeniden seslendirildi"): uygulama
    // yeniden açılınca ya da güncellenip yenilenince aynı ses bir daha çalınmaz; sporcu telefonunun saati ileri olsa da çalınmaz.
    const first = seen.current === null;
    if (first) seen.current = new Set(heardIds());
    let added = false;
    for (const g of g0.list) {
      if (!g.id || seen.current.has(g.id)) continue;
      seen.current.add(g.id);
      added = true;
      // Yalnız gönderildiği an (30 sn, sunucu saatiyle) çalınır: iPad kapalıyken gelen ses açılınca ya da bağlantı dönünce çalmaz
      if (g.data && isLive(g.at, 30e3)) q.current.push(g);
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
  const [toSel, setToSel] = useState([]);
  const [last, setLast] = useState(null);
  const marked = useRef("");
  const [sheet, setSheet] = useState("");
  const [typing, setTyping] = useState(false);
  const mapApi = useRef(null);
  // Parkur adımı (pencere kapanıp haritada yerleştirince aynı adıma dönülür) ve haritada yerleştirme (nişan haritanın ortasında)
  const [pkStep, setPkStep] = useState(null);
  const [pick, setPick] = useState(null);
  const startPick = (label, pt, save) => {
    setPick({ label, save });
    setSheet("");
    if (pt) mapApi.current?.go(pt);
  };
  const endPick = () => (setPick(null), setSheet("parkur"));
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
  const ctx = { label: b?.label || "", state: b?.state || "", course: b?.course || "", ch, by: profile?.name || "" };
  // Kanallar (Seyhun 2026-11-17): liste, tekrar aç, sil (Geri al'lı, verisiyle), izi geri oynat
  const kanallar = useKanallar(org);
  const [hidden, setHidden] = useState([]);
  const [izK, setIzK] = useState(null);
  // Sunucu saati farkı (lib/serverClock): açılışta ve öne gelince ölçülür (anlık sesler yalnız gönderildiği an çalar)
  useEffect(() => {
    syncClock();
    const v = () => document.visibilityState === "visible" && syncClock();
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, []);
  // Gün kaydı (Seyhun 2026-11-26): Günler › ⋯ › Gün kaydı; belge PDF olarak açılır, Paylaş ile kaydedilir/gönderilir
  const [gunK, setGunK] = useState(null);
  const gunId = gunK?.id || "";
  const loadGun = useCallback(async () => {
    const [{ gunRows }, { buildGunKaydiPdf }, { loadFonts }] = await Promise.all([
      import("@/lib/gunKaydi"),
      import("./gunKaydiPdf"),
      import("@/features/athletes/raceDocs"),
    ]);
    const [d, fonts] = await Promise.all([loadGunKaydi(org, gunId), loadFonts()]);
    return buildGunKaydiPdf(gunRows(d), fonts);
  }, [org, gunId]);
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
  const iz = useIz(org, izK?.id || "", !!izK && !(kanal?.open && kanal.id === izK.id));
  const kaliplar = useKaliplar(org);
  const [mini, setMini] = useState(false);
  const app = useSyncExternalStore(noSub, hasCamera, () => false);
  useEffect(() => {
    if (org && kanal?.open && kanal.id && kanallar && !kanallar.some((x) => x.id === kanal.id)) ensureKanal(org, kanal).catch(() => {});
  }, [org, kanal, kanallar]);
  const kRun = async (fn, err) => {
    setKbusy(true);
    await fn().catch(() => toast(err));
    setKbusy(false);
  };
  const arcK = (k, on = true) =>
    arsivKanal(org, k.id, on).then(
      () => toast(on ? `"${k.name}" arşive atıldı` : `"${k.name}" arşivden çıktı`, on ? { action: { label: "Geri al", onClick: () => arsivKanal(org, k.id, false).catch(() => {}) } } : {}),
      () => toast("Olmadı, tekrar dene."),
    );
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
  // Kime: seçili sporcular (kanalda açık olanlar); hiçbiri seçili değilse Hepsi
  const sel = members.filter((m) => toSel.includes(m.id));
  const nm = (m) => m.name || m.sail || "Sporcu";
  const to = sel.length ? { dev: sel.map((m) => m.id).join(","), name: sel.length > 2 ? `${sel.length} kişi` : sel.map(nm).join(", ") } : null;
  const talk = useGelenPlay(org, ctx, () => reload());
  // Parça parça (Seyhun 2026-11-25): konuşurken 2,5 sn'de bir gider, sporcu ekranı sırayla çalar
  const ptt = usePtt({
    send: (blob, dur, to) => sendSes(org, blob, dur, ctx, to),
    onSent: (x) => got(x),
    max: 60,
    live: {
      part: (blob, seq, end, id, to, dur) => sendSesPart(org, { id, seq, end, blob, dur, to }),
      finish: (id, dur, to) => finishSes(org, ctx, id, dur, to),
      cancel: (id) => cancelSes(org, id),
    },
  });
  const got = (x) => {
    setLast((o) => ({ ...(o && o.at === x.at ? o : {}), ...x }));
    if (x.ok != null) reload();
    if (x.kind === "ses" && x.ok && x.blob && x.logId && !x.kalip) yaziOf(x);
  };
  // Giden sesin yazısı (Seyhun 2026-11-28): yalnız burada görünür; "Yanlış" ile ses + yazı bildirilir
  const yaziDone = useRef(new Set());
  const yaziOf = (x) => {
    if (yaziDone.current.has(x.logId)) return;
    yaziDone.current.add(x.logId);
    const put = (patch) => setLast((o) => (o && o.logId === x.logId ? { ...o, ...patch } : o));
    put({ yazi: null });
    sesYazi(x.blob, members.map((m) => m.name).filter(Boolean)).then(
      (t) => (put({ yazi: t || "" }), t && markLog(org, x.logId, { yazi: t }).then(reload)),
      () => put({ yazi: "" }),
    );
  };
  const yaziBad = () => {
    const x = last;
    if (!x?.logId || x.hata) return;
    setLast((o) => (o && o.logId === x.logId ? { ...o, hata: true } : o));
    yaziHata(org, { logId: x.logId, yazi: x.yazi, blob: x.blob, dur: x.dur, to: x.to }, ctx).then(
      () => toast("Bildirildi · ses ve yazı kaydedildi"),
      () => (setLast((o) => (o && o.logId === x.logId ? { ...o, hata: false } : o)), toast("Bildirilemedi, tekrar dene.")),
    );
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
  const ceza = b?.ceza || {};
  const athTag = (m) => m?.name || m?.sail || "";
  const shot = (tags) => (f) => {
    setShooting(null);
    if (!f) return toast("Video kaydedilemedi. Fotoğraflar iznini kontrol et.");
    setSheet("");
    setVid({ file: f, tags: tags.filter(Boolean) });
  };
  const saveVid = (tags) => {
    const job = vid;
    setVid(null);
    if (!job) return;
    toast("Video galeriye ekleniyor…");
    saveYonetVideo(org, kday || dayKey(now), job.file, tags).then(
      (m) => (logEv(org, { kind: "video", tags: tags || [], dur: Math.round(m?.dur || 0) }, ctx), toast(`Video galeride · ${dayLabel(kday || dayKey(now))}`)),
      (e) => toast(e?.message ? `Video galeriye eklenemedi: ${e.message}` : "Video galeriye eklenemedi. Fotoğraflar'da duruyor."),
    );
  };
  const liveBoats = chBoats.filter((x) => now - (x.t || 0) < LIVE_MS).map((x) => (ceza[x.id] ? { ...x, pen: PEN[ceza[x.id].k].short, penK: ceza[x.id].k } : x));
  const holdOn = (id) => {
    const h = holdT.current;
    h.fired = false;
    clearTimeout(h.t);
    if (id)
      h.t = setTimeout(() => {
        h.fired = true;
        setSheet(`sp:${id}`);
      }, 550);
  };
  const holdOff = () => clearTimeout(holdT.current.t);
  // Kareye dokun: kayıt başlar (kare kırmızı); bir daha dokun: gider. Kayıt sürerken hangi kareye dokunulursa dokunulsun kayıt biter ve gider.
  const hot = ptt.rec ? { key: ptt.rec.key, st: ptt.rec.cancel ? "cancel" : "rec" } : ptt.arm ? { key: ptt.arm.key, st: "arm" } : null;
  const hotName = !hot || hot.key === "all" ? "Hepsi" : nm(members.find((m) => m.id === hot.key) || {});
  const talkTo = (e, m) => {
    if (holdT.current.fired) return void (holdT.current.fired = false);
    if (ptt.rec || ptt.arm) return ptt.flip(e, m ? m.id : "all", null);
    setToSel(m ? [m.id] : []);
    ptt.flip(e, m ? m.id : "all", m ? { dev: m.id, name: nm(m) } : null);
  };
  // Cezayı tek dokunuşla kaldır (Seyhun 2026-11-25 "2-3 adımda kaldırabiliyorum"): panel düğmesi ya da haritadaki rozet; 5 sn Geri al
  const unPen = (id, auto = false) => {
    const c = ceza[id];
    if (!c) return;
    const bt = chBoats.find((x) => x.id === id);
    const ev = { k: c.k, to: sailName(bt), dev: id };
    setCeza(org, id, null).then(
      () => (
        logEv(org, { kind: "ceza-off", ...ev, ...(auto ? { auto: true } : {}) }, ctx),
        toast(`${athTag(bt) || "Sporcu"} · ${PEN[c.k].name} kaldırıldı`, {
          action: { label: "Geri al", onClick: () => setCeza(org, id, c.k, true).then(() => logEv(org, { kind: "ceza", ...ev, back: true }, ctx), () => {}) },
        })
      ),
      () => toast("Kaldırılamadı, tekrar dene."),
    );
  };
  // Ceza bildirimi (Seyhun 2026-11-26 "gösterilsin 5 saniye, geri sayım yapılsın, ceza da kaldırılsın"): haritanın sağ üstünde büyük
  // kare; 5 sn sayar, sonra ceza kendiliğinden kalkar (Geri al ile geri gelir ve artık kendiliğinden kalkmaz). Dokununca hemen kalkar.
  // Sporcu ekranı 10 sn'lik tam ekranını yine de bitirir.
  const penNew = Object.entries(ceza).reduce((a, [id, c]) => (PEN[c?.k] && !c.keep && c.at > (a?.c.at || 0) ? { id, c } : a), null);
  const penLeft = penNew ? Math.max(0, Math.ceil((penNew.c.at + 5e3 - now) / 1000)) : 0;
  const penGone = useRef(new Set());
  useEffect(() => {
    for (const [id, c] of Object.entries(ceza)) {
      const key = `${id}:${c?.at}`;
      if (!PEN[c?.k] || c.keep || now - c.at < 5e3 || penGone.current.has(key)) continue;
      penGone.current.add(key);
      unPen(id, true);
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hazır kalıplar kapalı durur (Seyhun 2026-11-26 "el dokunabiliyor, bir anda gidilebiliyor"): "Kalıplar" ile açılır,
  // birini gönderince ya da 10 sn dokunulmazsa kapanır (tekrar sürüyorsa açık kalır)
  const [kOpen, setKOpen] = useState(0);
  // Alt panel sayfası: "" | "ceza" | "kalip" (Seyhun 2026-11-26 "o an zaten sadece ceza vereceğiz")
  const [pg, setPg] = useState("");
  const openPg = (p) => (setMini(false), setTyping(false), setKOpen(0), setPg(p));

  const repeat = useRepeat(org, kaliplar, ctx, got);
  const kShow = !!repeat.rep;
  const sendK = async (k) => {
    const at = clock();
    got({ ...kalipEntry(k), to, at, ok: null });
    const r = await sendKalip(org, kaliplar, k, ctx, to).catch(() => ({ ok: false }));
    got({ ...kalipEntry(k), to, at, ...r, ok: !!r.ok });
  };
  // "Kalıp yap": bas-konuşla giden son ses 30 sn boyunca kalıp olarak saklanabilir
  const canKalip = last?.kind === "ses" && !!last.blob && !last.kalip && last.ok === true && now - last.at < 30e3;
  const kday = kanal?.open ? kanalDay((kanallar || []).find((x) => x.id === kanal.id) || kanal) : "";
  const pnl = useRef(null);
  // Yönet videosu (Seyhun 2026-11-25): çekilince etiket penceresi; seçili sporcular hazır etiket; kaydedince o günün galerisine yüklenir
  const [vid, setVid] = useState(null); // { file, tags }
  // Video etiketinde sporcular: bugün kanala katılanlar + kulübün etkin sporcuları (video ekranı açılınca bir kez yüklenir)
  const [clubAth, setClubAth] = useState(null);
  useEffect(() => {
    if (!vid || clubAth) return;
    loadAthletes().then(
      ({ athletes }) => setClubAth((athletes || []).filter((a) => a.status === "active" && a.studentName).map((a) => a.studentName.trim())),
      () => setClubAth([]),
    );
  }, [vid, clubAth]);
  const vidPeople = [...new Set([...chBoats.map(athTag), ...(clubAth || []).sort((a, b) => a.localeCompare(b, "tr"))].filter(Boolean))];
  // Sporcu adına basılı tutunca (550 ms) o sporcunun penceresi (ceza); kısa dokunuş yalnız seçer
  const holdT = useRef({ t: 0, fired: false });
  useEffect(() => {
    const el = pnl.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => el.closest(".bzy-app")?.style.setProperty("--pnl", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const swipe = useRef(0);
  if (!org) return <main className="p-6 text-mut">Bu sayfa ana hesapta ve antrenörde açılır.</main>;

  // Harita düzeni (Seyhun 2026-11-22 örnekler "Yönet harita düzeni" + "Yönet alt panel" onaylandı "Yap"): harita bütün ekran. Kanal kapalıyken
  // yalnız Kanal aç kartı. Açıkken üstte yalnız geri; solda araçlar (en altta onaylı Kapat), sağda yakınlaştır/uzaklaştır/sığdır/video;
  // altta süre paneli (küçük kanal adı → Link, Ekranı aç, Eski kanallar; süre; boydan boya Başlat), üstünde sağda ayrı konuşma (örnek "Yönet alt kısım 2").
  const open = !!kanal?.open;
  const antOnTop = club && (!!ant || !yaris.data);
  const tools = [
    ...(yaris.data
      ? [
          ["sonuc", "Sonuçlar"],
          ["grup", "Gruplar"],
          ["prog", "Program"],
        ]
      : []),
    ...(antOnTop ? [["ant", "Antrenman"]] : []),
    ["parkur", "Parkur"],
    ["ekran", "Ekran"],
    ["hava", "Hava"],
    ["mesaj", "Mesajlar"],
    ["rota", "Rotalar"],
    ["kayit", "Kayıtlar"],
  ];
  const closeAsk = () => {
    let err = false;
    return ask({
      title: "Gün bitsin mi?",
      text: "Sporcuların ekranı durur. Rotalar ve kayıtlar saklanır.",
      yes: "Günü bitir",
      run: () => closeKanal(org, kanal.id).catch((e) => ((err = true), Promise.reject(e))),
    }).then((ok) => {
      if (err) return toast("Kapatılamadı");
      // Antrenmanda kapanınca "Antrenman olarak kaydet?" (Seyhun 2026-11-23); yarış gününde sorulmaz
      if (ok && antOn) setAntK(kanal), setSheet("kaydet");
    });
  };
  // Günü bitir (Seyhun 2026-11-28 "çok fazla aksiyon istiyor"): üst çubukta sabit "Bitir". Antrenmanda tek pencere: özet + "Bitir ve kaydet"
  // (2 dokunuş; eskiden ⋯ › Günü bitir › onay › Kaydet = 4). Yarış gününde Bitir + onay.
  const endDay = () => {
    if (!antOn) return closeAsk();
    setAntUsed(true);
    setSheet("bitir");
  };
  const endOnly = () =>
    closeKanal(org, kanal.id).then(
      () => true,
      () => (toast("Kapatılamadı"), false),
    );
  const tst = talkSt(ptt, last, dl0, now, to);
  // Antrenman (BilgiAntrenman.jsx): yarış günü değilse ya da antrenmandan gelindiyse; kanal kaydı listeden (starts, end, plan)
  const antOn = club && (!!ant || !yaris.data);
  // Sporcular (kulüp listesi) yalnız Antrenman penceresi ilk açılınca okunur; sonra iç pencereler (Yoklama, Günlük) için açık kalır
  if (!antUsed && (sheet === "ant" || sheet === "kaydet" || sheet === "bitir")) setAntUsed(true);
  const antBase = sheet === "kaydet" && antK ? antK : kanal;
  const antDoc = antBase?.id ? { ...antBase, ...(kanallar?.find((x) => x.id === antBase.id) || {}) } : null;
  const pickTool = (k) => {
    if (k === "rota") return setSheet(""), setIzK(kanal);
    setSheet(k);
  };
  const names = [...new Set([antAd, yaris.data?.race?.name?.slice(0, 30), "Antrenman"].filter(Boolean))];
  return (
    <main className="bzy-app" aria-label="Bilgi ekranı yönetimi" data-open={open && !izK ? "1" : undefined} data-mini={mini ? "1" : undefined}>
      <TekneMap boats={izK ? iz.boats : liveBoats} tracks={izK ? iz.tracks : null} course={course.has ? course : null} talk={izK ? "" : talk?.dev || ""} full api={mapApi} onPen={izK ? null : unPen} me={!izK} pick={!!pick} />
      {izK && <IzPanel k={izK} iz={iz} onClose={() => setIzK(null)} />}
      {!izK && talk && !liveBoats.some((x) => x.id === talk.dev && Number.isFinite(x.lat)) && (
        <div className="bzy-talk" role="status">
          {talk.who}
          <Wave />
        </div>
      )}
      {/* Ekran belgesi gelmeden Günü başlat gösterilmez (gün açıkken bir an görünüp kaybolmasın, Seyhun 2026-11-26) */}
      {!izK && !open && b !== undefined && (
        <>
          <Link href="/" className="btn btn-round bzy-fab bzy-back" aria-label="Geri" data-press>
            <Ic n="back" />
          </Link>
          <div className="bzy-veil" />
          <DayStart key={kanal?.id || "yok"} org={org} kanal={kanal} kanallar={kanallar} names={names} onList={() => setSheet("kanallar")} onIz={(k) => setIzK(k)} hidden={hidden} onDel={delK} onArc={arcK} onLog={setGunK} />
        </>
      )}
      {!izK && open && (
        <>
          <div className="bzy-tb">
            <Link href="/" className="btn btn-round bzy-fab" aria-label="Geri" data-press>
              <Ic n="back" />
            </Link>
            <button type="button" className="bzy-dayb" onClick={() => setSheet("kanal")} data-press>
              <i className="bzy-dot" aria-hidden="true" />
              <b>{kanal.name}</b>
              <span className="num">
                {dayLabel(kday)} · {members.length} kişi
              </span>
            </button>
            <button type="button" className="bzy-endb" onClick={endDay} data-press>
              Bitir
            </button>
            <button type="button" className="btn btn-round bzy-fab" aria-label="Araçlar" onClick={() => setSheet("araclar")} data-press>
              <Ic n="more" />
            </button>
          </div>
          {penLeft > 0 && (
            <button type="button" className="bzy-penc" data-k={penNew.c.k} onClick={() => (penGone.current.add(`${penNew.id}:${penNew.c.at}`), unPen(penNew.id))} aria-label="Cezayı kaldır" data-press>
              <small>Ceza verildi</small>
              <b className="pn">{PEN[penNew.c.k].name}</b>
              <span>{athTag(chBoats.find((x) => x.id === penNew.id)) || "Sporcu"}</span>
              <em className="num">{penLeft}</em>
            </button>
          )}
          <div className="bzy-rr">
            <div className="bzy-zm">
              <button type="button" className="btn btn-icon" aria-label="Yakınlaştır" onClick={() => mapApi.current?.zoom(1)} data-press>
                <Ic n="plus" />
              </button>
              <button type="button" className="btn btn-icon" aria-label="Uzaklaştır" onClick={() => mapApi.current?.zoom(-1)} data-press>
                <Ic n="minus" />
              </button>
            </div>
            <button type="button" className="btn btn-round bzy-fab" aria-label={mini ? "Haritayı küçült" : "Haritayı büyüt"} onClick={() => (setMini((x) => !x), setPg(""))} data-press>
              {mini ? "⤡" : "⤢"}
            </button>
            <button type="button" className="btn btn-round bzy-fab" aria-label="Tekneleri sığdır" onClick={() => mapApi.current?.fit()} data-press>
              <Ic n="fit" />
            </button>
          </div>
          <div className="bzy-bot" ref={pnl}>
            {(dl0?.state === "fail" || dl0?.state === "part") && <LastSent last={last} boats={boats} ch={ch} now={now} onAgain={again} onDrop={() => (last?.logId && dl0 && markLog(org, last.logId, { st: dl0.state, seen: dl0.seen, of: dl0.of, drop: true }), setLast(null))} />}
            <section className="bzy-pnl" aria-label="Konuşma ve süre">
              <button
                type="button"
                className="bzy-grab"
                aria-label={mini ? "Paneli büyüt" : "Haritayı büyüt"}
                aria-expanded={!mini}
                onPointerDown={(e) => (swipe.current = e.clientY)}
                onPointerUp={(e) => {
                  const dy = e.clientY - swipe.current;
                  setMini((m) => (Math.abs(dy) < 12 ? !m : dy > 0));
                }}
              />
              {pg && !mini && (
                <div className="bzy-pgh">
                  <h3 data-k={pg}>
                    <small>{pg === "ceza" ? "Sporcuya dokun · 3 sn" : `Hazır · ${to?.name || "Hepsi"}`}</small>
                    {pg === "ceza" ? "Ceza ver" : "Kalıp"}
                  </h3>
                  <button type="button" className="bzy-pgx" onClick={() => setPg("")} aria-label="Kapat" data-press>
                    ✕
                  </button>
                </div>
              )}
              {!pg && !mini && last?.kind === "ses" && last.yazi !== undefined && now - (last.at || 0) < 120e3 && (
                <div className="bzy-yazi" aria-live="polite">
                  {last.yazi === null ? <span className="bzy-yw">Yazıya çevriliyor…</span> : last.yazi ? <q>{last.yazi}</q> : <span className="bzy-yw">Yazıya çevrilemedi</span>}
                  {last.yazi !== null && (
                    <button type="button" className="bzy-ybad" disabled={!!last.hata} onClick={yaziBad} data-press>
                      {last.hata ? "Bildirildi" : "Yanlış"}
                    </button>
                  )}
                </div>
              )}
              {!pg && !mini && (ptt.rec || ptt.arm) && <RecBar ptt={ptt} name={hotName} now={now} />}
              {!pg && !(ptt.rec || ptt.arm) && <div className="bzy-kl">
                {tst ? (
                  <span className="bzy-tst" data-k={tst[0] || undefined} aria-live="polite">
                    {tst[1]}
                  </span>
                ) : (
                  <span className="bzy-tst" />
                )}
                {canKalip && (
                  <button type="button" className="bzy-kyap" onClick={() => setSheet("kyap")} data-press>
                    Kalıp yap
                  </button>
                )}
              </div>}
              {!mini && !pg && typing && (
                <form
                  className="bzy-typ"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!text.trim()) return;
                    setTyping(false);
                    await send();
                  }}
                >
                  <input
                    className="bzy-in"
                    autoFocus
                    value={text}
                    maxLength={200}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={() => !text.trim() && setTimeout(() => setTyping(false), 150)}
                    placeholder={`Mesaj · ${to?.name || "Hepsi"}`}
                    aria-label="Mesaj"
                    enterKeyHint="send"
                  />
                  <button type="submit" className="btn btn-primary btn-round bzy-snd" disabled={!text.trim()} aria-label="Gönder" data-press>
                    <Ic n="send" />
                  </button>
                </form>
              )}
              {/* Yeni düzen (Seyhun 2026-11-28 örnek 2 "Yap"): büyük Süre, Hepsi, sayıya göre sporcu kareleri; küçültünce tek sıra */}
              {mini ? (
                <div className="bzk-mini">
                  <PanelClock org={org} mini />
                  <div className="bzk-strip">
                    <button type="button" className="bzk-k bzk-all" data-hot={hot?.key === "all" ? hot.st : undefined} onClick={(e) => talkTo(e, null)} data-press>
                      <b>Hepsi</b>
                    </button>
                    {members.map((m) => (
                      <button key={m.id} type="button" className="bzk-k" data-hot={hot?.key === m.id ? hot.st : undefined} onClick={(e) => talkTo(e, m)} data-press>
                        <b className="num">{sailNo(m)}</b>
                        <small>{m.name || m.sail || "Sporcu"}</small>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                !pg && (
                  <>
                    <PanelClock org={org} />
                    <button
                      type="button"
                      className="bzk-hep"
                      data-hot={hot?.key === "all" ? hot.st : undefined}
                      aria-label={hot?.key === "all" ? "Bitir ve gönder · Hepsi" : "Konuş · Hepsi"}
                      onClick={(e) => talkTo(e, null)}
                      data-press
                    >
                      {hot?.key === "all" ? (hot.st === "arm" ? "Mikrofon açılıyor" : "Gönder · Hepsi") : "Hepsi · konuş"}
                      {allSt(dl0, last) && !last?.to ? <i data-k={allSt(dl0, last).k} /> : null}
                    </button>
                    {members.length ? (
                      <Kareler list={members} ceza={ceza} hot={hot} stOf={(m) => rowSt(last, m, now)} hold={{ on: holdOn, off: holdOff }} onTap={talkTo} />
                    ) : null}
                  </>
                )
              )}
              {pg === "ceza" && !mini && <PenPage org={org} members={members} ceza={ceza} ctx={ctx} onDone={() => setPg("")} />}
              {pg === "kalip" && !mini && (
                <KalipRow page list={kaliplar} rep={repeat.rep} now={now} onSend={(k) => (setPg(""), sendK(k))} onHold={(k) => setSheet(`ktek:${k.id}`)} onStop={repeat.stop} onAll={() => setSheet("kkayit")} />
              )}
              {/* Küçük kareler (Seyhun 2026-11-26 örnek A "konuş butonu tarzında, daha küçük, kare"): Ceza · Kalıp · Video · Yaz;
                  Kalıp açıkken yerlerini kalıp kareleri alır; konuşurken soluklaşır */}
              {!mini &&
                !pg &&
                (kShow ? (
                  <KalipRow list={kaliplar} rep={repeat.rep} now={now} onSend={(k) => (setKOpen(0), sendK(k))} onHold={(k) => setSheet(`ktek:${k.id}`)} onStop={repeat.stop} onAll={() => (setKOpen(0), setSheet("kaliplar"))} onClose={() => setKOpen(0)} />
                ) : (
                  <div className="bzy-sq" data-n={app ? "4" : "3"} data-dim={ptt.rec ? "1" : undefined}>
                    <button type="button" className="bzy-sqb pen" disabled={!members.length} onClick={() => openPg("ceza")} data-press>
                      <small>Sporcu</small>
                      <b>Ceza</b>
                    </button>
                    <button type="button" className="bzy-sqb" aria-expanded={false} onClick={() => openPg("kalip")} data-press>
                      <small>Hazır</small>
                      <b>Kalıp</b>
                    </button>
                    <VideoTile app={app} onDone={shot(sel.map(athTag))} />
                    <button type="button" className="bzy-sqb" aria-pressed={typing} onClick={() => setTyping((x) => !x)} aria-label="Yazarak mesaj" data-press>
                      <Ic n="kb" />
                      <b>Yaz</b>
                    </button>
                  </div>
                ))}
            </section>
          </div>
        </>
      )}
      <ToolsSheet
        open={sheet === "araclar"}
        onClose={() => setSheet("")}
        tools={tools}
        Ic={Ic}
        onPick={pickTool}
        onEnd={() => (setSheet(""), endDay())}
      />
      <KalipSheets org={org} list={kaliplar} view={sheet} onView={setSheet} src={canKalip || sheet === "kyap" ? last : null} to={to} members={members.length} onSend={sendK} repeat={repeat} onSaved={() => setLast((o) => (o ? { ...o, kalip: "saved" } : o))} />
      {antUsed && club && <AntrenmanSheets org={org} view={sheet} onView={setSheet} k={antDoc} boats={boats} ant={ant} onEnd={endOnly} />}
      <SporcuSheet org={org} id={sheet.startsWith("sp:") ? sheet.slice(3) : ""} boat={chBoats.find((x) => `sp:${x.id}` === sheet)} cur={ceza[sheet.slice(3)]} ctx={ctx} onClose={() => setSheet("")} onVideo={(bt) => shot([athTag(bt)])} onNot={(i) => setSheet(`not:${i}`)} />
      {/* Görünür giriş (Seyhun 2026-11-25 "ceza çalışmıyor"): basılı tutmayı bilmeyen için; tek sporcu seçiliyse doğrudan onun penceresi */}
      <Sheet open={sheet === "ceza"} onClose={() => setSheet("")} title="Ceza · sporcu seç">
        <div className="bzy-cezal">
          {members.map((m) => (
            <button key={m.id} type="button" onClick={() => setSheet(`sp:${m.id}`)} data-press>
              <span>{[m.sail, m.name].filter(Boolean).join(" · ") || "Sporcu"}</span>
              {ceza[m.id] ? <em className="bzy-pen" data-k={ceza[m.id].k}>{PEN[ceza[m.id].k].short}</em> : null}
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet.startsWith("not:")} onClose={() => setSheet("")} title={`Sesli not · ${athTag(chBoats.find((x) => `not:${x.id}` === sheet)) || "Sporcu"}`}>
        {sheet.startsWith("not:") && (
          <KalipKayit
            org={org}
            max={60}
            save={(blob, dur) => {
              const bt = chBoats.find((x) => `not:${x.id}` === sheet);
              return sendNot(org, bt, blob, dur, kday || dayKey(now)).then((r) => (logEv(org, { kind: "not", dur: Math.round(dur), to: sailName(bt), dev: bt?.id || "" }, ctx), r));
            }}
            onDone={() => (setSheet(""), toast("Not gönderildi"))}
          />
        )}
      </Sheet>
      <VideoTags job={vid} onSave={saveVid} people={vidPeople} />
      <Sheet open={sheet === "kanal"} onClose={() => setSheet("")} title={kanal?.name || "Kanal"}>
        <KanalInfo kanal={kanal} link={b?.link || ""} count={members.length} onList={() => setSheet("kanallar")} />
      </Sheet>
      <Sheet big open={sheet === "kanallar"} onClose={() => setSheet("")} title="Günler">
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
          onArc={arcK}
          onLog={(k) => (setSheet(""), setGunK(k))}
        />
      </Sheet>
      {gunK && <PdfViewer title="Gün kaydı" load={loadGun} onClose={() => setGunK(null)} />}
      <YarisSheets yaris={yaris} now={now} sheet={sheet} onClose={() => setSheet("")} onResult={addRes} resMsg={resMsg} />
      <Sheet big open={sheet === "hava"} onClose={() => setSheet("")} title="Hava">
        {sheet === "hava" && <RaceAtWx org={org} id={yaris.id} />}
      </Sheet>
      <Sheet open={sheet === "parkur"} onClose={() => (setSheet(""), setPkStep(null))} title="Parkur">
        <ParkurEdit
          org={org}
          pk={b?.parkur}
          step={pkStep ?? (b?.parkur?.komite ? 4 : 0)}
          setStep={setPkStep}
          onPick={startPick}
          onDone={() => (setSheet(""), setPkStep(null))}
          extra={
            <input
              className="bzy-in"
              value={state ?? b?.state ?? ""}
              maxLength={80}
              placeholder="Durum"
              onChange={(e) => setState(e.target.value)}
              onBlur={() => saveText("state", state)}
              aria-label="Parkur durumu"
            />
          }
        />
      </Sheet>
      {pick && (
        <div className="bzy-pickbar glass" role="dialog" aria-label={`${pick.label}: haritada yerleştir`}>
          <b>{pick.label}</b>
          <span>Haritayı kaydır, nişanı getir</span>
          <div className="bzy-row">
            <Button variant="secondary" onClick={endPick}>
              Vazgeç
            </Button>
            <Button
              onClick={() => {
                const q = mapApi.current?.center();
                if (q) pick.save(q);
                endPick();
              }}
            >
              Buraya koy
            </Button>
          </div>
        </div>
      )}
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
  return <YonetWx at={at} />;
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
