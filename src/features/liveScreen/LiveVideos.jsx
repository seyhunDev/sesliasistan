"use client";

// /canli Video sekmesi (ana hesap, yalnız uygulama içinde; Seyhun 2026-11-05 "canlı yayına göndermeyelim, o sadece benim uygulamamda,
// iPad'imde, telefonumda olsun; canlı yayın linkinde görüntü devam eder"): "Video çek" ile çekilen video yalnız bu cihazda saklanır
// (pendingStore; sen silene kadar durur, Seyhun 2026-11-05 "niye 7 gün, kullanıcı isterse siler"), hiçbir yere yüklenmez.
// Videoya dokununca bu ekranın arka planında oynar, yeniden dokununca kalkar.
// Galeri yarış yarış (Seyhun 2026-11-05 "hangi yarışta çekersem, sarı grubun birinci yarışı diye etiketleyip organize"; örnek
// canli-tv/video-galeri-ornek.png): çekilince o an süren startın etiketi (sid); Düzenle'de yarışı değişir, Yarış dışı, Sil.
// YouTube'a ekle (Seyhun 2026-11-05 "YouTube'a ekleyip sonra kameralarda gösterip yayına verebilirim"): telefonun paylaş penceresi açılır
// (YouTube uygulaması seçilir, başlık panoya kopyalanır); YouTube linki yapıştırılınca yayının kaynaklarına eklenir (Kamera, Yayın › Ekran).
import { useEffect, useMemo, useState } from "react";
import { dropKept, keepLocal, listKept } from "@/features/raceMedia/pendingStore";
import { RecPick } from "@/features/raceMedia/RecPick";
import { readTimer } from "@/features/training/Countdown";
import { saveStream } from "@/features/athletes/raceLiveStore";
import { recName } from "./liveActions";
import { momentAt, raceName } from "@/lib/raceLive";
import { addSource, cleanStream, streamSources, ytEmbed } from "@/lib/raceRounds";
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

// Çekim anının yarışı: geri sayımı süren start, yoksa o andan önce başlamış son start (aynı gün, geçersiz olmayan)
function sidAt(starts, at, day) {
  const t = readTimer();
  if (t?.mode === "start" && t.rid && starts.some((s) => s.id === t.rid)) return t.rid;
  return [...starts].filter((s) => !s.void && s.at && s.at <= at && (s.day || s.at.slice(0, 10)) === day).sort((a, b) => (a.at < b.at ? -1 : 1)).at(-1)?.id || "";
}

