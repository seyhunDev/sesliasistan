import { authFetch } from "@/lib/authFetch";
import { parseCourseText } from "@/lib/raceCourse";

// Parkur ölçümü cümlesi: önce telefondaki kural, anlamazsa yapay zekâ (/api/course-parse). Dönüş { obs } | { pt } | { len } | { error }
export async function readCourseText(text) {
  const local = parseCourseText(text);
  if (local) return local;
  try {
    const res = await authFetch("/api/course-parse", { method: "POST", timeout: 7000, headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { error: d.error || "Anlaşılamadı" };
    return d.none ? { error: "Ölçümü anlayamadım. Örneğin: “orsada rüzgâr 330, 5 knot”" } : d;
  } catch {
    return { error: "Bağlantı yok, ölçümü elle ekle" };
  }
}

// Asistan, Parkur sekmesinde (Seyhun 2026-10-30): telefondaki kurallar anlamazsa yapay zekâ; birden çok ölçüm ve göreli cümle.
// last: { wind: { deg, kn }, axis }. Dönüş { items } | { none: true } | { error }
export async function askCourseAi(text, last) {
  try {
    const res = await authFetch("/api/course-parse", { method: "POST", timeout: 6000, headers: { "content-type": "application/json" }, body: JSON.stringify({ text, last }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { error: d.error || "Anlaşılamadı" };
    return d.none ? { none: true } : { items: d.items || [d] };
  } catch {
    return { error: "Bağlantı yok" };
  }
}
