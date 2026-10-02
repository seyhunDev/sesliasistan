"use client";

// Yarış adları hafızası: zor yazılan adlar ("D'Azur Optimist Regatta") bir kez kaydedilince
// ses tanımaya ipucu olarak gider, asistan yeni yarışta aynı yazımı kullanır, yarış adı kutusunda öneri olarak çıkar.
// Kaynak: kayıtlı yarışlar (yüklendikçe ve kaydedildikçe bu cihazda saklanır).
const KEY = "raceNames";
const MAX = 40;

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

// En son kullanılan önde
export function rememberRaceNames(names) {
  const add = names.map((n) => String(n || "").trim().replace(/\s+/g, " ")).filter(Boolean);
  if (!add.length) return;
  const key = (n) => n.toLocaleLowerCase("tr-TR");
  const seen = new Set();
  const list = [...add, ...read()].filter((n) => !seen.has(key(n)) && seen.add(key(n))).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export const raceNames = () => (typeof window === "undefined" ? [] : read());
