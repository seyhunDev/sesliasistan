"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dirShort } from "@/lib/raceLive";
import { VeloraGlyph } from "@/components/ui/AppLogo";
import { BG_PHOTO, PRE_KEY } from "./LiveScreen";
import { useVisit } from "./useVisit";
import { LOGOLAR } from "./logolar";
import "./liveScreen.css";
import "./liveHome.css";

// Herkese açık genel sayfa /canli (Seyhun 2026-11-01 "bir tane genel kullanıcı arayüzü yap"): açık yarışların listesi (/api/canli id'siz).
// Düzen (Seyhun 2026-11-04 "2026 yıllarının dijital dünyasına uygun, Velora logosu, altta kayan logolar"): üstte Velora + kaç yarış canlı;
// "Şu an canlı" bölümünde süren yarışların hepsi büyük kartta (canlı yoksa "Sıradaki yayın" tek kart); altında Yaklaşan ve Biten; en altta logo şeridi.
const dayText = (d) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      })
    : "";
const when = (r) =>
  r.endDate && r.endDate !== r.startDate
    ? `${dayText(r.startDate)} – ${dayText(r.endDate)}`
    : dayText(r.startDate);
const trToday = () =>
  new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const daysTo = (d, today) =>
  Math.round(
    (Date.parse(`${d}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5,
  );
const statusText = (r) =>
  r.status === "ap"
    ? "Ertelendi"
    : r.status === "none"
      ? "Bugün yarış yok"
      : r.status === "done"
        ? "Gün bitti"
        : "Bugün";
// kart durumu: süren yarış / bugün start bekleniyor / yarışa N gün
function heroText(r, today) {
  if (r.live) return r.now ? `Yarışta · ${r.now}` : "Yarışta";
  if (r.today)
    return r.status === "ap"
      ? "Start ertelendi"
      : r.status === "done"
        ? "Gün bitti"
        : r.status === "none"
          ? "Bugün yarış yok"
          : r.at
            ? `Bugün · İlk start ${r.at}`
            : "Bugün";
  const n = daysTo(r.startDate, today);
  return n === 1 ? "Yarın" : `Yarışa ${n} gün`;
}
const tagText = (r, today) =>
  r.today
    ? statusText(r)
    : r.startDate < today
      ? ""
      : daysTo(r.startDate, today) === 1
        ? "Yarın"
        : `${daysTo(r.startDate, today)} gün`;

// Kayan logo şeridi: soft, tek renk, kenarlarda kaybolur; iki kopya yan yana kayar (dikiş görünmez)
function Logos() {
  const one = Array.from(
    { length: Math.max(3, Math.ceil(8 / LOGOLAR.length)) },
    () => LOGOLAR,
  ).flat();
  const half = (k) => (
    <div className="lh-mq-h" aria-hidden={k ? "true" : undefined} key={k}>
      {one.map((l, i) => (
        <span className="lh-logo" key={i}>
          {l.velora ? (
            <VeloraGlyph size={30} />
          ) : (
            <img
              src={l.img}
              alt=""
              width={34}
              height={34}
              draggable={false}
              className={l.duz ? "duz" : undefined}
            />
          )}
          <b>{l.ad}</b>
        </span>
      ))}
    </div>
  );
  return (
    <footer className="lh-mq" aria-label={LOGOLAR.map((l) => l.ad).join(", ")}>
      <div className="lh-mq-t">{[half(0), half(1)]}</div>
    </footer>
  );
}

// Yükleniyor: kartlar son boyutlarında soluk; üst kısım (logo) hemen görünür, yerleşim kaymaz
function HomeSkel() {
  return (
    <div role="status" aria-label="Yükleniyor">
      <div className="lh-sec sk">
        <i style={{ width: "7em" }} />
      </div>
      <div className="lh-card sk" aria-hidden="true">
        <i style={{ width: "8em", height: "1.6em" }} />
        <i style={{ width: "70%", height: "2.2em", marginTop: "0.9em" }} />
        <i style={{ width: "14em", marginTop: "0.9em" }} />
      </div>
      <div className="lh-sec sk">
        <i style={{ width: "6em" }} />
      </div>
      <div className="lh-list" aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <div key={k} className="lh-row sk">
            <span className="d" />
            <span className="nm">
              <i style={{ width: `${60 - k * 10}%` }} />
              <i style={{ width: "40%" }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveHome() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState(false);
  useVisit(""); // genel sayfanın ziyaretleri (Ayarlar › Yayın)
  // 20 sn'de bir yenilenir: süren yarış "Canlı" olarak anında görünsün
  useEffect(() => {
    let on = true;
    let t = 0;
    const load = () =>
      fetch("/api/canli", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fail"))))
        .then(
          (j) =>
            on && (setList(Array.isArray(j.list) ? j.list : []), setErr(false)),
        )
        .catch(() => on && setErr(true))
        .finally(() => on && (t = setTimeout(load, 20000)));
    load();
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, []);
  const today = trToday();
  const all = list || [];
  // Seyhun 2026-11-04 "hangi yarışlar canlı net olsun": süren yarışların hepsi en üstte büyük kartta; canlı yoksa sıradaki tek yarış büyük kartta
  const lives = all.filter((r) => r.live);
  const next = lives.length
    ? null
    : all.find((r) => r.today && r.status !== "done") ||
      all.find((r) => r.startDate >= today) ||
      null;
  const big = lives.length ? lives : next ? [next] : [];
  const rest = all.filter((r) => !big.includes(r));
  const coming = rest.filter(
    (r) => r.startDate >= today || (r.today && r.status !== "done"),
  );
  const over = rest.filter((r) => !coming.includes(r));
  // yarışın adı açılan ekranda yüklenirken hemen yazılsın (Seyhun 2026-11-03 "loading mantığı")
  const pre = (r) => {
    try {
      sessionStorage.setItem(
        PRE_KEY(r.id),
        JSON.stringify({ name: r.name || "" }),
      );
    } catch {
      /* özel pencere */
    }
  };
  const Card = ({ r, i }) => (
    <Link
      href={`/canli/${r.id}`}
      onClick={() => pre(r)}
      className={`lh-card${r.live ? " live" : ""}`}
      style={{ "--i": i }}
    >
      <div className="hl">
        {r.live ? <em className="lh-live">Canlı</em> : null}
        <span>{heroText(r, today)}</span>
      </div>
      <div className="hn">{r.name || "Yarış"}</div>
      <div className="hf">
        <div className="hm">
          <span>{[when(r), r.place].filter(Boolean).join(" · ")}</span>
          {r.wind && r.wind.kn != null ? (
            <span>{`Rüzgâr ${r.wind.kn} kn ${dirShort(r.wind.deg)}`}</span>
          ) : null}
          {r.at && !(r.today && !r.live) ? (
            <span>{`İlk start ${r.at}`}</span>
          ) : null}
        </div>
        <span className="go">{r.live ? "Canlı izle" : "Aç"}</span>
      </div>
    </Link>
  );
  const Row = ({ r, dim, i }) => (
    <Link
      href={`/canli/${r.id}`}
      onClick={() => pre(r)}
      className={`lh-row${dim ? " dn" : ""}`}
      style={{ "--i": i }}
    >
      <span className="d">
        <b>{new Date(`${r.startDate}T12:00:00`).getDate()}</b>
        <small>
          {new Date(`${r.startDate}T12:00:00`).toLocaleDateString("tr-TR", {
            month: "short",
          })}
        </small>
      </span>
      <span className="nm">
        <b>{r.name || "Yarış"}</b>
        <small>
          {[when(r), r.place, r.at ? `İlk start ${r.at}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>
      <span className={`tg${r.today ? " on" : ""}`}>
        {dim ? "Bitti" : tagText(r, today)}
      </span>
    </Link>
  );
  // durum: kaç yarış canlı (başlığın sağında, her zaman aynı yerde)
  const state = !list
    ? ""
    : lives.length
      ? `${lives.length} yarış canlı`
      : "Şu an canlı yarış yok";
  return (
    <div className="lv lh">
      <div className="lh-bg" aria-hidden="true">
        <div
          className="lh-photo"
          style={{ backgroundImage: `url(${BG_PHOTO})` }}
        />
        <i className="lh-glow a" />
        <i className="lh-glow b" />
        <i className="lh-grid" />
      </div>
      <div className="lh-page">
        <header className="lh-head">
          <span className="lh-brand">
            <VeloraGlyph size={34} />
            <span className="t">
              <b>Velora</b>
              <small>Canlı yayın</small>
            </span>
          </span>
          {state ? (
            <span className={`lh-state${lives.length ? " on" : ""}`}>
              {state}
            </span>
          ) : null}
        </header>
        {err && !list ? (
          <div className="lh-empty">Bağlanılamadı, yeniden deneniyor.</div>
        ) : !list ? (
          <HomeSkel />
        ) : !list.length ? (
          <div className="lh-empty">Şu an açık yarış yok.</div>
        ) : null}
        {big.length ? (
          <>
            <div className="lh-sec">
              {lives.length ? "Şu an canlı" : "Sıradaki yayın"}
            </div>
            <div className="lh-big">
              {big.map((r, i) => (
                <Card key={r.id} r={r} i={i} />
              ))}
            </div>
          </>
        ) : null}
        {coming.length ? (
          <>
            <div className="lh-sec">Yaklaşan</div>
            <div className="lh-list">
              {coming.map((r, i) => (
                <Row key={r.id} r={r} i={i} />
              ))}
            </div>
          </>
        ) : null}
        {over.length ? (
          <>
            <div className="lh-sec">Biten</div>
            <div className="lh-list">
              {over.map((r, i) => (
                <Row key={r.id} r={r} dim i={i} />
              ))}
            </div>
          </>
        ) : null}
        {/* Örnek yarış (Seyhun 2026-11-02 "örnek yarışı eklemek için bir buton"): ekranın baştan sona nasıl göründüğü, veriye dokunmaz */}
        <Link href="/canli/ornek" className="lh-demo">
          Örnek yarışı izle
        </Link>
      </div>
      <Logos />
    </div>
  );
}
