"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sea } from "./LiveScreen";
import "./liveScreen.css";

// Herkese açık genel sayfa /canli (Seyhun 2026-11-01 "bir tane genel kullanıcı arayüzü yap, kullanıcıyı oraya yönlendirelim"):
// açık yarışların listesi (/api/canli id'siz), her satır o yarışın canlı ekranına gider. Silinen yarışın linki buraya düşer.
const dayText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const when = (r) => (r.endDate && r.endDate !== r.startDate ? `${dayText(r.startDate)} – ${dayText(r.endDate)}` : dayText(r.startDate));

export function LiveHome() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let on = true;
    fetch("/api/canli", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fail"))))
      .then((j) => on && setList(Array.isArray(j.list) ? j.list : []))
      .catch(() => on && setErr(true));
    return () => {
      on = false;
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
          {err ? (
            <div className="lv-empty">Bağlanılamadı.</div>
          ) : !list ? (
            <div className="lv-empty">Yükleniyor</div>
          ) : !list.length ? (
            <div className="lv-empty">Şu an açık yarış yok.</div>
          ) : (
            list.map((r) => (
              <Link key={r.id} href={`/canli/${r.id}`} className="lv-row">
                <b>{r.name || "Yarış"}</b>
                <span>{[when(r), r.place].filter(Boolean).join(" · ")}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
