// Velora'nın ortak fitness verisi (Seyhun 2026-11-27, örnek onaylı): ana hesabın (Velora sahibi) hareket kütüphanesi ve
// hazır programları uygulamayı kullanan herkese salt okunur gider. Kaynak orgs/{velora}/fitLib/main ve
// orgs/{velora}/fitHazir/{id} ({ title, sub, sport, prog, at }); sunucu okur (/api/fitness-ortak), kural değişmez.
// Hazır programlar: koddaki TEMPLATES + ana hesabın "Hazır programlar" sayfasından yayınladıkları.
import { cleanProgram } from "./model";
import { TEMPLATES } from "./templates";

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Yayınlanan program: kişiye ait alanlar (kimin için, yaş, başlangıç) atılır
export function cleanHazir(v = {}, id = "") {
  const prog = cleanProgram({ ...(v.prog || {}), start: "" });
  if (!prog.days.length) return null;
  const title = S(v.title, 60) || prog.title;
  return { id: S(id || v.id, 80), title, sub: S(v.sub, 160), sport: S(v.sport, 24), prog: { ...prog, title }, at: Number(v.at) || 0 };
}

// Hazır programların hepsi: koddakiler önce, sonra yayınlananlar (yeniden eskiye); aynı kimlik bir kez
export function hazirList(published = []) {
  const seen = new Set(TEMPLATES.map((t) => t.id));
  const pub = (published || [])
    .filter((t) => t?.id && t.prog?.days?.length && !seen.has(t.id) && seen.add(t.id))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  return [...TEMPLATES, ...pub];
}

// Kartta gösterilenler: hafta, gün sayısı, yer
export function hazirOzet(t) {
  const p = t?.prog || {};
  return { weeks: p.weeks || 0, days: (p.days || []).length, place: p.place || "" };
}
