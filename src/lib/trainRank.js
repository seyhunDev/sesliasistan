// Antrenmanın genel sıralaması (Seyhun 2026-11-05 "yoklamadaki sporcularla derecelendirme devam etsin, bir genel sıralama da oluşturalım"):
// ayın antrenman planlarındaki "yarış olarak sayılan" (cnt) ve sonucu girilmiş startlar tek puan durumunda (lib/raceScore.js standings:
// düşük puan, 4 yarıştan sonra en kötü sonuç atılır). Katılan = bu yarışlara giren herkes; girmediği yarış DNC sayılır.
import { places, standings } from "@/lib/raceScore";

// month "2026-11"; plans: bütün planlar (antrenman olmayanların yarışı yoktur). Dönüş standings + rows[].n (girdiği yarış sayısı)
export function monthRank(plans, month) {
  const list = (plans || [])
    .filter((p) => typeof p?.date === "string" && p.date.startsWith(month) && Array.isArray(p.races))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .flatMap((p) => p.races.filter((r) => r?.cnt && r.finishes?.length).map((r) => ({ ...r, id: `${p.id}:${r.id}`, day: p.date })));
  const t = standings(list, []);
  for (const r of t.rows) r.n = r.cells.filter((c) => c.code !== "DNC").length;
  return t;
}

// Bir günün yarışlarında sporcunun yerleri: "1 · 2 · DNF" (yarışa girmediyse boş)
export function dayPlaces(races, id) {
  return (races || [])
    .filter((r) => r.finishes?.length)
    .map((r) => {
      const f = r.finishes.find((x) => x.id === id);
      return f ? f.code || String(places(r)[id]) : "";
    })
    .filter(Boolean)
    .join(" · ");
}

export const monthName = (month) => new Date(`${month}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
