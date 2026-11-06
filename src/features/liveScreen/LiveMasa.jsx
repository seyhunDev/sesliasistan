"use client";
// Yayın masası (Seyhun 2026-11-06 "ekranı tek yerden yönetmek, kendi canlı yayınımdan"; örnek canli-tv/yayin-masasi/ornek.png onaylandı):
// Yayın › Ekran sekmesindekiler uygulama içi canlı ekranda, dört sekmede. Şimdi: evre (Otomatik ya da elle), ekranda tut, sol alt,
// canlıdaki grup, Duraklat. Evreler: her evrenin görüntüsü, gösterilecekler sırası, süresi. Kaynaklar: canlı kaynaklar (Yayında / Yayın yok,
// ad, bağlantı, çektiği grup, anahtar, sil, + Kaynak), Canlı konum, Kayıtlar. Yazı: ekranda yazı ve ekrandaki ad. Yazılar Yayın sayfasıyla
// aynı kayıtlar (raceLiveStore, liveActions). Yalnız ana hesap, yalnız uygulama içinde (LiveStart çizer).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadRoundsOf, saveCamBy, saveEvre, saveEvreMan, saveOnAir, savePin, savePlanKeys, saveShowTpl, saveSrcLive, watchRounds } from "@/features/athletes/raceLiveStore";
import { liveUrl, recName, setStream, showOnScreen } from "./liveActions";
import { EVRES, EVRE_DEF, EVRE_NAME, EVRE_WHEN, ITEM_NAME, ITEM_SECS, SHOW_ITEMS, SIDES, SIDE_DEF, SIDE_NAME, SRC_CATS, SRC_KINDS, addSource, cleanCourseShow, srcCat, streamSources, ytEmbed, ytId } from "@/lib/raceRounds";
import { bindCam, groupsOf } from "@/lib/raceCams";
import { cardKey } from "@/lib/raceCourse";
import { cleanPlan, raceName } from "@/lib/raceLive";
import { nextSrcLive, srcIsLive } from "@/lib/srcLive";
import { groupColor } from "@/lib/roundScore";
import { authFetch } from "@/lib/authFetch";
import { SrcKey } from "@/features/broadcast/SrcKey";
import { MyChannel } from "@/features/broadcast/MyChannel";
import { NearCams } from "@/features/broadcast/NearCams";
import { ytPrepare } from "@/lib/youtube";
import "./ekranAyar.css";

const TABS = [
  ["now", "Şimdi"],
  ["ev", "Evreler"],
  ["src", "Kaynaklar"],
  ["txt", "Yazı"],
];
const FAIL = "Kaydedilemedi. İnterneti kontrol et.";
const BAD_URL = "Bağlantı tanınmadı. Yayının kendi bağlantısını yapıştır: youtube.com/live/…, youtu.be/… ya da studio.youtube.com/video/…";
const thumb = (url) => (ytId(url) ? `https://i.ytimg.com/vi/${ytId(url)}/mqdefault.jpg` : "");
const sameVid = (a, b) => !!a && !!b && a.kind === b.kind && (a.src || "") === (b.src || "") && (a.mid || "") === (b.mid || "") && (a.grp || "") === (b.grp || "");