export function LiveVideos({ orgId, raceId, race = null, starts = [], rounds = {}, stream = null, playing = "", onPlay }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState(false); // Düzenle
  const [cur, setCur] = useState(""); // Düzenle'de seçilen video
  const [link, setLink] = useState("");
  const today = todayStr();
  useEffect(() => {
    let on = true;
    listKept().then((l) => on && setList(l.filter((x) => x.mine && x.raceId === raceId && x.blob).sort((a, b) => (a.at < b.at ? 1 : -1))), () => {});
    return () => {
      on = false;
    };
  }, [raceId]);
  // küçük resimler için yerel adresler
  const urls = useMemo(() => Object.fromEntries(list.map((x) => [x.id, URL.createObjectURL(x.blob)])), [list]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const grpOf = (s) => rounds?.[s.id]?.grp || s.grp || "";
  const sName = (s) => [grpOf(s), raceName(s)].filter(Boolean).join(" · ");
  const byId = new Map(starts.map((s) => [s.id, s]));
  // galeri: yarış yarış, en yeni yarış üstte; etiketsizler en altta "Yarış dışı"
  const groups = [];
  for (const x of list) {
    const s = x.sid ? byId.get(x.sid) : null;
    const k = s ? s.id : "";
    let g = groups.find((y) => y.k === k);
    if (!g) groups.push((g = { k, s, items: [] }));
    g.items.push(x);
  }
  groups.sort((a, b) => (!a.s ? 1 : !b.s ? -1 : a.s.at < b.s.at ? 1 : -1));
  const dayStarts = [...starts].filter((s) => !s.void && s.at && (s.day || s.at.slice(0, 10)) === today).sort((a, b) => (a.at < b.at ? 1 : -1));
  const sel = list.find((x) => x.id === cur) || null;
  const nameOf = (x) => {
    const s = x?.sid ? byId.get(x.sid) : null;
    return s ? sName(s) : x ? hm(x.at) : "";
  };

  const put = (x, patch) => {
    const n = { ...x, ...patch };
    keepLocal(n);
    setList((l) => l.map((y) => (y.id === x.id ? n : y)));
  };
  // eski videoların küçük resmi yoksa sırayla çıkarılır
  const noTh = list.find((x) => !x.th && !x.thNo)?.id || "";
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
  const take = async (file) => {
    if (!file || busy) return;
    if (!/^video\//.test(file.type || "") && !/\.(mov|mp4|m4v)$/i.test(file.name || "")) return setMsg("Video çek");
    setMsg("");
    setBusy(true);
    const dur = await durOf(file);
    const end = file.lastModified || Date.now();
    const at = new Date(end - dur * 1000).toISOString();
    const x = { id: newId(), raceId, kind: "video", mine: true, stay: true, size: file.size, blob: file, at, dur, sid: sidAt(starts, at, today) };
    await keepLocal(x);
    setList((l) => [x, ...l]);
    setBusy(false);
    thumbOf(file).then((th) => th && put(x, { th }));
  };
  const drop = (x) => {
    if (playing === x.id) onPlay?.("", null);
    dropKept(x.id);
    setList(list.filter((y) => y.id !== x.id));
    setCur("");
  };
  // YouTube başlığı: "Örnek Kupa · Mavi · 1. yarış startı"
  const ytTitle = (x) => {
    const s = x.sid ? byId.get(x.sid) : null;
    const what = s ? recName({ at: x.at, ...(momentAt(x.at, starts) || {}) }, starts) : `Kayıt ${hm(x.at)}`;
    return [race?.name, s ? grpOf(s) : "", what].filter(Boolean).join(" · ");
  };
  const share = (x) => {
    const title = ytTitle(x);
    const ext = /quicktime/.test(x.blob.type) ? "mov" : "mp4";
    const f = new File([x.blob], `${title}.${ext}`, { type: x.blob.type || "video/mp4" });
    navigator.clipboard?.writeText(title).catch(() => {});
    if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f], title }).catch(() => {});
    else setMsg("Bu cihaz paylaşamıyor");
  };
  // YouTube linki → yayının kaynakları (Kamera düğmesinde ve Yayın › Ekran'da görünür)
  const addLink = async (x) => {
    const u = link.trim();
    if (!ytEmbed(u)) return setMsg("YouTube linki tanınmadı");
    const base = streamSources(stream);
    const had = base.some((y) => y.url === u);
    let l = had ? base : addSource(base, "phone");
    if (!had && l.length === base.length) return setMsg("Kaynak listesi dolu (en çok 8). Yayın › Ekran'dan birini çıkar.");
    if (!had) l = l.map((y, i, a) => (i === a.length - 1 ? { ...y, url: u, name: nameOf(x).slice(0, 30) } : y));
    setMsg("");
    try {
      await saveStream(orgId, raceId, { ...cleanStream(stream), sources: l });
      put(x, { yt: u });
      setLink("");
    } catch {
      setMsg("Kaydedilemedi. İnterneti kontrol et.");
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
        onClick={() => (edit ? (setCur(cur === x.id ? "" : x.id), setLink(""), setMsg("")) : playing === x.id ? onPlay?.("", null) : onPlay?.(x.id, x.blob))}
      >
        <span className="th">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {x.th ? <img src={x.th} alt="" /> : <video src={`${urls[x.id]}#t=0.5`} preload="metadata" muted playsInline />}
          {playing === x.id ? <s>Ekranda</s> : x.yt ? <s className="yt">YouTube</s> : null}
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
        <RecPick onFile={take} className="lvd-rec" aria-busy={busy}>
          <i aria-hidden="true" />
          {busy ? "Kaydediliyor…" : "Video çek"}
        </RecPick>
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
          <div className="lvd-chs">
            <button type="button" onClick={() => share(sel)}>
              YouTube&apos;a ekle
            </button>
            <button type="button" className="x" onClick={() => drop(sel)}>
              Sil
            </button>
          </div>
          {sel.yt ? (
            <p className="lvd-ok">Kaynaklarda: {nameOf(sel)}</p>
          ) : (
            <div className="lvd-ln">
              <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="YouTube linki" />
              <button type="button" disabled={!link.trim()} onClick={() => addLink(sel)}>
                Kaynaklara ekle
              </button>
            </div>
          )}
        </div>
      ) : null}
      {msg ? <p className="lst-msg">{msg}</p> : null}
      {groups.map((g) => (
        <section key={g.k || "dis"}>
          <div className="lvd-sec">
            {g.s && grpOf(g.s) ? <i style={{ background: groupColor(grpOf(g.s)) || "#ffd23f" }} aria-hidden="true" /> : null}
            {g.s ? sName(g.s) : "Yarış dışı"}
            <small>{`· ${g.items.length}`}</small>
          </div>
          <div className="lvd-g">{g.items.map(tile)}</div>
        </section>
      ))}
    </div>
  );
}
