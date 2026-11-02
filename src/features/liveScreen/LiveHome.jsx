"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sea } from "./LiveScreen";
import { useVisit } from "./useVisit";
import "./liveScreen.css";

// Herkese açık genel sayfa /canli (Seyhun 2026-11-01 "bir tane genel kullanıcı arayüzü yap, kullanıcıyı oraya yönlendirelim"):
// açık yarışların listesi (/api/canli id'siz), her satır o yarışın canlı ekranına gider. Silinen yarışın linki buraya düşer.
const dayText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const when = (r) => (r.endDate && r.endDate !== r.startDate ? `${dayText(r.startDate)} – ${dayText(r.endDate)}` : dayText(r.startDate));

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
  return (
    <div className="lv">
      <Sea />
      <div className="lv-page">
        <header className="lv-head">
          <div className="lv-ttl">
            <b>Canlı yarışlar</b>
            <span>Velora</span>
          </div>
        </header>
        <div className="lv-card lv-home">
          {err && !list ? (
            <div className="lv-empty">Bağlanılamadı.</div>
          ) : !list ? (
            <div className="lv-empty">Yükleniyor</div>
          ) : !list.length ? (
            <div className="lv-empty">Şu an açık yarış yok.</div>
          ) : (
            list.map((r) => (
              <Link key={r.id} href={`/canli/${r.id}`} className={`lv-row${r.live ? " live" : ""}`}>
                <b>
                  {r.name || "Yarış"}
                  {r.live ? <em className="lv-live">Canlı</em> : r.today ? <em className="lv-tag">{r.status === "ap" ? "Ertelendi" : r.status === "none" ? "Bugün yarış yok" : r.status === "done" ? "Gün bitti" : "Bugün"}</em> : null}
                </b>
                <span>{[when(r), r.place].filter(Boolean).join(" · ")}</span>
              </Link>
            ))
          )}
        </div>
        {/* Örnek yarış (Seyhun 2026-11-02 "örnek yarışı eklemek için bir buton"): ekranın baştan sona nasıl göründüğü, veriye dokunmaz */}
        <Link href="/canli/ornek" className="lv-btn lv-demob">
          Örnek yarışı izle
        </Link>
      </div>
    </div>
  );
}