// now: ekranın şu anki evresi ve öğesi (LiveScreen scPick): { evre, auto, item, next, left, pin, empty, has }
export function LiveMasa({ orgId, raceId, race, live, now, pos = [], today, onMsg, addCat = null }) {
  const [tab, setTab] = useState(addCat?.tab || "now");
  const [L, setL] = useState(null); // ekran, kaynaklar, evreler (raceLive belgesinin ekran alanları)
  const [evOpen, setEvOpen] = useState("");
  const [aySel, setAySel] = useState(""); // Ekran ayarlarında seçilen evre
  const [ayVid, setAyVid] = useState(false); // görüntü seçenekleri açık
  const [det, setDet] = useState(addCat?.det || ""); // ⋯ ile açılan kaynağın detay sayfası (kaynak id)
  const [dTab, setDTab] = useState("bil"); // detay sayfasının sekmesi: bil (Bilgiler), grp (Grup), ayar (Ayarlar)
  const [wipe, setWipe] = useState(false); // Kaynakları sıfırla: ikinci dokunuşta siler
  const [add, setAdd] = useState(addCat?.c || ""); // açık ekleme kutusu: kategori (canli, video, kanal, etraf)
  const [addKind, setAddKind] = useState("drone");
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [stat, setStat] = useState({});
  const [cap, setCap] = useState(null);
  const [ttl, setTtl] = useState(null);
  const [sub, setSub] = useState(null);
  const [note, setNote] = useState(""); // kısa bilgi (Yayında, Kaydedilemedi…), 3 sn sonra kalkar
  const say = (x) => (setNote(x), onMsg?.(x));
  useEffect(() => {
    if (!note) return undefined;
    const t = setTimeout(() => setNote(""), 3000);
    return () => clearTimeout(t);
  }, [note]);
  const fail = () => say(FAIL);
  // Ne izleyeyim? › "+ Video" vb.: Kaynaklar sekmesi o kategorinin ekleme kutusuyla açılır
  const addN = addCat?.n || 0;
  const bare = !!addCat?.bare;
  const ayar = !!addCat?.ayar; // çubuktaki çarkla açılan Ekran ayarları (beyaz, tam sayfa)
  const [addSeen, setAddSeen] = useState(addN);
  if (addN !== addSeen) {
    setAddSeen(addN);
    setTab(addCat.tab || "src");
    setAdd(addCat.c || "");
    setDet(addCat.det || "");
    setDTab("bil");
    setAddUrl("");
    setAddName("");
  }

  useEffect(() => {
    let on = true;
    loadRoundsOf(orgId, raceId).then((d) => on && setL(d), () => {});
    const off = watchRounds(orgId, raceId, (d) => on && setL((p) => ({ ...(p || {}), ...d })));
    return () => {
      on = false;
      off?.();
    };
  }, [orgId, raceId]);

  const srcList = streamSources(L?.stream);
  // Yayında mı (Yayın sayfasındakinin aynısı; masa açıkken 45 sn'de bir): yayında olanlar raceLive.srcLive'a yazılır
  const srcUrls = srcList.map((x) => x.url).filter(Boolean).join("|");
  const liveRef = useRef({});
  useEffect(() => {
    liveRef.current = { srcLive: L?.srcLive, list: srcList };
  });
  useEffect(() => {
    if (!srcUrls) return undefined;
    let on = true;
    const ask = () =>
      document.visibilityState === "visible" &&
      authFetch(`/api/yayin-durum?${srcUrls.split("|").map((u) => `u=${encodeURIComponent(u)}`).join("&")}`)
        .then((r) => r.json())
        .then((d) => {
          if (!on) return;
          const m = Object.fromEntries((d.list || []).map((x) => [x.url, x]));
          setStat(m);
          if (!d.key) return;
          const nx = nextSrcLive(liveRef.current.srcLive, liveRef.current.list.filter((x) => x.url && m[x.url]?.live).map((x) => x.id));
          if (nx) (setL((p) => (p ? { ...p, srcLive: nx } : p)), saveSrcLive(orgId, raceId, nx).catch(() => {}));
        })
        .catch(() => {});
    ask();
    const t = setInterval(ask, 45000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [srcUrls, orgId, raceId]);

  if (!L) return <p className="lms-no">Yükleniyor…</p>;
  const pre = cleanCourseShow(L.courseShow);
  const evNow = now?.evre || pre.evre || "pre";
  const screen = L.screen || { kind: "" };
  const plan = cleanPlan(live.plan);
  const groupRows = plan.sets.flatMap((x) => (x.grps.length ? x.grps.map((g) => [x.cls, g]) : [[x.cls, ""]]));
  const vids = [...live.media].filter((m) => m.kind === "video" && m.url).reverse().slice(0, 8);
  const isLive = (x) => srcIsLive(L.srcLive, x.id) || !!stat[x.url]?.live;
  const autoOn = Object.keys(L.camBy || {}).length > 0;

  const show = (s) =>
    showOnScreen(orgId, raceId, s).then(
      () => (setL((p) => ({ ...p, screen: { ...p.screen, ...s } })), say(s.kind ? "Yayında" : "Ekrandan kaldırıldı")),
      fail,
    );
  const putCs = (patch) => setL((p) => ({ ...p, courseShow: { ...cleanCourseShow(p.courseShow), ...patch } }));
  const putEvreMan = (k) => (putCs({ evre: k }), saveEvreMan(orgId, raceId, k).catch(fail));
  const putPin = (item) => (putCs({ pin: item, ...(item ? {} : { one: "" }), scene: "" }), savePin(orgId, raceId, item).catch(fail));
  const putEv = (k, patch, keep = true) => {
    const e = { ...pre.ev[k], ...patch, own: true };
    putCs({ ev: { ...pre.ev, [k]: e } });
    saveEvre(orgId, raceId, k, e).catch(fail);
    // öğe sırası, süre ve sol alt senin listene de yazılır (sonraki yarışlarda aynısı; Yayın sayfasındaki gibi)
    if (keep && ("items" in patch || "sec" in patch || "side" in patch)) saveShowTpl(orgId, k, e).catch(() => {});
  };
  const putVid = (k, v) => putEv(k, { vid: v ? { kind: v.kind || "", src: v.src || "", mid: v.mid || "", ...(v.kind === "boats" ? { zoom: v.zoom ?? 100, grp: v.grp || "" } : {}) } : null });
  const onAir = L.onAir?.sid || "";
  const putOnAir = (sid) => {
    const o = { sid: onAir === sid ? "" : sid };
    setL((p) => ({ ...p, onAir: o }));
    saveOnAir(orgId, raceId, o).catch(fail);
  };
  const putSources = (l, gone = null) => {
    const x = { sources: l, empty: !l.length, ...(gone ? { gone } : {}) };
    setL((p) => ({ ...p, stream: { ...(p.stream || {}), ...x } }));
    setStream(orgId, raceId, x).catch(fail);
  };
  // sil: yalnız listeden (YouTube'daki yayın ve anahtarı kalır); kanalımdan kendiliğinden gelen süren yayın bir daha eklenmez
  const delSrc = (s) => {
    closeDet();
    const v = ytId(s.url);
    putSources(srcList.filter((x) => x.id !== s.id), s.auto && v ? [...(L?.stream?.gone || []), v] : null);
  };
  // Kaynakları sıfırla (Seyhun 2026-11-06 "eski kamera falan onları temizleyelim, sıfırdan deneyeceğim"): bütün kaynaklar, gruba bağlı
  // kameralar ve yayında işareti silinir; kanalımdan gelen süren yayınlar bir daha kendiliğinden eklenmez; ekrandaki kaynak kalkar
  const wipeSrc = () => {
    setWipe(false);
    setDet("");
    setAdd("");
    const gone = [...new Set([...(L?.stream?.gone || []), ...srcList.filter((x) => x.auto).map((x) => ytId(x.url)).filter(Boolean)])];
    putSources([], gone);
    setL((p) => ({ ...p, camBy: {}, srcLive: {}, onAir: { sid: "" } }));
    saveCamBy(orgId, raceId, {}).catch(fail);
    saveSrcLive(orgId, raceId, {}).catch(() => {});
    saveOnAir(orgId, raceId, { sid: "" }).catch(() => {});
    if (screen.kind === "src" || screen.kind === "live") show({ kind: "" });
    else say("Kaynaklar silindi");
  };
  // from: kanal (Kanalımdan), etraf (Etraftaki kameralar), video (YouTube videosu); canlı yayında yok
  const addSrc = (k, url = "", name = "", from = "") => {
    const u = String(url || "").trim();
    if (u && !ytEmbed(u)) return say(BAD_URL);
    if (from === "video" && !u) return say("Videonun bağlantısını yapıştır");
    const vn = from === "video" ? name || `Video ${srcList.filter((x) => x.from === "video").length + 1}` : name;
    const l = addSource(srcList, k).map((x, i, a) => (i === a.length - 1 ? { ...x, ...(u ? { url: u } : {}), ...(vn ? { name: String(vn).slice(0, 30) } : {}), ...(from ? { from } : {}) } : x));
    setAdd("");
    setAddUrl("");
    setAddName("");
    if (!u && from !== "video") setDet(l.at(-1).id); // bağlantısız eklenen kaynak: detayda bağlantı yazılır
    putSources(l);
  };
  const putSrc = (sid, p) => {
    if (p.url && !ytEmbed(p.url)) return say(BAD_URL);
    putSources(srcList.map((x) => (x.id === sid ? { ...x, ...p } : x)));
  };
  const putStream = async (sid, ytStream) => {
    const l = srcList.map((x) => (x.id === sid ? { ...x, ytStream } : x));
    let m = {};
    try {
      m = await ytPrepare(l.filter((x) => x.id === sid), (x) => [race?.name, x.name].filter(Boolean).join(" · "));
    } catch {}
    putSources(l.map((x) => (m[x.id] ? { ...x, url: m[x.id] } : x)));
    say("Anahtar hazır: adresi ve anahtarı cihaza gir");
  };
  const putSrcGrp = (sid, k) => {
    const mine = groupsOf(L.camBy, sid);
    const m = bindCam(L.camBy, sid, mine.includes(k) ? mine.filter((x) => x !== k) : [...mine, k]);
    setL((p) => ({ ...p, camBy: m }));
    saveCamBy(orgId, raceId, m).catch(fail);
  };
  const isOn = (v) => sameVid(screen.kind ? screen : null, v);

  // Görüntü seçenekleri (evrenin görüntüsü ve Kaynaklar aynı liste)
  const vidOpts = [
    ...(autoOn ? [[{ kind: "live" }, "Grubun kamerası"]] : []),
    ...srcList.map((x) => [{ kind: "src", src: x.id }, x.name]),
    ...(pos.length ? pos : [{ grp: "", name: "Tekneler" }]).map((g) => [{ kind: "boats", grp: g.grp }, g.grp ? `${g.grp} tekneler` : "Tekneler"]),
    ...vids.map((m) => [{ kind: "rec", mid: m.id }, recName(m, live.starts)]),
  ];
  const vidName = (k) => {
    const v = pre.ev[k].vid;
    if (!v) return "Ekrandaki";
    if (!v.kind) return "Bulanık foto";
    return vidOpts.find(([o]) => sameVid(o, v))?.[1] || "Ekrandaki";
  };
  const todays = live.starts.filter((x) => x.day === today && !x.void);
  const chip = (on, label, onClick, dot = "", key = label) => (
    <button key={key} type="button" className={`lms-c${on ? " on" : ""}`} aria-pressed={on} onClick={onClick}>
      {dot ? <i style={{ background: dot }} aria-hidden="true" /> : null}
      {label}
    </button>
  );

  const tile = (x) => {
    const lv = isLive(x);
    const th = thumb(x.url);
    const vd = srcCat(x) === "video";
    return (
      <button key={x.id} type="button" className={`lms-t${isOn({ kind: "src", src: x.id }) ? " air" : ""}`} onClick={() => (setDet(x.id), setDTab("bil"), setAdd(""))}>
        <span className={`th${lv || vd ? "" : " off"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- YouTube küçük resmi */}
          {th ? <img src={th} alt="" loading="lazy" /> : null}
          <em className={lv ? "" : "no"}>{!x.url ? "BAĞLANTI YOK" : lv ? "YAYINDA" : vd ? "VİDEO" : "YAYIN YOK"}</em>
        </span>
        <b>
          {groupsOf(L.camBy, x.id).slice(0, 2).map((k) => (
            <i key={k} style={{ background: groupColor(k.split("|")[1]) || "#ffd23f" }} aria-hidden="true" />
          ))}
          {x.name}
        </b>
      </button>
    );
  };
  // ekleme kutusu kategoriye göre: canlı yayın (tür + bağlantı), YouTube videosu (bağlantı + ad), kanalımdan, etraftaki kameralar
  const addBox = (c) => (
    <div className="lms-sd">
      {c === "canli" ? (
        <>
          <div className="lms-cs">{Object.entries(SRC_KINDS).map(([k, t]) => chip(addKind === k, `${t} · ${addSource(srcList, k).at(-1).name}`, () => setAddKind(k), "", k))}</div>
          <input className="lms-in" value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="YouTube canlı yayın bağlantısı (sonra da yazılır)" inputMode="url" aria-label="Bağlantı" />
        </>
      ) : c === "video" ? (
        <>
          <input className="lms-in" value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="YouTube video bağlantısı (youtu.be, watch?v=, shorts)" inputMode="url" aria-label="Video bağlantısı" />
          <input className="lms-in" value={addName} maxLength={30} onChange={(e) => setAddName(e.target.value)} placeholder="Adı (örn. Dünkü start)" aria-label="Videonun adı" />
        </>
      ) : c === "kanal" ? (
        <MyChannel used={srcList.map((x) => x.url)} onPick={(u) => addSrc("camera", u, "", "kanal")} />
      ) : (
        <NearCams race={race} onPick={(u, n) => addSrc("camera", u, n, "etraf")} />
      )}
      <div className="lms-row">
        <button type="button" className="lms-b" onClick={() => setAdd("")}>
          Vazgeç
        </button>
        {c === "canli" || c === "video" ? (
          <button type="button" className="lms-b go" onClick={() => (c === "video" ? addSrc("camera", addUrl, addName.trim(), "video") : addSrc(addKind, addUrl))}>
            Ekle
          </button>
        ) : null}
      </div>
    </div>
  );
  // Kaynağın detay sayfası (Seyhun 2026-11-06 örnek kaynak-detay: "3 nokta; detay sayfası açılıp işlemler yapılıp X ile kapansın"):
  // beyaz tam sayfa; önizleme, ad, Yayına ver, ad / bağlantı / yayın anahtarı, çektiği grup, kategori, sil. Ekranda › ⋯ ile açılınca X oraya döner.
  const CAT_SHORT = { canli: "Canlı", kanal: "Kanalım", etraf: "Etraf", video: "Video" };
  const closeDet = () => (addCat?.det && addCat.det === det && addCat.back ? addCat.back() : setDet(""));
  const detPage = () => {
    const s = srcList.find((x) => x.id === det);
    if (!s || typeof document === "undefined") return null;
    const air = isOn({ kind: "src", src: s.id });
    const lv = isLive(s);
    const th = thumb(s.url);
    const mine = groupsOf(L.camBy, s.id);
    const multi = groupRows.some(([c2]) => c2 !== groupRows[0]?.[0]);
    const gName = (k) => {
      const [c, g] = k.split("|");
      return multi ? [c, g].filter(Boolean).join(" · ") : g || c;
    };
    const hasGrp = groupRows.length > 0 && srcCat(s) !== "video";
    const tabs = [["bil", "Bilgiler"], ...(hasGrp ? [["grp", "Grup"]] : []), ["ayar", "Ayarlar"]];
    const tb = tabs.some(([k]) => k === dTab) ? dTab : "bil";
    const meta = [SRC_CATS.find(([c]) => c === srcCat(s))?.[1], mine.length ? `${mine.map(gName).join(", ")} ${mine.length > 1 ? "gruplarını" : "grubunu"} çekiyor` : "", !s.url ? "Bağlantı yok" : ""].filter(Boolean).join(" · ");
    return createPortal(
      <div className="kdt" role="dialog" aria-label={s.name}>
        <button type="button" className="kdt-x" aria-label="Kapat" onClick={closeDet}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
        <div className="kdt-w">
          <div className="kdt-a">
            <div className="kdt-pv">
              {/* eslint-disable-next-line @next/next/no-img-element -- YouTube küçük resmi */}
              {th ? <img src={th} alt="" onError={(e) => (e.currentTarget.style.display = "none")} /> : null}
              {air ? <em>YAYINDA</em> : <em className="no">{!s.url ? "BAĞLANTI YOK" : lv ? "CANLI" : srcCat(s) === "video" ? "VİDEO" : "YAYIN YOK"}</em>}
            </div>
            <h2 className="kdt-t">{s.name}</h2>
            {meta ? <p className="kdt-m">{meta}</p> : null}
            {air ? (
              <button type="button" className="kdt-go off" onClick={() => show({ kind: "", off: evNow })}>
                Yayından çıkar
              </button>
            ) : (
              <button type="button" className="kdt-go" disabled={!s.url} onClick={() => show({ kind: "src", src: s.id })}>
                Yayına ver
              </button>
            )}
            {note ? <p className="kdt-n" role="status">{note}</p> : null}
          </div>
          <div className="kdt-b">
            <div className="kdt-tabs" role="tablist">
              {tabs.map(([k, t]) => (
                <button key={k} type="button" role="tab" aria-selected={tb === k} className={tb === k ? "on" : ""} onClick={() => setDTab(k)}>
                  {t}
                </button>
              ))}
            </div>
            {tb === "bil" ? <div className="kdt-l">
              <label className="kdt-r">
                <span>Ad</span>
                <input
                  defaultValue={s.name}
                  maxLength={30}
                  onBlur={(e) => {
                    const v = e.target.value.trim().slice(0, 30);
                    if (v && v !== s.name) putSrc(s.id, { name: v });
                    else e.target.value = s.name;
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              </label>
              <label className="kdt-r">
                <span>Bağlantı</span>
                <input defaultValue={s.url} inputMode="url" placeholder="YouTube bağlantısı" onBlur={(e) => e.target.value.trim() !== s.url && putSrc(s.id, { url: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
              </label>
            </div> : null}
            {tb === "grp" ? (
              <>
                <h4 className="kdt-h">Çektiği grup</h4>
                <div className="kdt-seg wrap" role="group">
                  {groupRows.map(([c, g]) => {
                    const k = cardKey(c, g);
                    const on = L.camBy?.[k] === s.id;
                    return (
                      <button key={k} type="button" className={on ? "on" : ""} aria-pressed={on} onClick={() => putSrcGrp(s.id, k)}>
                        {g ? <i style={{ background: groupColor(g) || "#ffd23f" }} aria-hidden="true" /> : null}
                        {gName(k)}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
            {tb === "ayar" ? <>
            {srcCat(s) !== "video" ? (
              <>
                <h4 className="kdt-h">Yayın anahtarı</h4>
                <div className="kdt-key">
                  <SrcKey src={s} onStream={(v) => putStream(s.id, v)} toast={say} />
                </div>
              </>
            ) : null}
            <h4 className="kdt-h">Kategorisi</h4>
            <div className="kdt-seg" role="group">
              {SRC_CATS.map(([c]) => (
                <button key={c} type="button" className={srcCat(s) === c ? "on" : ""} aria-pressed={srcCat(s) === c} onClick={() => srcCat(s) !== c && putSrc(s.id, { from: c === "canli" ? "" : c, ...(c !== "kanal" && s.auto ? { auto: false } : {}) })}>
                  {CAT_SHORT[c]}
                </button>
              ))}
            </div>
            {!air ? (
              <button type="button" className="kdt-del" onClick={() => delSrc(s)}>
                Kaynağı sil
              </button>
            ) : null}
            </> : null}
          </div>
        </div>
      </div>,
      document.body,
    );
  };
  const body =
    tab === "now" ? (
      <>
        <div className="lms-why">
          <b>{`${EVRE_NAME[evNow]} · ${ITEM_NAME[now?.item] || "Görüntü"}`}</b>
          <span>{now?.pin ? `${ITEM_NAME[now.item]} sabit, kaldırana kadar ekranda` : now?.empty ? "Seçilenlerin verisi yok" : now?.next ? `${now.left > 5 ? `${now.left} sn sonra ` : "Birazdan "}${ITEM_NAME[now.next]}` : "Tek öğe, dönmez"}</span>
          <span>{pre.evre ? `Elle seçildi · kendiliğinden ${EVRE_NAME[now?.auto] || ""} olurdu` : EVRE_WHEN[evNow]}</span>
        </div>
        <h4 className="lms-h">Evre</h4>
        <div className="lms-cs">
          {chip(!pre.evre, "Otomatik", () => putEvreMan(""))}
          {EVRES.map((k) => chip(pre.evre === k, EVRE_NAME[k], () => putEvreMan(pre.evre === k ? "" : k), "", k))}
        </div>
        <h4 className="lms-h">Ekranda tut</h4>
        <div className="lms-cs">
          {chip(!now?.pin, "Otomatik", () => putPin(""))}
          {SHOW_ITEMS.filter((k) => !now?.has || now.has[k]).map((k) => chip(!!now?.pin && now.item === k, ITEM_NAME[k], () => putPin(now?.pin && now.item === k ? "" : k), "", k))}
        </div>
        <h4 className="lms-h">Sol alt</h4>
        <div className="lms-cs">{SIDES.map((k) => chip(pre.ev[evNow].side === k, SIDE_NAME[k], () => putEv(evNow, { side: k }), "", k))}</div>
        {todays.length > 1 ? (
          <>
            <h4 className="lms-h">Canlıda grup</h4>
            <div className="lms-cs">
              {chip(!onAir, "Otomatik", () => onAir && putOnAir(onAir))}
              {todays.map((s) => chip(onAir === s.id, [s.grp, raceName(s)].filter(Boolean).join(" · "), () => putOnAir(s.id), s.grp ? groupColor(s.grp) : "", s.id))}
            </div>
          </>
        ) : null}
        <div className="lms-row">
          {screen.kind ? (
            <button type="button" className={`lms-b${screen.pause ? " on" : ""}`} onClick={() => show({ ...screen, pause: !screen.pause })}>
              {screen.pause ? "Sürdür" : "Duraklat"}
            </button>
          ) : null}
          <button
            type="button"
            className="lms-b"
            onClick={() => {
              const u = liveUrl(raceId);
              if (navigator.share) navigator.share({ url: u, title: race?.name || "Canlı" }).catch(() => {});
              else navigator.clipboard?.writeText(u).then(() => say("Link kopyalandı"), () => {});
            }}
          >
            Linki paylaş
          </button>
        </div>
      </>
    ) : tab === "ev" ? (
      <div className="lms-evs">
        {EVRES.map((k) => {
          const e = pre.ev[k];
          const open = evOpen === k;
          return (
            <div key={k} className={`lms-ev${k === evNow ? " now" : ""}${open ? " open" : ""}`}>
              <button type="button" className="lms-evh" aria-expanded={open} onClick={() => setEvOpen(open ? "" : k)}>
                <b>
                  {EVRE_NAME[k]}
                  {k === evNow ? <em>ŞİMDİ</em> : null}
                </b>
                <small>{`${vidName(k)} · ${e.items.length ? e.items.map((x) => ITEM_NAME[x]).join(", ") : "Öğe yok"}`}</small>
              </button>
              {open ? (
                <div className="lms-evb">
                  <p className="lms-when">{EVRE_WHEN[k]}</p>
                  <h4 className="lms-h">Görüntü</h4>
                  <div className="lms-cs">
                    {chip(!e.vid, "Ekrandaki", () => putVid(k, null))}
                    {chip(!!e.vid && !e.vid.kind, "Bulanık foto", () => putVid(k, { kind: "" }))}
                    {vidOpts.map(([v, t]) => chip(sameVid(e.vid, v), t, () => putVid(k, v), v.grp ? groupColor(v.grp) : "", `${v.kind}${v.src || v.mid || v.grp || ""}`))}
                  </div>
                  <h4 className="lms-h">Gösterilecekler · sırayla</h4>
                  <ol className="lms-its">
                    {e.items.map((x, i, a) => (
                      <li key={x}>
                        <i>{i + 1}</i>
                        <span>{ITEM_NAME[x]}</span>
                        {i > 0 ? (
                          <button type="button" className="lms-b sm" onClick={() => putEv(k, { items: [...a.slice(0, i - 1), x, a[i - 1], ...a.slice(i + 1)] })}>
                            Yukarı
                          </button>
                        ) : null}
                        <button type="button" className="lms-b sm red" onClick={() => putEv(k, { items: a.filter((y) => y !== x) })}>
                          Çıkar
                        </button>
                      </li>
                    ))}
                  </ol>
                  {SHOW_ITEMS.some((x) => !e.items.includes(x)) ? (
                    <div className="lms-cs">
                      {SHOW_ITEMS.filter((x) => !e.items.includes(x)).map((x) => (
                        <button key={x} type="button" className="lms-c add" onClick={() => putEv(k, { items: [...e.items, x] })}>
                          {`+ ${ITEM_NAME[x]}`}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {e.items.length > 1 ? (
                    <>
                      <h4 className="lms-h">Her biri</h4>
                      <div className="lms-cs">{ITEM_SECS.map((n) => chip(e.sec === n, `${n} sn`, () => putEv(k, { sec: n }), "", n))}</div>
                    </>
                  ) : null}
                  <h4 className="lms-h">Sol alt</h4>
                  <div className="lms-cs">{SIDES.map((s) => chip(e.side === s, SIDE_NAME[s], () => putEv(k, { side: s }), "", s))}</div>
                  <div className="lms-row">
                    {e.items.join() !== EVRE_DEF[k].join() || e.sec !== 15 || e.side !== SIDE_DEF[k] ? (
                      <button type="button" className="lms-b" onClick={() => putEv(k, { items: [...EVRE_DEF[k]], sec: 15, side: SIDE_DEF[k] })}>
                        Varsayılana dön
                      </button>
                    ) : null}
                    {k !== evNow ? (
                      <button type="button" className="lms-b go" onClick={() => putEvreMan(k)}>
                        Bu evreye geç
                      </button>
                    ) : pre.evre ? (
                      <button type="button" className="lms-b" onClick={() => putEvreMan("")}>
                        Otomatiğe dön
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    ) : tab === "src" ? (
      <>
        {/* Kategoriler (Seyhun 2026-11-06 "YouTube videosu, YouTube canlı, benim kanalımın canlıları, etraftakiler"): her başlığın yanında + */}
        {SRC_CATS.map(([c, title]) => {
          const list = srcList.filter((x) => srcCat(x) === c);
          const full = srcList.length >= 8;
          return (
            <section key={c} className="lms-cat">
              <div className="lms-ch">
                <h4 className="lms-h">{title}</h4>
                {!full ? (
                  <button type="button" className={`lms-plus${add === c ? " on" : ""}`} aria-label={`${title} ekle`} aria-expanded={add === c} onClick={() => (setAdd(add === c ? "" : c), setAddUrl(""), setAddName(""))}>
                    {c === "video" ? "+ Video" : c === "kanal" ? "+ Kanalımdan" : c === "etraf" ? "+ Bul" : "+ Kaynak"}
                  </button>
                ) : null}
              </div>
              {add === c ? addBox(c) : null}
              {list.length || (c === "canli" && autoOn) ? (
                <div className="lms-tiles">
                  {c === "canli" && autoOn ? (
                    <button type="button" className={`lms-t${isOn({ kind: "live" }) ? " air" : ""}`} onClick={() => show({ kind: "live" })}>
                      <span className="th">
                        <em className="no">GRUBA GÖRE</em>
                      </span>
                      <b>Grubun kamerası</b>
                    </button>
                  ) : null}
                  {list.map(tile)}
                </div>
              ) : add !== c ? (
                <p className="lms-empty">{c === "video" ? "YouTube'daki bir videoyu bağlantısıyla ekle" : c === "kanal" ? "Kanalında canlı yayın açınca burada çıkar" : c === "etraf" ? "Yarış yerine yakın açık kameralar" : "Drone, telefon ya da kamera ekle"}</p>
              ) : null}
            </section>
          );
        })}
        {srcList.length || autoOn ? (
          <button type="button" className={`lms-b red lms-wipe${wipe ? " on" : ""}`} onClick={() => (wipe ? wipeSrc() : setWipe(true))} onBlur={() => setWipe(false)}>
            {wipe ? "Hepsi silinsin mi? Dokun, sil" : "Kaynakları sıfırla"}
          </button>
        ) : null}
        <h4 className="lms-h">Canlı konum</h4>
        <div className="lms-cs">
          {(pos.length ? pos : [{ grp: "", name: "Tekneler" }]).map((g) => chip(isOn({ kind: "boats", grp: g.grp }), g.grp ? `${g.grp} tekneler` : "Tekneler", () => show({ kind: "boats", grp: g.grp, zoom: 100 }), g.grp ? groupColor(g.grp) : "", g.grp || "t"))}
        </div>
        {vids.length ? (
          <>
            <h4 className="lms-h">Kayıtlar</h4>
            <div className="lms-cs">{vids.map((m) => chip(isOn({ kind: "rec", mid: m.id }), recName(m, live.starts), () => show({ kind: "rec", mid: m.id, loop: true }), "", m.id))}</div>
          </>
        ) : null}
        {screen.kind || (pre.ev[evNow]?.vid?.kind && screen.off !== evNow) ? (
          <div className="lms-row">
            {/* anında keser: evrenin atanmış görüntüsü de bu evrede geri gelmez (raceRounds cleanScreen off) */}
            <button type="button" className="lms-b red" onClick={() => show({ kind: "", off: evNow })}>
              Ekrandan kaldır
            </button>
          </div>
        ) : null}
      </>
    ) : (
      <>
        <h4 className="lms-h">Ekranda yazı</h4>
        <input className="lms-in" value={cap ?? screen.caption ?? ""} maxLength={80} placeholder="Örn. Sarı grup start hattında" aria-label="Ekranda yazı" onChange={(e) => setCap(e.target.value)} />
        <div className="lms-row">
          {screen.caption ? (
            <button type="button" className="lms-b" onClick={() => (setCap(""), show({ ...screen, caption: "" }))}>
              Kaldır
            </button>
          ) : null}
          <button type="button" className="lms-b go" disabled={(cap ?? screen.caption ?? "").trim() === (screen.caption || "")} onClick={() => (show({ ...screen, caption: (cap || "").trim() }), setCap(null))}>
            Ekrana yaz
          </button>
        </div>
        <h4 className="lms-h">Ekrandaki ad</h4>
        <input className="lms-in" value={ttl ?? plan.title} maxLength={40} placeholder={race?.name || "Başlık"} aria-label="Başlık" onChange={(e) => setTtl(e.target.value)} />
        <input className="lms-in" value={sub ?? plan.sub} maxLength={60} placeholder="Alt satır" aria-label="Alt satır" onChange={(e) => setSub(e.target.value)} />
        <div className="lms-row">
          <button
            type="button"
            className="lms-b go"
            disabled={(ttl ?? plan.title).trim() === plan.title && (sub ?? plan.sub).trim() === plan.sub}
            onClick={() => {
              const next = cleanPlan({ ...plan, title: (ttl ?? plan.title).trim(), sub: (sub ?? plan.sub).trim() });
              savePlanKeys(orgId, raceId, next, ["title", "sub"]).then(() => (setTtl(null), setSub(null), say("Ekrandaki ad kaydedildi")), fail);
            }}
          >
            Kaydet
          </button>
        </div>
      </>
    );
  // Ekran ayarları (Seyhun 2026-11-06 örnek ekran-ayarlari onaylandı): solda evreler (ne açık, ŞİMDİ), sağda seçilen evrenin anahtarları
  // (Rüzgâr, Parkur, Program, Genel sıralama, Sıradaki yarış), her birinin süresi, sol alt liste ve görüntü. Telefonda alt alta.
  // Öğe sırası, süre ve sol alt bütün yarışlara da yazılır (putEv → saveShowTpl); görüntü yarışa özel.
  const AY_ITEMS = ["wind", "course", "prog", "rank", "next"];
  if (ayar) {
    const k = aySel || evNow;
    const e = pre.ev[k];
    const onCnt = (x) => x.items.filter((i) => AY_ITEMS.includes(i));
    const sum = (x) => (onCnt(x).length ? onCnt(x).map((i) => (i === "rank" ? "Sıralama" : i === "next" ? "Sıradaki" : ITEM_NAME[i])).join(", ") : "Kapalı");
    const toggle = (i) => putEv(k, { items: e.items.includes(i) ? e.items.filter((x) => x !== i) : [...e.items, i] });
    const seg = (list, cur, name, set) => (
      <div className="eay-seg" role="group">
        {list.map((v) => (
          <button key={v} type="button" className={cur === v ? "on" : ""} aria-pressed={cur === v} onClick={() => cur !== v && set(v)}>
            {name(v)}
          </button>
        ))}
      </div>
    );
    const any = onCnt(e).length > 0 || e.side !== "off" || !!e.vid;
    return (
      <div className="eay">
        <h2 className="eay-t">Ekran ayarları</h2>
        <p className="eay-m">Bütün yarışlarda geçerli</p>
        {note ? <p className="eay-n" role="status">{note}</p> : null}
        <div className="eay-w">
          <div className="eay-l">
            {EVRES.map((x) => (
              <button key={x} type="button" className={`eay-r${x === k ? " sel" : ""}`} onClick={() => (setAySel(x), setAyVid(false))}>
                <span>
                  <b>
                    {EVRE_NAME[x]}
                    {x === evNow ? <em>ŞİMDİ</em> : null}
                  </b>
                  <small>{EVRE_WHEN[x]}</small>
                </span>
                <i className={onCnt(pre.ev[x]).length ? "on" : ""}>{sum(pre.ev[x])}</i>
              </button>
            ))}
          </div>
          <div className="eay-d" key={k}>
            <h3>{EVRE_NAME[k]}</h3>
            <p className="eay-wh">{EVRE_WHEN[k]}</p>
            <p className="eay-h">Ekranda kendiliğinden</p>
            {AY_ITEMS.map((i) => (
              <button key={i} type="button" className="eay-sw" role="switch" aria-checked={e.items.includes(i)} onClick={() => toggle(i)}>
                <span>{ITEM_NAME[i]}</span>
                <i className={e.items.includes(i) ? "on" : ""} aria-hidden="true" />
              </button>
            ))}
            {onCnt(e).length > 1 ? (
              <>
                <p className="eay-h">Her biri</p>
                {seg(ITEM_SECS, e.sec, (n) => `${n} sn`, (n) => putEv(k, { sec: n }))}
              </>
            ) : null}
            <p className="eay-h">Sol alt liste</p>
            {seg(SIDES, e.side, (v) => SIDE_NAME[v], (v) => putEv(k, { side: v }))}
            <p className="eay-h">Görüntü</p>
            <button type="button" className="eay-pk" aria-expanded={ayVid} onClick={() => setAyVid(!ayVid)}>
              <span>{e.vid ? vidName(k) : "Yayındaki"}</span>
              <i>{ayVid ? "Kapat" : "Değiştir ›"}</i>
            </button>
            {ayVid ? (
              <div className="eay-vs">
                {[[null, "Yayındaki"], [{ kind: "" }, "Bulanık foto"], ...vidOpts].map(([v, t]) => {
                  const sel = v ? sameVid(e.vid, v) || (!v.kind && !!e.vid && !e.vid.kind) : !e.vid;
                  return (
                    <button key={t + (v?.src || v?.mid || v?.grp || v?.kind || "")} type="button" className={sel ? "on" : ""} aria-pressed={sel} onClick={() => (putVid(k, v), setAyVid(false))}>
                      {t}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {any ? (
              <button type="button" className="eay-x" onClick={() => putEv(k, { items: [], side: "off", vid: null })}>
                Bu evreyi kapat
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="lms">
      <div className="lms-hd">
        <b>{bare ? TABS.find(([k]) => k === tab)?.[1] || "Yayın" : "Yayın masası"}</b>
        <small>İzleyiciler bunu görür</small>
      </div>
      {/* çubuktaki Şimdi / Evreler / Kaynaklar / Yazı ile açılınca sekmeler çubukta (bare) */}
      {bare ? null : <div className="lms-tabs" role="tablist">
        {TABS.map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {t}
          </button>
        ))}
      </div>}
      {note ? <p className="lms-msg" role="status">{note}</p> : null}
      <div className="lms-bd" key={tab}>
        {body}
      </div>
      {det ? detPage() : null}
    </div>
  );
}
