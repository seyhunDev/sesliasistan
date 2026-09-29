"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";

const BTN = 84; // her eylem düğmesinin genişliği (px)
const FULL = 0.55; // satır genişliğinin bu kadarı kaydırılırsa son eylem (Sil) doğrudan çalışır
const EVT = "swiperow:open"; // bir satır açılınca diğerleri kapanır (aynı anda tek satır açık)

// Sola kaydırınca eylem düğmeleri çıkan satır (telefon için; iPhone Safari'ye göre yazıldı).
// actions: [{ label, icon, tone: "danger" | "neutral", onAction }]; son eylem tam kaydırmada çalışır.
// Dokunma olaylarıyla çalışır: yatay kaydırma kilitlenince sayfanın dikey kaymasını durdurur,
// dikey harekette hiç karışmaz. Açıkken satıra dokunmak önce kapatır.
export function SwipeRow({ actions, children }) {
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const [armed, setArmed] = useState(false);
  const row = useRef(null);
  const g = useRef(null); // o anki hareket
  const moved = useRef(false);
  const live = useRef({}); // olay dinleyicileri için güncel değerler
  const total = actions.length * BTN;
  const id = useId();

  const claim = () => window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
  const open = () => {
    claim();
    setX(-total);
  };
  const shut = () => setX(0);
  const run = (a) => {
    shut();
    a.onAction();
  };

  useEffect(() => {
    live.current = { x, total, last: actions[actions.length - 1], open, shut, run, claim };
  });

  // Bir satır açılınca bu satır kapanır
  useEffect(() => {
    const onOther = (e) => e.detail !== id && setX(0);
    window.addEventListener(EVT, onOther);
    return () => window.removeEventListener(EVT, onOther);
  }, [id]);

  // ---- Hareket ----
  useEffect(() => {
    const el = row.current;
    const begin = (cx, cy) => {
      g.current = { x0: cx, y0: cy, start: live.current.x, lock: null, w: el.offsetWidth, full: false };
      moved.current = false;
    };
    // true dönerse yatay kaydırma sürüyor (sayfa kaymasın)
    const moveTo = (cx, cy) => {
      const s = g.current;
      if (!s) return false;
      const dx = cx - s.x0;
      const dy = cy - s.y0;
      if (!s.lock) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
        s.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y"; // belirgin yatay değilse sayfa kaysın
        if (s.lock !== "x") return false;
        setDrag(true);
        live.current.claim();
      }
      if (s.lock !== "x") return false;
      moved.current = true;
      let nx = s.start + dx;
      if (nx > 0) nx /= 4; // sağa doğru dirençli
      nx = Math.max(nx, -s.w);
      const full = -nx > s.w * FULL;
      if (full !== s.full) {
        s.full = full;
        setArmed(full);
        if (full) navigator.vibrate?.(8); // Android'de hafif titreşim (iPhone desteklemez)
      }
      setX(nx);
      return true;
    };
    const end = () => {
      const s = g.current;
      g.current = null;
      if (!s || s.lock !== "x") return;
      setDrag(false);
      setArmed(false);
      const L = live.current;
      if (s.full) {
        // Tam kaydırma: satır dışarı kayar, ardından son eylem çalışır
        setX(-s.w);
        setTimeout(() => L.run(L.last), 160);
        return;
      }
      // Bırakıldığı yere göre: yarıdan fazla açıldıysa açık kalır
      if (-L.x > L.total / 2) L.open();
      else L.shut();
    };

    // Dokunma (iPhone / Android)
    const ts = (e) => e.touches.length === 1 && begin(e.touches[0].clientX, e.touches[0].clientY);
    const tm = (e) => {
      if (e.touches.length !== 1) return;
      if (moveTo(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false }); // yatay kaydırmada sayfayı durdurabilmek için
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);

    // Fare (bilgisayarda da denenebilsin)
    const md = (e) => {
      if (e.button !== 0) return;
      begin(e.clientX, e.clientY);
      const mm = (ev) => moveTo(ev.clientX, ev.clientY);
      const mu = () => {
        end();
        window.removeEventListener("mousemove", mm);
        window.removeEventListener("mouseup", mu);
      };
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
    };
    el.addEventListener("mousedown", md);

    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("mousedown", md);
    };
  }, []);

  // Kaydırma sonrası tıklamayı yut; açıkken dokunuş yalnızca kapatır
  function clickCapture(e) {
    if (moved.current || x !== 0) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
      if (x !== 0) shut();
    }
  }

  // Arkadaki düğmeler yalnızca açılan genişlik kadar çizilir: kapalıyken genişlik 0 olduğundan
  // kaydırma/klavye sırasında (iPhone'da katmanlar bir an kayınca) hiçbir şey arkadan görünmez.
  const open_ = Math.max(0, -x);
  const ease = drag ? "" : "transition-[width] duration-200 ease-out";
  const fade = Math.min(1, Math.max(0, (open_ - 16) / (total - 16))); // yazı ve simge açıldıkça belirir
  return (
    <div
      ref={row}
      // select-none + touch-callout: iPhone'da basılı tutunca metin seçimi / paylaş balonu çıkmasın
      // isolate: Safari'de kayan satır yuvarlak köşelerin dışına taşmasın
      className="relative isolate select-none overflow-hidden [-webkit-touch-callout:none]"
      style={{ touchAction: "pan-y" }}
      onContextMenu={(e) => {
        e.preventDefault();
        open();
      }}
    >
      {/* Arkadaki eylem düğmeleri: satırın açılan kısmını tam doldurur */}
      <div className={`absolute inset-y-0 right-0 flex overflow-hidden ${ease}`} style={{ width: open_ }} aria-hidden={x === 0}>
        {actions.map((a, i) => {
          const isLast = i === actions.length - 1;
          if (armed && !isLast) return null; // tam kaydırmada yalnızca son eylem kalır ve büyür
          return (
            <button
              key={a.label}
              type="button"
              tabIndex={x === 0 ? -1 : 0}
              onClick={() => run(a)}
              className={`flex min-w-0 flex-1 items-center overflow-hidden text-white ${a.tone === "danger" ? "bg-rec" : "bg-mut"} ${
                armed ? "justify-start pl-6" : "justify-center"
              }`}
            >
              {/* Tam kaydırmada simge satırın kenarına yapışık gelir (iPhone Mail gibi) */}
              <span className="flex shrink-0 flex-col items-center justify-center gap-1 text-[12px] font-semibold leading-none" style={{ width: BTN, opacity: armed ? 1 : fade }}>
                <Icon name={a.icon} className="size-5" />
                {a.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Satırın kendisi */}
      <div
        onClickCapture={clickCapture}
        className={`relative bg-card ${drag ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ transform: x ? `translate3d(${x}px,0,0)` : "none" }}
      >
        {children}
      </div>
    </div>
  );
}
