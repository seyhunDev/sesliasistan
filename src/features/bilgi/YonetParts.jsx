"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { RecPick } from "@/features/raceMedia/RecPick";
import { setShooting } from "@/features/raceMedia/shooting";
import { KALIP_HAZIR, KALIP_ONERI, addYaziKalip, delKalip, openKanal, readSaat, renameKalip, reopenKanal, saveKalip, saveSaat, sendKalip } from "./bilgiStore";
import { KAPAN_SAAT } from "@/lib/bilgi";
import { sayWith } from "@/lib/speech/ttsClient";
import { voiceType } from "@/lib/chatFile";
import { VTAGS, myTags, rememberTag } from "./yonetVideo";

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
export function DayStart({ org, kanal, kanallar, names, onList, onIz, hidden = [], onDel, onArc, onLog }) {
  const toast = useToast();
  const [today] = useState(() => dayKey(Date.now()));
  const [day, setDay] = useState(today);
  const [pick, setPick] = useState(names[0] || "Antrenman");
  const [busy, setBusy] = useState(false);
  const [saat, setSaat] = useState(readSaat);
  const have = (kanallar || []).find((k) => kanalDay(k) === day);
  const go = async () => {
    setBusy(true);
    await (have ? reopenKanal(org, have, kanal, saat) : openKanal(org, pick, kanal, day, saat)).catch(() => toast("Başlatılamadı"));
    setBusy(false);
  };
  const past = (kanallar || []).filter((k) => kanalDay(k) !== day && !k.arsiv && !hidden.includes(k.id)).slice(0, 3);
  const [menu, setMenu] = useState("");
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
      <div className="bzy-saat">
        <span>Kendiliğinden kapanma</span>
        <div className="bzy-chips" role="radiogroup" aria-label="Kendiliğinden kapanma">
          {KAPAN_SAAT.map((v) => (
            <button key={v} type="button" role="radio" aria-checked={saat === v} onClick={() => (setSaat(v), saveSaat(v))} data-press>
              {v ? `${v} sa` : "Kapalı"}
            </button>
          ))}
        </div>
      </div>
      <Button full loading={busy} className="bzy-open" onClick={go}>
        {have ? "Devam et" : "Başlat"}
      </Button>
      {/* Liste gelene kadar aynı boyda iskelet (pencere zıplamasın) */}
      {!kanallar && (
        <div className="bzy-days" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bzy-drow bzy-sk">
              <span className="bzy-dt" />
              <i />
            </div>
          ))}
        </div>
      )}
      {past.length > 0 && (
        <div className="bzy-days">
          {past.map((k) => (
            <div key={k.id} className="bzy-dwrap">
              <div className="bzy-drow">
                <span className="bzy-dt">
                  <b className="num">{dayDate(kanalDay(k)).getDate()}</b>
                  <small>{dayDate(kanalDay(k)).toLocaleDateString("tr-TR", { month: "short" })}</small>
                </span>
                <b className="flex-1 truncate">{k.name}</b>
                <button type="button" className="bzy-izle" onClick={() => onIz(k)} data-press>
                  İzle
                </button>
                <button type="button" className="bzy-dmore" onClick={() => setMenu((x) => (x === k.id ? "" : k.id))} aria-label="Ayarlar" aria-expanded={menu === k.id} data-press>
                  <I n="more" />
                </button>
              </div>
              {menu === k.id && (
                <div className="bzy-kmenu">
                  {onLog && (
                    <button type="button" onClick={() => (setMenu(""), onLog(k))} data-press>
                      Gün kaydı
                    </button>
                  )}
                  <button type="button" onClick={() => (setMenu(""), onArc?.(k))} data-press>
                    Arşive at
                  </button>
                  <button type="button" className="del" onClick={() => (setMenu(""), onDel?.(k))} data-press>
                    Sil
                  </button>
                </div>
              )}
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
    <RecPick onFile={onDone} className="bzy-sqb" aria-label="Video çek">
      <span className="bzy-sqdot" aria-hidden="true" />
      <b>Video</b>
    </RecPick>
  );
}
export const videoDone = (toast) => (f) => (setShooting(null), toast(f?.asset ? "Video Fotoğraflar'a kaydedildi" : "Video kaydedilemedi. Fotoğraflar iznini kontrol et."));

// Video etiketleri (Seyhun 2026-11-25): çekimden sonra açılır; seçili sporcu(lar) hazır etiketli, Orsa/Pupa/Start… dokunarak, yenisi yazılarak.
// Kaydet ya da pencereyi kapatmak videoyu o günün galerisine (Medya › Antrenman › Yönet) gönderir; video kaybolmaz.
// people: sporcu adları (Seyhun 2026-11-26 "sporcu da seçebiliyor olmam gerekiyor ama sporcular gösterilmedi"): önce bugün kanala
// katılanlar, sonra kulübün etkin sporcuları (kanal boşsa da seçilebilir); ayrı satırda
export function VideoTags({ job, onSave, people = [] }) {
  const [tags, setTags] = useState(null);
  const [add, setAdd] = useState("");
  const [more, setMore] = useState(false);
  const cur = tags || job?.tags || [];
  const ppl = [...new Set([...(job?.tags || []).filter((t) => people.includes(t)), ...people])];
  const shown = more ? ppl : ppl.slice(0, 12);
  const pool = [...new Set([...(job?.tags || []).filter((t) => !people.includes(t)), ...myTags(), ...VTAGS])];
  const flip = (t) => setTags(cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  const done = (list = cur) => (setTags(null), setAdd(""), setMore(false), onSave(list));
  const plus = () => {
    const t = add.trim();
    if (!t) return;
    rememberTag(t);
    setTags([...new Set([...cur, t])]);
    setAdd("");
  };
  return (
    <Sheet open={!!job} onClose={() => done()} title="Video etiketleri">
      <div className="flex flex-col gap-3 pb-2">
        {ppl.length > 0 && (
          <>
            <h3 className="bzy-h">Sporcu</h3>
            <div className="bzy-chips">
              {shown.map((t) => (
                <button key={t} type="button" aria-pressed={cur.includes(t)} onClick={() => flip(t)} data-press>
                  {t}
                </button>
              ))}
              {ppl.length > shown.length && (
                <button type="button" onClick={() => setMore(true)} data-press>
                  +{ppl.length - shown.length}
                </button>
              )}
            </div>
            <h3 className="bzy-h">Etiket</h3>
          </>
        )}
        <div className="bzy-chips">
          {pool.map((t) => (
            <button key={t} type="button" aria-pressed={cur.includes(t)} onClick={() => flip(t)} data-press>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="bzy-in flex-1" value={add} maxLength={24} placeholder="Yeni etiket" onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && plus()} aria-label="Yeni etiket" />
          <Button size="sm" variant="secondary" disabled={!add.trim()} onClick={plus}>
            Ekle
          </Button>
        </div>
        <Button full onClick={() => done()}>
          Galeriye kaydet
        </Button>
      </div>
    </Sheet>
  );
}

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
      live.current.onSent({ ...kalipEntry(k), to: r.to, at, ok: null });
      const res = await sendKalip(org, live.current.list, k, live.current.ctx, r.to).catch(() => ({ ok: false }));
      live.current.onSent({ ...kalipEntry(k), to: r.to, at, ...res, ok: !!res.ok });
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

// Gönderilen kalıbın son-giden kaydı: yazılı kalıp mesaj gibi (sporcu ekranı okur), sesli kalıp ses
export const kalipEntry = (k) => (k.text ? { kind: "msg", text: k.text, kalip: k.name } : { kind: "ses", dur: k.dur, kalip: k.name });

// Son 3 kalıp: dokun = seçilenlere bir kez; basılı tut = Tekrarla; tekrar sürerken dokun = Durdur
// Kare düzen (Seyhun 2026-11-26 örnek A): ilk kare "Kalıp" kapatır, sonra en çok 8 kalıp karesi (yatay kayar), son kare "Tümü"
// page: Kalıp sayfası (Seyhun 2026-11-26): bütün kalıplar kare ızgarada, son kare "+ Yeni" (onAll), Kapat karesi yok
export function KalipRow({ list, rep, now, onSend, onHold, onStop, onAll, onClose, page = false }) {
  const t = useRef(null);
  const held = useRef(false);
  // Liste boşken ya da yüklenirken hazır yazılı kalıplar gösterilir (satır hep görünür; Seyhun 2026-11-25 "hazır komutlar gösterilmiyor")
  const src = list?.length ? list : KALIP_HAZIR.map((x, i) => ({ id: `h${i}`, name: x, text: x, used: -i }));
  const top = [...src].sort((a, b) => (b.used || 0) - (a.used || 0)).slice(0, page ? 60 : 8);
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
    <div className={page ? "bzy-kpg" : "bzy-kp"}>
      {!page && (
        <button type="button" className="bzy-sqb on" onClick={onClose} aria-expanded="true" data-press>
          <small>Kapat</small>
          <b>Kalıp</b>
        </button>
      )}
      {top.map((k) => {
        const on = rep?.kid === k.id;
        const left = on ? Math.max(0, Math.ceil((rep.next - now) / 1000)) : 0;
        return (
          <button
            key={k.id}
            type="button"
            className="bzy-kb bzy-sqb"
            data-rep={on ? "1" : undefined}
            style={on ? { "--p": `${(rep.n / rep.times) * 100}%` } : undefined}
            onPointerDown={() => down(k)}
            onPointerUp={() => up(k)}
            onPointerLeave={() => clearTimeout(t.current)}
            onPointerCancel={() => clearTimeout(t.current)}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={on ? `${k.name}: durdur` : `${k.name}: gönder`}
          >
            <small className="num">{on ? `${rep.n}/${rep.times} · 0:${pad(left)}` : k.text ? "Yazı" : `Ses · ${k.dur} sn`}</small>
            <b>{k.name}</b>
          </button>
        );
      })}
      <button type="button" className="bzy-sqb bzy-kall" onClick={onAll} aria-label={page ? "Yeni sesli kalıp" : "Bütün kalıplar"} data-press>
        <small>{page ? "Kaydet" : ""}</small>
        <b>{page ? "+ Yeni" : "Tümü"}</b>
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
        {view === "kaliplar" && <KalipList org={org} list={list} to={to} onSend={(k) => (onSend(k), onView(""))} onRep={(k) => onView(`ktek:${k.id}`)} onRec={() => onView("kkayit")} />}
      </Sheet>
      <Sheet big open={view === "kkayit"} onClose={() => onView("kaliplar")} title="Sesli kalıp">
        {view === "kkayit" && <KalipKayit org={org} list={list} onDone={() => (onView("kaliplar"), toast("Kalıp kaydedildi"))} />}
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

// Kalıplar (Seyhun 2026-11-25 örnek "Yönet Kalıplar Örneği"): yazılı (asistan sesiyle okunur) ve sesli (kendi sesi) aynı listede.
// Ada dokun: düzenle; Dinle (yazılı: sporcunun duyacağı ses); tekrarla; gönder; sil. Altta + Yazılı kalıp, + Sesli kalıp.
const KF = [
  ["", "Hepsi"],
  ["yazi", "Yazı"],
  ["ses", "Ses"],
];
function KalipList({ org, list, to, onSend, onRep, onRec }) {
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState("");
  const [add, setAdd] = useState(null);
  const shown = (list || []).filter((k) => !f || (f === "yazi" ? !!k.text : !k.text));
  const del = (k) => delKalip(org, list, k.id).catch(() => toast("Silinemedi"));
  const save = async () => {
    try {
      await addYaziKalip(org, list, add);
      setAdd(null);
    } catch {
      toast("Kaydedilemedi");
    }
  };
  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="bzy-seg2">
        {KF.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)} data-press>
            <small>{l}</small>
          </button>
        ))}
      </div>
      {add !== null && (
        <div className="flex gap-2">
          <input className="bzy-in flex-1" autoFocus value={add} maxLength={80} placeholder="Okunacak cümle" onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Yazılı kalıp" />
          <Button size="sm" disabled={!add.trim()} onClick={save}>
            Kaydet
          </Button>
        </div>
      )}
      {!shown.length ? (
        <p className="text-mut">Kalıp yok</p>
      ) : (
        <div className="bzy-list">
          {shown.map((k) => (
            <div key={k.id} className="bzy-li items-center">
              <i className="bzy-ktag" data-k={k.text ? "yazi" : "ses"}>
                {k.text ? "YAZI" : "SES"}
              </i>
              <div className="min-w-0 flex-1">
                {edit?.id === k.id ? (
                  <input
                    className="bzy-in"
                    autoFocus
                    value={edit.v}
                    maxLength={k.text ? 80 : 30}
                    onChange={(e) => setEdit({ id: k.id, v: e.target.value })}
                    onBlur={() => (edit.v.trim() && edit.v.trim() !== k.name && renameKalip(org, list, k.id, edit.v).catch(() => toast("Kaydedilemedi")), setEdit(null))}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    aria-label={k.text ? "Okunacak cümle" : "Kalıp adı"}
                  />
                ) : (
                  <button type="button" className="bzy-kname" onClick={() => setEdit({ id: k.id, v: k.name })}>
                    <b>{k.name}</b>
                    <span>
                      {k.text ? "Asistan sesi" : `${k.dur} sn`}
                      {k.n ? ` · ${k.n} kez` : ""}
                    </span>
                  </button>
                )}
              </div>
              {k.text && (
                <button type="button" className="btn btn-round btn-sm" aria-label={`${k.name}: dinle`} onClick={() => listen(k.text)} data-press>
                  ▶
                </button>
              )}
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
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button full onClick={() => setAdd((x) => (x === null ? "" : null))}>
          + Yazılı kalıp
        </Button>
        <Button full variant="secondary" onClick={onRec}>
          + Sesli kalıp
        </Button>
      </div>
    </div>
  );
}

// Yazılı kalıbı Yönet'te dinle: sporcunun duyacağı asistan sesi (aynı seslendirme, sunucuda saklı)
let LISTEN = null;
function listen(text) {
  try {
    LISTEN = LISTEN || new Audio();
    sayWith(LISTEN, text, { style: "asistan", timeoutMs: 6000 });
  } catch {}
}

// + Sesli kalıp: sporculara gitmeden kayıt; dinle, beğenmezsen yeniden çek, ad ver, sakla (en çok 30 sn, tam ses tek parça)
const KAYIT_MAX = 30;
// save verilirse (sporcuya sesli not) ad sorulmaz, kayıt save(blob, sn) ile gider
export function KalipKayit({ org, list, onDone, save: saveTo = null, max = KAYIT_MAX }) {
  const toast = useToast();
  const [st, setSt] = useState({ s: "idle" }); // idle | rec { t0 } | done { blob, dur }
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const r = useRef(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (st.s !== "rec") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [st.s]);
  useEffect(() => () => r.current?.stop?.(), []);
  const url = useMemo(() => (st.blob ? URL.createObjectURL(st.blob) : ""), [st.blob]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  const start = async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return toast("Mikrofon açılamadı");
    }
    const type = voiceType();
    const mr = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
    const bits = [];
    const t0 = Date.now();
    mr.ondataavailable = (e) => e.data?.size && bits.push(e.data);
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearTimeout(timer);
      r.current = null;
      const dur = (Date.now() - t0) / 1000;
      if (dur < 0.6 || !bits.length) return setSt({ s: "idle" });
      const blob = new Blob(bits, { type: mr.mimeType || type || "audio/mp4" });
      setSt({ s: "done", blob, dur });
      if (!name && !saveTo) firstWords(blob).then((w) => w && setName((n) => n || w));
    };
    const timer = setTimeout(() => mr.state !== "inactive" && mr.stop(), max * 1000);
    r.current = { stop: () => mr.state !== "inactive" && mr.stop() };
    mr.start();
    setNow(t0);
    setSt({ s: "rec", t0 });
  };
  const save = async () => {
    setBusy(true);
    try {
      if (saveTo) await saveTo(st.blob, st.dur);
      else await saveKalip(org, list, { blob: st.blob, dur: st.dur, name: name || `Kalıp ${(list?.length || 0) + 1}` });
      onDone();
    } catch {
      toast("Kaydedilemedi");
    }
    setBusy(false);
  };
  const sec = st.s === "rec" ? Math.max(0, Math.floor((now - st.t0) / 1000)) : 0;
  // Önerilen cümle: dokununca büyük yazılır, söylenip kaydedilir; kendi sesiyle kaydedilenler ✓
  const said = new Set((list || []).filter((x) => !x.text).map((x) => String(x.name || "").toLocaleLowerCase("tr")));
  const oneri = !saveTo && st.s === "idle";
  return (
    <div className="flex flex-col gap-3 pb-2">
      {!saveTo && name && st.s !== "done" && <b className="bzy-kcum">{name}</b>}
      {st.s === "done" ? (
        <>
          <audio src={url} controls className="w-full" />
          {!saveTo && <input className="bzy-in" value={name} maxLength={30} placeholder="Ad" onChange={(e) => setName(e.target.value)} aria-label="Kalıp adı" />}
          <div className="grid grid-cols-2 gap-2">
            <Button full variant="secondary" onClick={() => (setSt({ s: "idle" }), start())}>
              Yeniden çek
            </Button>
            <Button full loading={busy} onClick={save}>
              {saveTo ? "Gönder" : "Kaydet"}
            </Button>
          </div>
        </>
      ) : (
        <button type="button" className="bzy-krec" data-rec={st.s === "rec" ? "1" : undefined} onClick={() => (st.s === "rec" ? r.current?.stop() : start())} data-press>
          <b className="num">{st.s === "rec" ? `0:${pad(sec)}` : "●"}</b>
          <small>{st.s === "rec" ? `Bitirmek için dokun · en çok ${max} sn` : "Kayda başla"}</small>
        </button>
      )}
      {oneri && (
        <div className="bzy-kon" aria-label="Önerilen cümleler">
          {KALIP_ONERI.map(([g, xs]) => (
            <section key={g}>
              <small>{g}</small>
              <div>
                {xs.map((x) => {
                  const ok = said.has(x.toLocaleLowerCase("tr"));
                  return (
                    <button key={x} type="button" aria-pressed={name === x} data-ok={ok ? "1" : undefined} onClick={() => setName((n) => (n === x ? "" : x))} data-press>
                      {ok ? "✓ " : ""}
                      {x}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
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
