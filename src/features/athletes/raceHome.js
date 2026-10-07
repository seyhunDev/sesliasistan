"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "./access";
import { isPast } from "./RaceList";
import { loadRaces, stepsOf } from "./races";
import { todayStr } from "@/lib/utils/format";

// Ana sayfadaki Yarışlar kartı: sporcu yetkisi olanlarda kendiliğinden görünür, Ayarlar'dan kapatılır (users/{uid}.races = "off").
// Yalnız sporcu yetkisi olanlar (yarışlar kulübün sporcu verisine bağlı).
// Kartta sıradaki yarışın kısa bilgisi de görünür: "Foça · 5 gün · 2 iş" (nextInfo).
// Yaklaşan yarış sayısı oturumda 5 dakika saklanır; yarış yoksa saklanmaz (ilk yarış eklenince sayı hemen gelsin)
let cache = null; // { orgId, at, p }

const gap = (s) => Math.round((Date.parse(`${s}T12:00:00`) - Date.parse(`${todayStr()}T12:00:00`)) / 864e5);

// Tarihi en yakın yaklaşan (ya da süren) yarış: { name (ilçe ya da adın ilk kelimesi), when, left (bitmemiş iş) }
export function nextInfo(list) {
  const r = list.filter((x) => x.startDate && !isPast(x)).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (!r) return null;
  const a = gap(r.startDate);
  const when = a > 1 ? `${a} gün` : a === 1 ? "yarın" : a === 0 ? "bugün" : "sürüyor";
  return { name: r.district || String(r.name || "").split(" ")[0] || "Yarış", when, left: stepsOf(r).length };
}

function countRaces(orgId) {
  if (!cache || cache.orgId !== orgId || Date.now() - cache.at > 5 * 60e3) {
    const p = loadRaces(orgId)
      .then((list) => ({ all: list.length, up: list.filter((r) => !isPast(r)).length, next: nextInfo(list) }))
      .catch(() => null)
      .then((c) => {
        if (!c?.all && cache?.p === p) cache = null;
        return c;
      });
    cache = { orgId, at: Date.now(), p };
  }
  return cache.p;
}

// Açılış ekranı sürerken okumayı başlatır (DataProvider); ana sayfa aynı isteği (cache.p) kullanır
export function prefetchRaces(profile) {
  if (canSeeAthletes(profile?.email) && profile?.orgId && profile.races !== "off") countRaces(profile.orgId);
}

export function useRaceHome() {
  const { profile } = useAuth();
  const allowed = canSeeAthletes(profile?.email) && !!profile?.orgId;
  const on = allowed && profile?.races !== "off";
  const [n, setN] = useState(null);

  useEffect(() => {
    if (!on) return;
    let live = true;
    countRaces(profile.orgId).then((c) => {
      if (live) setN(c || {}); // okunamazsa da "yükleniyor" bitsin
    });
    return () => {
      live = false;
    };
  }, [on, profile?.orgId]);

  return {
    allowed,
    on,
    up: on ? n?.up || 0 : 0,
    next: on ? n?.next || null : null,
    loading: on && n === null,
    set: (on) => updateDoc(doc(db, "users", profile.uid), { races: on ? "on" : "off" }),
  };
}
