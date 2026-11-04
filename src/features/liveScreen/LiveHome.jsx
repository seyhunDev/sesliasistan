"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dirShort } from "@/lib/raceLive";
import { VeloraGlyph } from "@/components/ui/AppLogo";
import { BG_PHOTO, PRE_KEY, Sea } from "./LiveScreen";
import { useVisit } from "./useVisit";
import "./liveScreen.css";

// Herkese açık genel sayfa /canli (Seyhun 2026-11-01 "bir tane genel kullanıcı arayüzü yap"): açık yarışların listesi (/api/canli id'siz).
// Yeni düzen (Seyhun 2026-11-03 örnek F, yayin-tasarim/oncesi-yeni/F-canli-liste.png): süren yarış büyük kartta (Canlı, durum, tarih ve yer,
// rüzgâr, sıradaki start, İzle); canlı yoksa en yakın yarış "Yarışa N gün" ve ilk start'la; altında Yaklaşan ve Biten listeleri.
const dayText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const when = (r) => (r.endDate && r.endDate !== r.startDate ? `${dayText(r.startDate)} – ${dayText(r.endDate)}` : dayText(r.startDate));
const trToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const daysTo = (d, today) => Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5);
const statusText = (r) => (r.status === "ap" ? "Ertelendi" : r.status === "none" ? "Bugün yarış yok" : r.status === "done" ? "Gün bitti" : "Bugün");
// kart durumu: süren yarış / bugün start bekleniyor / yarışa N gün
function heroText(r, today) {
  if (r.live) return r.now ? `Yarışta · ${r.now}` : "Yarışta";
  if (r.today) return r.status === "ap" ? "Start ertelendi" : r.status === "done" ? "Gün bitti" : r.status === "none" ? "Bugün yarış yok" : r.at ? `Bugün · İlk start ${r.at}` : "Bugün";
  const n = daysTo(r.startDate, today);
  return n === 1 ? "Yarın" : `Yarışa ${n} gün`;
}
const tagText = (r, today) => (r.today ? statusText(r) : r.startDate < today ? "" : daysTo(r.startDate, today) === 1 ? "Yarın" : `${daysTo(r.startDate, today)} gün`);

// Yükleniyor: büyük kart ve satırlar son boyutlarında soluk (veri gelince yerleşim kaymaz)
function HomeSkel() {
  return (
    <div role="status" aria-label="Yükleniyor">
      <div className="lv-hero sk" aria-hidden="true">
        <div className="hl">
          <i style={{ width: "9em" }} />
        </div>
        <div className="hn">
          <i style={{ width: "60%" }} />
        </div>
        <div className="hm">
          <i style={{ width: "14em" }} />
        </div>
      </div>
      <div className="lv-hsec">
        <i className="sk" style={{ width: "6em" }} />
      </div>
      <div className="lv-hlist" aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <div key={k} className="lv-row lv-hrow sk">
            <span className="d" />
            <span className="nm">
              <i style={{ width: `${55 - k * 10}%` }} />
              <i style={{ width: "40%" }} />
            </span>
            <span className="tg" />
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
        .then((j) => on && (setList(Array.isArray(j.list) ? j.list : []), setErr(false)))
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
  // büyük kart: süren yarış, yoksa bugünkü, yoksa en yakın gelecek yarış
  const hero = all.find((r) => r.live) || all.find((r) => r.today && r.status !== "done") || all.find((r) => r.startDate >= today) || null;
  const rest = all.filter((r) => r !== hero);
  const coming = rest.filter((r) => r.startDate >= today || (r.today && r.status !== "done"));
  const over = rest.filter((r) => !coming.includes(r));
  // yarışın adı açılan ekranda yüklenirken hemen yazılsın (Seyhun 2026-11-03 "loading mantığı")
  const pre = (r) => {
    try {
      sessionStorage.setItem(PRE_KEY(r.id), JSON.stringify({ name: r.name || "" }));
    } catch {
      /* özel pencere */
    }
  };
  const Row = ({ r, dim }) => (
    <Link href={`/canli/${r.id}`} onClick={() => pre(r)} className={`lv-row lv-hrow${dim ? " dn" : ""}`}>
      <span className="d">
        <b>{new Date(`${r.startDate}T12:00:00`).getDate()}</b>
        <small>{new Date(`${r.startDate}T12:00:00`).toLocaleDateString("tr-TR", { month: "short" })}</small>
      </span>
      <span className="nm">
        {r.name || "Yarış"}
        <small>{[when(r), r.place, r.at ? `İlk start ${r.at}` : ""].filter(Boolean).join(" · ")}</small>
      </span>
      <span className={`tg${r.today ? " on" : ""}`}>{tagText(r, today)}</span>
    </Link>
  );
  // Velora markası (Seyhun 2026-11-04 "Velora kullanıyoruz, logomuzu kullanmalıyız; arka planı daha güzel; loading yeni tasarımla"):
  // yayın ekranının sağ altındaki gibi V daire + Velora | Canlı yayın; zemin bulanık yarış fotoğrafı üstünde lacivert, tek mavi vurgu, kırmızı yalnız Canlı
  return (
    <div className="lv lv-hm">
      <Sea photo={BG_PHOTO} />
      <div className="lv-page lv-homep">
        <header className="lv-hhead">
          <VeloraGlyph size={34} />
          <span className="t">
            <b>Velora</b>
            <small>Canlı yayın</small>
          </span>
        </header>
        {err && !list ? (
          <div className="lv-empty">Bağlanılamadı, yeniden deneniyor.</div>
        ) : !list ? (
          <HomeSkel />
        ) : !list.length ? (
          <div className="lv-empty">Şu an açık yarış yok.</div>
        ) : null}
        {hero ? (
          <Link href={`/canli/${hero.id}`} onClick={() => pre(hero)} className={`lv-hero${hero.live ? " live" : ""}`}>
            <div className="hl">
              {hero.live ? <em className="lv-live">Canlı</em> : null}
              <span>{heroText(hero, today)}</span>
            </div>
            <div className="hn">{hero.name || "Yarış"}</div>
            <div className="hm">
              <span>{[when(hero), hero.place].filter(Boolean).join(" · ")}</span>
              {hero.wind && hero.wind.kn != null ? <span>{`Rüzgâr ${hero.wind.kn} kn ${dirShort(hero.wind.deg)}`}</span> : null}
              {hero.live && hero.at ? <span>{`İlk start ${hero.at}`}</span> : !hero.live && !hero.today && hero.at ? <span>{`İlk start ${hero.at}`}</span> : null}
            </div>
            <span className="go">İzle ›</span>
          </Link>
        ) : null}
        {coming.length ? (
          <>
            <div className="lv-hsec">Yaklaşan</div>
            <div className="lv-hlist">{coming.map((r) => <Row key={r.id} r={r} />)}</div>
          </>
        ) : null}
        {over.length ? (
          <>
            <div className="lv-hsec">Biten</div>
            <div className="lv-hlist">{over.map((r) => <Row key={r.id} r={r} dim />)}</div>
          </>
        ) : null}
        {/* Örnek yarış (Seyhun 2026-11-02 "örnek yarışı eklemek için bir buton"): ekranın baştan sona nasıl göründüğü, veriye dokunmaz */}
        <Link href="/canli/ornek" className="lv-demol">
          Örnek yarışı izle
        </Link>
      </div>
    </div>
  );
}
