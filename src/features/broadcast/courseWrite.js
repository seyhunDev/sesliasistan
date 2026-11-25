// Sesle parkurun yazımı (Seyhun 2026-11-05 "canlı ekranda da sesle de olmalı"): Yayın › Parkur ve /canli (LiveStart) aynı kuralla yazar.
// r: courseVoice dönüşü { grpCards, route, type, list, len }; rows: [[sınıf, grup]] (plan.sets); putCards({ cards, by }) ve
// putObs(list, len) kaydeder. Dönüş: söylenecek özet [{ t, s, k, miss }]; hiçbir şey yazılamadıysa fırlatır.
import { CARD_TYPES, cardKey, cleanObs, obsTitle } from "@/lib/raceCourse";
import { routeText } from "@/lib/courseScene";

export async function writeCourseVoice(r, { course, rows, putCards, putObs, now = Date.now() }) {
  const said = [];
  const miss = [];
  let by = course.by;
  for (const gc of r.grpCards || []) {
    const row = rows.find(([, g]) => g === gc.grp);
    if (!row) miss.push(`${gc.grp} grubu bu yarışta yok`);
    else if (!course.cards.some((k) => k.id === gc.card)) miss.push(`Kart ${gc.card} yok`);
    else {
      by = { ...by, [cardKey(row[0], row[1])]: gc.card };
      said.push({ t: `${gc.grp} → Kart ${gc.card}`, k: "grp" });
    }
  }
  if (r.route || r.type || by !== course.by) {
    const cards = course.cards.map((k) => (k.id === course.sel ? { ...k, ...(r.route ? { route: r.route } : {}), ...(r.type ? { type: r.type } : {}) } : k));
    await putCards({ cards, by });
    if (r.route || r.type) said.push({ t: [r.type ? CARD_TYPES[r.type].split(" ")[0] : "", r.route ? `rota ${routeText(r.route)}` : ""].filter(Boolean).join(" · "), s: `Kart ${course.sel}`, k: "route" });
  }
  if (r.list?.length || r.len) {
    const list = (r.list || []).map((o, i) => cleanObs({ ...o, at: new Date(now + i).toISOString() })).filter(Boolean);
    await putObs(list, r.len || null);
    for (const o of list) said.push({ t: `${obsTitle(o)} ${o.range ? `${o.range[0]}–${o.range[1]}°` : `${o.deg}°`}${o.kn != null ? ` · ${o.kn} kn` : ""}`, s: o.gust != null ? `sağanak ${o.gust}` : "", k: o.kind });
    if (r.len) said.push({ t: `Orsa ayağı ${r.len.orsa} m`, k: "len" });
  }
  if (!said.length && miss.length) throw new Error(`${miss.join(", ")}.`);
  return [...said, ...miss.map((t) => ({ t, miss: true }))];
}
