"use client";

// Tekne konumu oynatma denetimi (Seyhun 2026-11-06 "durdurma, geri alma ya da canlıysa canlı takip; yakınlaştırma, uzaklaştırma"):
// (dosya adı boatStore: BoatCtl.jsx ile Mac'te karışmasın) canlı ekranın arkasındaki BoatRace ile alttaki BoatCtl şeridi bu küçük depoyu paylaşır. Yalnız bu telefonda, yayına gitmez.
//   live: true → canlı (yarışın şu anı); false → kayıttan: t (ms, start'a göre) w (o andaki performance.now), playing
//   zk: kullanıcının yakınlığı (1 = kendiliğinden), focus: kesitin baktığı yer { lat, lon, span }
//   info: oynatıcının bildirdiği kesitler ve veri aralığı; cur: oynatıcının son çizdiği an (bildirim yapmaz)
import { useSyncExternalStore } from "react";

const BASE = { live: true, t: 0, w: 0, playing: true, zk: 1, focus: null, info: { cuts: [], t0: 0, t1: 0 } };
let st = BASE;
const subs = new Set();
const now = () => (typeof performance !== "undefined" ? performance.now() : 0);

export const boatCtl = {
  get: () => st,
  sub: (f) => (subs.add(f), () => subs.delete(f)),
  set(p) {
    st = { ...st, ...p };
    subs.forEach((f) => f());
  },
  cur: 0,
  // kayıttan oynatmada şu anki an
  at(s = st) {
    if (s.live) return boatCtl.cur;
    const t = s.playing ? s.t + (now() - s.w) : s.t;
    return Math.max(s.info.t0, Math.min(s.info.t1, t));
  },
  reset(info) {
    st = { ...BASE, info: info || BASE.info };
    subs.forEach((f) => f());
  },
  seek(t, extra = {}) {
    boatCtl.set({ live: false, t: Math.max(st.info.t0, Math.min(st.info.t1, t)), w: now(), playing: true, ...extra });
  },
  back(ms) {
    boatCtl.seek(boatCtl.at() - ms, { focus: null, playing: st.live ? true : st.playing });
  },
  toggle() {
    const t = boatCtl.at();
    boatCtl.set({ live: false, t, w: now(), playing: st.live ? false : !st.playing });
  },
  goLive() {
    boatCtl.set({ live: true, focus: null, zk: 1, playing: true });
  },
  zoom(k) {
    boatCtl.set({ zk: Math.max(0.4, Math.min(5, st.zk * k)) });
  },
};

export const useBoatCtl = () => useSyncExternalStore(boatCtl.sub, boatCtl.get, () => BASE);
