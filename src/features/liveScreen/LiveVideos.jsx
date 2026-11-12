"use client";

// /canli Video sekmesi (ana hesap, yalnız uygulama içinde; Seyhun 2026-11-05 "canlı yayına göndermeyelim, o sadece benim uygulamamda,
// iPad'imde, telefonumda olsun; canlı yayın linkinde görüntü devam eder"): "Video çek" ile çekilen video yalnız bu cihazda saklanır
// (pendingStore; sen silene kadar durur, Seyhun 2026-11-05 "niye 7 gün, kullanıcı isterse siler"), hiçbir yere yüklenmez.
// Videoya dokununca bu ekranın arka planında oynar, yeniden dokununca kalkar.
// Galeri yarış yarış (Seyhun 2026-11-05 "hangi yarışta çekersem, sarı grubun birinci yarışı diye etiketleyip organize"; örnek
// canli-tv/video-galeri-ornek.png): çekilince o an süren startın etiketi (sid); Düzenle'de yarışı değişir, Yarış dışı, Sil.
// YouTube'a yükle (Seyhun 2026-11-06 "çektiğim videoyu YouTube'a yükleyebilmeliyim, sonra linkiyle kameralara ekleyeyim mi diye sor, isim
// vereyim"; örnek youtube-yukle/ornek.png): video kanala Liste dışı yüklenir (lib/youtube.js, ilk seferde "YouTube'a bağlan"), link
// kendiliğinden gelir, "Kameralara ekleyeyim mi?" sorulur; adı verilince yayının kaynaklarına kamera olarak eklenir (Kamera, Yayın › Ekran).
// Kopyasız (Seyhun 2026-11-08 "galerimde zaten var, iki defa kullanmaya gerek yok"; yeni iPhone kurulumunda, hasGallery): galeriden
// seçilen ve Velora kamerasıyla çekilip Fotoğraflar'a kaydedilen video telefonda saklanmaz, yalnız Fotoğraflar kimliği (asset), süre,
// çekim anı ve küçük resim tutulur; oynatırken / YouTube'a yüklerken Fotoğraflar'dan geçici kopya okunur (galleryBlob, yalnız bellekte).
// Eski kopyalar (Seyhun 2026-11-08 "daha önce eklenenleri de silmemiz lazım"): kimliği olanın kopyası silinir, kimliksiz galeri kopyası
// (dosya adı velora- ile başlamayan) listeden kalkar (aslı Fotoğraflar'da); Velora kamerasının kimliksiz kaydı tek kopya olduğu için kalır.
import { Fragment, useEffect, useMemo, useState } from "react";
import { dropKept, keepLocal, listKept } from "@/features/raceMedia/pendingStore";
import { RecPick } from "@/features/raceMedia/RecPick";
import { deletePhotos, galleryBlob, galleryPick, hasGallery } from "@/lib/nativeIos";
import { readTimer } from "@/features/training/Countdown";
import { saveStream } from "@/features/athletes/raceLiveStore";
import { recName } from "./liveActions";
import { momentAt, raceName } from "@/lib/raceLive";
import { addSource, cleanStream, streamSources } from "@/lib/raceRounds";
import { YtNeed, ytConnect, ytUpload } from "@/lib/youtube";
import { groupColor } from "@/lib/roundScore";
import { todayStr } from "@/lib/utils/format";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const hm = (t) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const newId = () => `my${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// videonun süresi (okunamazsa 0)
function durOf(blob) {
  return new Promise((res) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (d) => (URL.revokeObjectURL(url), res(Number.isFinite(d) ? Math.round(d) : 0));
    v.onloadedmetadata = () => done(v.duration);
    v.onerror = () => done(0);
    setTimeout(() => done(v.duration), 6000);
    v.src = url;
  });
}

// Küçük resim (Seyhun 2026-11-05 "önizleme gösteremiyor muyuz, gri ekran"): videonun 0,5. saniyesi JPEG olarak öğeye yazılır (th)
function thumbOf(blob) {
  return new Promise((res) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    let done = false;
    const end = (x) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      res(x);
    };
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.onloadeddata = () => {
      v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
    };
    v.onseeked = () => {
      try {
        const w = 240;
        const h = Math.round((w * (v.videoHeight || 3)) / (v.videoWidth || 4));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(v, 0, 0, w, h);
        end(c.toDataURL("image/jpeg", 0.7));
      } catch {
        end("");
      }
    };
    v.onerror = () => end("");
    setTimeout(() => end(""), 8000);
    v.src = url;
    v.load();
  });
}

// Galeriden seçilen videonun çekim anı (Seyhun 2026-11-05 "galeriden seçme"): iPhone seçicide lastModified seçim anıdır; MP4/MOV
// "mvhd" kutusundaki creation_time (1904'ten saniye, UTC) okunur. moov dosyanın sonunda da olabilir: üst kutular başlıklarından atlanır.
async function shotAt(file) {
  try {
    const rd = async (a, n) => new DataView(await file.slice(a, a + n).arrayBuffer());
    let off = 0;
    for (let i = 0; i < 64 && off + 8 <= file.size; i++) {
      const h = await rd(off, 16);
      let len = h.getUint32(0);
      const type = String.fromCharCode(h.getUint8(4), h.getUint8(5), h.getUint8(6), h.getUint8(7));
      let hd = 8;
      if (len === 1) (len = Number(h.getBigUint64(8))), (hd = 16);
      else if (len === 0) len = file.size - off;
      if (len < 8) return 0;
      if (type === "moov") {
        const m = await rd(off + hd, Math.min(len - hd, 4 << 20));
        for (let j = 0; j + 8 <= m.byteLength; ) {
          const l = m.getUint32(j);
          const ty = String.fromCharCode(m.getUint8(j + 4), m.getUint8(j + 5), m.getUint8(j + 6), m.getUint8(j + 7));
          if (ty === "mvhd") {
            const sec = m.getUint8(j + 8) === 1 ? Number(m.getBigUint64(j + 12)) : m.getUint32(j + 12);
            const ms = (sec - 2082844800) * 1000;
            return ms > Date.UTC(2015, 0, 1) && ms < Date.now() + 864e5 ? ms : 0;
          }
          if (l < 8) break;
          j += l;
        }
        return 0;
      }
      off += len;
    }
  } catch {
    /* okunamadı: lastModified kullanılır */
  }
  return 0;
}
const dayOf = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

// Çekim anının yarışı: geri sayımı süren start (yalnız şimdi çekilende), yoksa o andan önce başlamış son start (aynı gün, geçersiz olmayan)
function sidAt(starts, at, day, live = true) {
  const t = live ? readTimer() : null;
  if (t?.mode === "start" && t.rid && starts.some((s) => s.id === t.rid)) return t.rid;
  return [...starts].filter((s) => !s.void && s.at && s.at <= at && (s.day || s.at.slice(0, 10)) === day).sort((a, b) => (a.at < b.at ? -1 : 1)).at(-1)?.id || "";
}

// telefondaki kopyası atılmış öğe: yalnız Fotoğraflar kimliği (blob ve boyutu yok)
const refOf = (x) => {
  const { blob: _b, size: _s, ...rest } = x;
  return rest;
};

export function LiveVideos({ orgId, raceId, race = null, starts = [], rounds = {}, stream = null, playing = "", onPlay }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState(false); // Düzenle
  const [cur, setCur] = useState(""); // Düzenle'de seçilen video
  const [up, setUp] = useState(null); // { id, p } YouTube'a yüklenirken
  const [need, setNeed] = useState(false); // YouTube'a bağlan
  const [camName, setCamName] = useState("");
  const today = todayStr();
  useEffect(() => {
    let on = true;
    listKept().then(async (l) => {
      let mine = l.filter((x) => x.mine && x.raceId === raceId && (x.blob || x.asset));
      if (hasGallery()) {
        const old = mine.filter((x) => x.blob && !x.asset && !/^(velora-|captured)/i.test(String(x.blob.name || ""))); // kamera kayıtları (velora-, web'de capturedvideo) tek kopya
        const ref = mine.filter((x) => x.blob && x.asset);
        await Promise.all([...old.map((x) => dropKept(x.id)), ...ref.map((x) => keepLocal(refOf(x)))]);
        mine = mine.filter((x) => !old.includes(x)).map((x) => (ref.includes(x) ? refOf(x) : x));
      }
      if (on) setList(mine.sort((a, b) => (a.at < b.at ? 1 : -1)));
    }, () => {});
    return () => {
      on = false;
    };
  }, [raceId]);
  // küçük resimler için yerel adresler
  const urls = useMemo(() => Object.fromEntries(list.filter((x) => x.blob).map((x) => [x.id, URL.createObjectURL(x.blob)])), [list]);
  const [opening, setOpening] = useState(""); // Fotoğraflar'dan okunan video
  // oynatmak / yüklemek için video: telefonda kopyası yoksa Fotoğraflar'dan geçici kopya
  const blobOf = async (x) => {
    if (x.blob) return x.blob;
    setOpening(x.id);
    try {
      return await galleryBlob(x.asset);
    } finally {
      setOpening("");
    }
  };
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const grpOf = (s) => rounds?.[s.id]?.grp || s.grp || "";
  const sName = (s) => [grpOf(s), raceName(s)].filter(Boolean).join(" · ");
  const byId = new Map(starts.map((s) => [s.id, s]));
  // galeri gün gün (Seyhun 2026-11-09 "eklenen videoları sıralı, günlere göre filtrelenmiş göster; dünkü bugün de görünsün"):
  // en yeni gün üstte; günün içinde yarış yarış (en yeni yarış üstte), etiketsizler günün sonunda "Yarış dışı". Birden çok gün varsa
  // üstte gün seçimi (Tümü, Bugün, Dün, 7 Kas…)
  const [dayPick, setDayPick] = useState("");
  const days = [...new Set(list.map((x) => dayOf(x.at)))].sort((a, b) => (a < b ? 1 : -1));
  const dayOn = days.includes(dayPick) ? dayPick : "";
  const dayName = (d) => (d === today ? "Bugün" : d === dayOf(new Date(Date.parse(`${today}T12:00:00Z`) - 864e5).toISOString()) ? "Dün" : new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }));
  const byDay = days
    .filter((d) => !dayOn || d === dayOn)
    .map((d) => {
      const groups = [];
      for (const x of list.filter((y) => dayOf(y.at) === d)) {
        const s = x.sid ? byId.get(x.sid) : null;
        const k = s ? s.id : "";
        let g = groups.find((y) => y.k === k);
        if (!g) groups.push((g = { k, s, items: [] }));
        g.items.push(x);
      }
      groups.sort((a, b) => (!a.s ? 1 : !b.s ? -1 : a.s.at < b.s.at ? 1 : -1));
      return { d, n: groups.reduce((n, g) => n + g.items.length, 0), groups };
    });
  const sel = list.find((x) => x.id === cur) || null;
  const selDay = sel ? dayOf(sel.at) : today; // Düzenle'de seçilen videonun günü (galeriden eski gün de gelebilir)
  const dayStarts = [...starts].filter((s) => !s.void && s.at && (s.day || s.at.slice(0, 10)) === selDay).sort((a, b) => (a.at < b.at ? 1 : -1));
  const nameOf = (x) => {
    const s = x?.sid ? byId.get(x.sid) : null;
    return s ? sName(s) : x ? hm(x.at) : "";
  };

  const put = (x, patch) =>
    setList((l) =>
      l.map((y) => {
        if (y.id !== x.id) return y;
        const n = { ...y, ...patch };
        keepLocal(n);
        return n;
      })
    );
  // eski videoların küçük resmi yoksa sırayla çıkarılır
  const noTh = list.find((x) => !x.th && !x.thNo && x.blob)?.id || "";
  useEffect(() => {
    const x = list.find((y) => y.id === noTh);
    if (!x) return undefined;
    let on = true;
    thumbOf(x.blob).then((th) => on && put(x, th ? { th } : { thNo: true }));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noTh]);
  const isVid = (f) => /^video\//.test(f?.type || "") || /\.(mov|mp4|m4v)$/i.test(f?.name || "");
  // gal: galeriden seçildi (çekim anı dosyanın içinden; sayaç bakılmaz)
  const add = async (file, gal) => {
    const dur = await durOf(file);
    const shot = gal ? await shotAt(file) : 0;
    const at = new Date(shot || (file.lastModified || Date.now()) - dur * 1000).toISOString();
    const x0 = { id: newId(), raceId, kind: "video", mine: true, stay: true, size: file.size, blob: file, at, dur, sid: sidAt(starts, at, dayOf(at), !gal), ...(file.asset ? { asset: file.asset } : {}) };
    // Fotoğraflar'a kaydedildiyse kopyası tutulmaz (küçük resim dosyadan, sonra yalnız kimlik)
    const th = file.asset && hasGallery() ? await thumbOf(file) : "";
    const x = file.asset && hasGallery() ? { ...refOf(x0), ...(th ? { th } : { thNo: true }) } : x0;
    await keepLocal(x);
    setList((l) => [x, ...l].sort((a, b) => (a.at < b.at ? 1 : -1)));
    if (x.blob) thumbOf(file).then((t) => t && put(x, { th: t }));
  };
  const take = async (file) => {
    if (!file || busy) return;
    if (!isVid(file)) return setMsg("Video çek");
    setMsg("");
    setBusy(true);
    await add(file, false);
    setBusy(false);
  };
  const [gal, setGal] = useState(""); // "2/5" galeriden eklenirken
  // Fotoğraflar seçicisi (yeni iPhone kurulumu): yalnız kimlik, süre, çekim anı ve küçük resim saklanır
  const pickPhotos = async () => {
    if (busy) return;
    setMsg("");
    setBusy(true);
    setGal("…");
    try {
      const r = await galleryPick();
      const have = new Set(list.map((x) => x.asset).filter(Boolean));
      const add = (r?.items || [])
        .filter((y) => y.asset && !have.has(y.asset))
        .map((y) => {
          const at = new Date(y.at || Date.now()).toISOString();
          return { id: newId(), raceId, kind: "video", mine: true, stay: true, asset: y.asset, at, dur: y.dur || 0, sid: sidAt(starts, at, dayOf(at), false), ...(y.th ? { th: y.th } : { thNo: true }) };
        });
      for (const x of add) await keepLocal(x);
      if (add.length) setList((l) => [...add, ...l].sort((a, b) => (a.at < b.at ? 1 : -1)));
      if (r?.miss) setMsg(`${r.miss} video okunamadı. Ayarlar › Velora › Fotoğraflar › Tüm Fotoğraflar`);
    } catch (e) {
      setMsg(e?.message || "Galeri açılamadı");
    }
    setGal("");
    setBusy(false);
  };
  const pick = async (files) => {
    const fs = [...(files || [])].filter(isVid);
    if (!fs.length || busy) return;
    setMsg("");
    setBusy(true);
    for (let i = 0; i < fs.length; i++) {
      setGal(`${i + 1}/${fs.length}`);
      await add(fs[i], true);
    }
    setGal("");
    setBusy(false);
  };
  const drop = (x) => {
    if (playing === x.id) onPlay?.("", null);
    dropKept(x.id);
    if (x.asset) deletePhotos([x.asset]); // Velora'nın kamerasıyla çekildiyse Fotoğraflar'daki aslı da (iPhone kendisi onay sorar)
    setList(list.filter((y) => y.id !== x.id));
    setCur("");
  };
  // YouTube başlığı: "Örnek Kupa · Mavi · 1. yarış startı"
  const ytTitle = (x) => {
    const s = x.sid ? byId.get(x.sid) : null;
    const what = s ? recName({ at: x.at, ...(momentAt(x.at, starts) || {}) }, starts) : `Kayıt ${hm(x.at)}`;
    return [race?.name, s ? grpOf(s) : "", what].filter(Boolean).join(" · ");
  };
  const srcs = streamSources(stream);
  const camOf = (x) => (x?.yt ? srcs.find((y) => y.url === x.yt)?.name || "" : "");
  const nextCam = () => addSource(srcs, "camera").at(-1).name;
  // Liste dışı yükle; link gelince kameralara eklemeyi sorar
  const upload = async (x) => {
    if (up) return;
    setMsg("");
    setNeed(false);
    setUp({ id: x.id, p: 0 });
    try {
      const vid = await ytUpload(await blobOf(x), { title: ytTitle(x), description: race?.name || "" }, (p) => setUp({ id: x.id, p }));
      put(x, { yt: `https://youtu.be/${vid}`, ytNo: false });
      setCamName(nextCam());
    } catch (e) {
      if (e instanceof YtNeed && e.need === "connect") setNeed(true);
      else setMsg(e?.message || "Yüklenemedi");
    }
    setUp(null);
  };
  const connect = () => ytConnect().then(() => setNeed(false), (e) => setMsg(e?.message || "Bağlanılamadı"));
  // YouTube linki → yayının kaynakları, verilen adla kamera (Kamera düğmesinde ve Yayın › Ekran'da görünür)
  const addCam = async (x) => {
    const base = srcs;
    const l0 = addSource(base, "camera");
    if (l0.length === base.length) return setMsg("Kaynak listesi dolu (en çok 8). Yayın › Ekran'dan birini çıkar.");
    const name = (camName.trim() || l0.at(-1).name).slice(0, 30);
    const l = l0.map((y, i, a) => (i === a.length - 1 ? { ...y, url: x.yt, name } : y));
    setMsg("");
    try {
      await saveStream(orgId, raceId, { ...cleanStream(stream), sources: l });
      put(x, { ytCam: name });
    } catch {
      setMsg("Kaydedilemedi. İnterneti kontrol et.");
    }
  };

  const play = async (x) => {
    if (opening) return;
    setMsg("");
    try {
      onPlay?.(x.id, await blobOf(x), { at: x.at, dur: x.dur, name: nameOf(x) }); // 3. bilgi: tam ekran oynatıcının başlığı (antrenman)
    } catch (e) {
      setMsg(e?.message || "Video açılamadı");
    }
  };
  const tile = (x) => {
    const on = edit ? cur === x.id : playing === x.id;
    return (
      <button
        key={x.id}
        type="button"
        className={`lvd-t${on ? " on" : ""}`}
        aria-pressed={on}
        onClick={() => (edit ? (setCur(cur === x.id ? "" : x.id), setCamName(nextCam()), setMsg("")) : playing === x.id ? onPlay?.("", null) : play(x))}
      >
        <span className="th">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {x.th ? <img src={x.th} alt="" /> : urls[x.id] ? <video src={`${urls[x.id]}#t=0.5`} preload="metadata" muted playsInline /> : null}
          {opening === x.id ? <s>Açılıyor</s> : playing === x.id ? <s>Ekranda</s> : x.yt ? <s className="yt">YouTube</s> : null}
          {x.dur ? <em>{mmss(x.dur)}</em> : null}
        </span>
      </button>
    );
  };

  return (
    <div className="lvd">
      <div className="lvd-hd">
        <b>Video</b>
        {playing && !edit && list.some((x) => x.id === playing) ? <span>Ekranda: {nameOf(list.find((x) => x.id === playing))}</span> : null}
        {list.length ? (
          <button type="button" className={`lvd-del${edit ? " on" : ""}`} onClick={() => (setEdit(!edit), setCur(""), setMsg(""))}>
            {edit ? "Bitti" : "Düzenle"}
          </button>
        ) : null}
      </div>
      {edit ? null : (
        <div className="lvd-add">
          <RecPick onFile={take} className="lvd-rec" aria-busy={busy && !gal}>
            <i aria-hidden="true" />
            {busy && !gal ? "Kaydediliyor…" : "Video çek"}
          </RecPick>
          {hasGallery() ? (
            <button type="button" className="lvd-gal" aria-busy={!!gal} disabled={busy} onClick={pickPhotos}>
              {gal ? "Ekleniyor…" : "Galeriden ekle"}
            </button>
          ) : (
            <label className="lvd-gal" aria-busy={!!gal}>
              <input type="file" accept="video/*" multiple hidden disabled={busy} onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
              {gal ? `Ekleniyor ${gal}` : "Galeriden ekle"}
            </label>
          )}
        </div>
      )}
      {edit && sel ? (
        <div className="lvd-ed">
          <div className="lvd-edl">Hangi yarış</div>
          <div className="lvd-chs">
            {dayStarts.map((s) => (
              <button key={s.id} type="button" className={sel.sid === s.id ? "on" : ""} aria-pressed={sel.sid === s.id} onClick={() => put(sel, { sid: s.id })}>
                {grpOf(s) ? <i style={{ background: groupColor(grpOf(s)) || "#ffd23f" }} aria-hidden="true" /> : null}
                {sName(s)}
              </button>
            ))}
            <button type="button" className={!sel.sid ? "on" : ""} aria-pressed={!sel.sid} onClick={() => put(sel, { sid: "" })}>
              Yarış dışı
            </button>
          </div>
          {up?.id === sel.id ? (
            <div className="lvd-up">
              <div>
                <span>YouTube&apos;a yükleniyor</span>
                <span>{`%${Math.round(up.p * 100)}`}</span>
              </div>
              <i style={{ "--p": up.p }} />
            </div>
          ) : (
            <div className="lvd-chs">
              {sel.yt ? (
                sel.ytNo && !camOf(sel) ? (
                  <button type="button" onClick={() => put(sel, { ytNo: false })}>
                    Kameralara ekle
                  </button>
                ) : null
              ) : need ? (
                <button type="button" className="p" onClick={connect}>
                  YouTube&apos;a bağlan
                </button>
              ) : (
                <button type="button" className="p" disabled={!!up} onClick={() => upload(sel)}>
                  YouTube&apos;a yükle
                </button>
              )}
              <button type="button" className="x" onClick={() => drop(sel)}>
                Sil
              </button>
            </div>
          )}
          {!sel.yt || up?.id === sel.id ? null : camOf(sel) || sel.ytCam ? (
            <p className="lvd-ok">Kameralarda: {camOf(sel) || sel.ytCam}</p>
          ) : sel.ytNo ? null : (
            <>
              <p className="lvd-q">Kameralara ekleyeyim mi?</p>
              <div className="lvd-ln">
                <input value={camName} onChange={(e) => setCamName(e.target.value)} maxLength={30} enterKeyHint="done" aria-label="Kamera adı" />
                <button type="button" onClick={() => addCam(sel)}>
                  Ekle
                </button>
                <button type="button" className="s" onClick={() => put(sel, { ytNo: true })}>
                  Hayır
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      {msg ? <p className="lst-msg">{msg}</p> : null}
      {days.length > 1 ? (
        <div className="lvd-days">
          {[["", "Tümü"], ...days.map((d) => [d, dayName(d)])].map(([d, n]) => (
            <button key={d || "all"} type="button" className={dayOn === d ? "on" : ""} aria-pressed={dayOn === d} onClick={() => setDayPick(d)}>
              {n}
            </button>
          ))}
        </div>
      ) : null}
      {byDay.map((dd) => (
        <section key={dd.d} className="lvd-day">
          <div className="lvd-dh">
            {dayName(dd.d)}
            <small>{`${dd.n} video`}</small>
          </div>
          {dd.groups.map((g) => (
            <Fragment key={g.k || "dis"}>
              <div className="lvd-sec">
                {g.s && grpOf(g.s) ? <i style={{ background: groupColor(grpOf(g.s)) || "#ffd23f" }} aria-hidden="true" /> : null}
                {g.s ? sName(g.s) : "Yarış dışı"}
                <small>{`· ${g.items.length}`}</small>
              </div>
              <div className="lvd-g">{g.items.map(tile)}</div>
            </Fragment>
          ))}
        </section>
      ))}
    </div>
  );
}
