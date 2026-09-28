import { todayStr } from "./format";

const HW = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on", "on bir", "on iki"];

// "09:00" -> "sabah dokuz" (sesli okunmaya uygun)
export function spokenTime(t) {
  const [h, m] = t.split(":").map(Number);
  const part = h < 6 ? "gece" : h < 12 ? "sabah" : h < 18 ? "öğleden sonra" : "akşam";
  let out = h === 12 && m === 0 ? "öğlen on iki" : `${part} ${HW[h % 12 || 12]}`;
  if (m === 30) out += " buçuk";
  else if (m) out += ` ${m}`;
  return out;
}

const D = (s) => new Date(`${s}T00:00`);

// "2026-10-05" -> "yarın" / "bugün" / "5 Ekim Pazartesi"
export function spokenDay(s) {
  const n = Math.round((D(s) - D(todayStr())) / 864e5);
  if (n === 0) return "bugün";
  if (n === 1) return "yarın";
  return D(s).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}
