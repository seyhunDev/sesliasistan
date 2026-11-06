// Kameralar ve gruplar (Seyhun 2026-11-02 "Kamera 1 ile birinci, üçüncü grubu, Kamera 2 ile ikinci, dördüncü grubu çekebilirim"; örnek
// yayin-tasarim/gruplar-kamera/grup-a.png onaylandı). Kaynak listesi drone bölümünündür (stream.sources [{ id, name, kind, url }]; yoksa
// eski tek alanlar: stream.url = Kamera 1, stream.drone = Drone 1). Burada yalnız bağlantı: raceLive.camBy { "sınıf|grup": kaynak id }
// ve ekranda gösterilen yarış: raceLive.onAir { sid } (boşsa en son başlayan yarış, eskisi gibi).
import { cardKey } from "@/lib/raceCourse";

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const S = (v, n) => String(v ?? "").trim().slice(0, n);

// Kaynaklar: yeni liste varsa o, yoksa eski canlı yayın ve drone bağlantıları
export function sourcesOf(stream) {
  if (Array.isArray(stream?.sources) && stream.sources.length)
    return stream.sources.filter((x) => x && ID.test(x.id || "")).map((x) => ({ id: x.id, name: S(x.name, 30) || x.id, kind: S(x.kind, 10), url: S(x.url, 200), ...(x.auto === true ? { auto: true } : {}), ...(x.from ? { from: S(x.from, 10) } : {}) }));
  return [
    { id: "c1", name: "Kamera 1", kind: "camera", url: S(stream?.url, 200) },
    { id: "d1", name: "Drone 1", kind: "drone", url: S(stream?.drone, 200) },
  ];
}

// { "Optimist|Sarı": "c1" } (en çok 40 grup)
export function cleanCamBy(o) {
  const out = {};
  for (const [k, v] of Object.entries(o && typeof o === "object" ? o : {}).slice(0, 40)) {
    if (/^[^|]{0,30}\|[^|]{0,20}$/.test(k) && ID.test(String(v || ""))) out[k] = String(v);
  }
  return out;
}
export const cleanOnAir = (o) => ({ sid: ID.test(o?.sid || "") ? o.sid : "" });

// Grubun kamerası (sınıf+grup, yoksa sınıfın tümü)
export const camOf = (camBy, cls, grp) => camBy?.[cardKey(cls, grp)] || camBy?.[cardKey(cls, "")] || "";
// Kamera hangi grupları çekiyor: ["Optimist|Sarı", …]
export const groupsOf = (camBy, src) => Object.entries(camBy || {}).filter(([, v]) => v === src).map(([k]) => k);
// Kameraya grupları bağla: seçilenler bu kameraya, seçilmeyen ve bu kameradakiler çözülür
export function bindCam(camBy, src, keys) {
  const out = { ...(camBy || {}) };
  for (const [k, v] of Object.entries(out)) if (v === src && !keys.includes(k)) delete out[k];
  for (const k of keys) out[k] = src;
  return cleanCamBy(out);
}

// Ekranda gösterilecek yarış: seçilen (geçerliyse) ya da varsayılan (en son başlayan)
export function onAirStart(starts, onAir, fallback) {
  const s = onAir?.sid ? (starts || []).find((x) => x.id === onAir.sid && !x.void) : null;
  return s || fallback || null;
}

// Canlı ekranın videosu: "Canlı yayın" gösterilirken ekrandaki yarışın grubuna bağlı kamera varsa o kamera; drone ya da belli bir kaynak
// elle seçildiyse o kalır
export function liveUrl(base, scr, stream, camBy, entry) {
  if (scr?.kind !== "live") return base;
  const id = camOf(camBy, entry?.cls || "", entry?.grp || "");
  const src = id ? sourcesOf(stream).find((x) => x.id === id) : null;
  return src?.url || base;
}

// Ekrandaki görüntünün grubu (Seyhun 2026-11-04 "drone'a sen mavi grup demişimdir; canlı yayında onu seçtiğimde mavi grubun yayını olduğunu
// göstermek gerekiyor"): Canlı yayın ekrandaki yarışın grubunu çeker; drone ya da belli bir kaynak elle seçildiyse o kaynağa bağlı grup
// (birkaç gruba bağlıysa ekrandaki yarışın grubu, yoksa şu an yarışan gruplardan ilki). Bağlı grup yoksa "".
export function videoGroup(scr, stream, camBy, entry, liveGrps = []) {
  const k = scr?.kind;
  if (k === "live") return entry?.grp || "";
  if (k !== "src" && k !== "drone") return "";
  const list = sourcesOf(stream);
  const src = k === "src" ? scr.src : (list.find((x) => x.kind === "drone" && x.url) || list.find((x) => x.kind === "drone"))?.id;
  if (!src) return "";
  const grps = groupsOf(camBy, src).map((x) => x.split("|")[1]).filter(Boolean);
  if (!grps.length) return "";
  if (entry?.grp && grps.includes(entry.grp)) return entry.grp;
  return grps.find((g) => liveGrps.includes(g)) || grps[0];
}
