"use client";

import { useEffect, useState } from "react";
import { SIMULATOR_URL, sailingToken } from "@/lib/externalLinks";

// Velora Sailing'den kayıt/giriş için gelen kişiyi geldiği Sailing sayfasına geri gönderir (Seyhun 2026-11-24: "Velora Sailing
// linki gönderiyorum; kayıtlı değilse önce Velora'ya kaydolsun, sonra Velora Sailing'e dönsün").
// Sailing giriş ekranı buraya /register?sailing=<yol> ya da /login?sailing=<yol> ile gelir (<yol> = Sailing'deki adres, ör.
// "/sim.html?x=1#ia1-port"). Yol bu cihazda 2 saat saklanır (kayıt sırasında sayfa yenilense de kaybolmaz). Oturum açılınca
// /api/sailing-giris anahtarıyla Sailing'e dönülür: SAILING/<yol>#t=ANAHTAR&h=<asıl #>. Sailing anahtarı siler, asıl #'yi geri koyar.
const KEY = "velora.sailingReturn";
const TTL = 2 * 60 * 60 * 1000;
let busy = false; // kayıt sürerken (profil belgesi yazılmadan) yönlendirme beklesin
let going = false;

// Yalnız Sailing sitesi içinde göreli yol ("/..."); başka siteye yönlendirme yapılamaz
const safe = (p) => typeof p === "string" && p.length < 600 && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\");

function remember() {
  try {
    const p = new URLSearchParams(window.location.search).get("sailing");
    if (p != null && safe(p)) localStorage.setItem(KEY, JSON.stringify({ p, at: Date.now() }));
  } catch {}
}

export function pendingSailingReturn() {
  if (typeof window === "undefined") return null;
  remember();
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || "null");
    if (x && safe(x.p) && Date.now() - x.at < TTL) return x.p;
    localStorage.removeItem(KEY);
  } catch {}
  return null;
}

export function clearSailingReturn() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// Giriş/kayıt ekranları için: Sailing'den gelindiyse yol, yoksa null (sunucu çiziminde null)
export function useSailingReturn() {
  const [p, setP] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setP(pendingSailingReturn());
  }, []);
  return p;
}

export const sailingBusy = (v) => {
  if (v === undefined) return busy;
  busy = v;
};

// Sailing'deki adresi kur: yol + sorgu, anahtar ve asıl # ayrı ayrı # kısmında
export function sailingReturnUrl(path, token) {
  const base = SIMULATOR_URL.replace(/\/$/, "");
  const i = path.indexOf("#");
  const main = i < 0 ? path : path.slice(0, i);
  const hash = i < 0 ? "" : path.slice(i + 1);
  if (!token) return base + path;
  return `${base}${main}#t=${encodeURIComponent(token)}${hash ? "&h=" + encodeURIComponent(hash) : ""}`;
}

// Oturum açık: anahtarı al ve Sailing'e dön. true = yönlendirme başladı
export async function goToSailing() {
  const p = pendingSailingReturn();
  if (!p || going) return !!p;
  going = true;
  const t = await sailingToken();
  clearSailingReturn();
  window.location.replace(sailingReturnUrl(p, t));
  return true;
}
