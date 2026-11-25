"use client";

import { useEffect } from "react";
import { PING_MIN } from "@/lib/visitStats";

// Herkese açık /canli sayfalarının isimsiz ziyaret haberi (Seyhun 2026-11-02; özet Ayarlar › Yayın). Açılışta bir haber,
// sayfa görünürken PING_MIN dakikada bir, sayfa gizlenince/kapanınca son haber (sendBeacon). Süre yalnız görünür zamanı sayar.
// Tıklamalar belge düzeyinde dinlenir: düğmenin aria-label'ı ya da yazısı iş adı olur (lib/visitStats actName).
// Kimlik yok: tarayıcıda rastgele bir v (geri gelen ziyaretçiyi tanımak için), IP saklanmaz. Örnek yarış (/canli/ornek) sayılmaz.
const rid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
const trDay = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

function visitor() {
  try {
    const old = localStorage.getItem("lv-v");
    if (old) return { v: old, ret: true };
    const v = rid();
    localStorage.setItem("lv-v", v);
    return { v, ret: false };
  } catch {
    return { v: rid(), ret: false };
  }
}

export function useVisit(race = "") {
  useEffect(() => {
    if (race === "ornek" || typeof window === "undefined") return;
    const { v, ret } = visitor();
    const s = rid();
    const d = trDay();
    const ev = {};
    let n = 0;
    let shown = document.visibilityState === "visible" ? performance.now() : 0;
    let dur = 0;
    const q = new URLSearchParams(location.search);
    const base = { s, v, r: race, d, ret, ref: document.referrer || "", utm: q.get("utm_source") || "", w: Math.round(screen.width || window.innerWidth || 0) };
    const seen = () => dur + (shown ? (performance.now() - shown) / 1000 : 0);
    const send = (end = false) => {
      const body = JSON.stringify({ ...base, n: n++, dur: Math.round(seen()), ev, end });
      try {
        if (end && navigator.sendBeacon?.("/api/canli-iz", new Blob([body], { type: "text/plain" }))) return;
      } catch {}
      fetch("/api/canli-iz", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
    };
    const onClick = (e) => {
      const el = e.target?.closest?.("button, a");
      if (!el) return;
      let label = el.getAttribute("aria-label") || el.textContent || "";
      if (el.tagName === "A" && /[?&]y=/.test(el.getAttribute("href") || "")) label = "Önceki yarış";
      label = label.replace(/\s+/g, " ").trim().slice(0, 40);
      if (label && (label in ev || Object.keys(ev).length < 20)) ev[label] = (ev[label] || 0) + 1;
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        if (!shown) shown = performance.now();
        send();
      } else {
        dur = seen();
        shown = 0;
        send(true);
      }
    };
    const onHide = () => {
      dur = seen();
      shown = 0;
      send(true);
    };
    send();
    const t = setInterval(() => document.visibilityState === "visible" && send(), PING_MIN * 60e3);
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(t);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      if (shown || dur) onHide();
    };
  }, [race]);
}
