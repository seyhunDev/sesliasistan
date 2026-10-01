import { Icon } from "@/components/ui/Icon";
import { toMs } from "./ChatProvider";

export const ONLINE_MS = 3 * 60e3;
const dayKey = (ms) => new Date(ms).toDateString();

// Liste zamanı: bugün saat, dün "Dün", bu hafta gün adı, daha eski tarih
export function listTime(v) {
  const t = toMs(v);
  if (!t) return "";
  if (dayKey(t) === dayKey(Date.now())) return new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (dayKey(t) === dayKey(Date.now() - 864e5)) return "Dün";
  if (Date.now() - t < 6 * 864e5) return new Date(t).toLocaleDateString("tr-TR", { weekday: "long" });
  return new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
export const hm = (v) => (toMs(v) ? new Date(toMs(v)).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");
export function dayText(v) {
  const t = toMs(v);
  if (dayKey(t) === dayKey(Date.now())) return "Bugün";
  if (dayKey(t) === dayKey(Date.now() - 864e5)) return "Dün";
  return new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" });
}
export const sameDay = (a, b) => dayKey(toMs(a)) === dayKey(toMs(b));

// "çevrimiçi" ya da "son görülme 14:05 / dün 21:10 / 12 Eki"
export function seenText(lastSeen) {
  const t = toMs(lastSeen);
  if (!t) return "";
  if (Date.now() - t < ONLINE_MS) return "çevrimiçi";
  if (dayKey(t) === dayKey(Date.now())) return `son görülme ${hm(t)}`;
  if (dayKey(t) === dayKey(Date.now() - 864e5)) return `son görülme dün ${hm(t)}`;
  return `son görülme ${new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`;
}
export const isOnline = (p) => !!p && Date.now() - toMs(p.lastSeen) < ONLINE_MS;

export const initialsOf = (n = "") =>
  String(n)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toLocaleUpperCase("tr-TR"))
    .join("") || "?";

// Kişiye göre sabit renk (aynı kişi hep aynı renk; yazı ile zemin arası yeterli kontrast)
const TONES = [
  "bg-[#dde8ee] text-[#2c5163]",
  "bg-[#f3e3cf] text-[#8a4f0c]",
  "bg-[#dcebe0] text-[#2f6446]",
  "bg-[#f1dcdc] text-[#8e3a34]",
  "bg-[#e5e0f0] text-[#553f86]",
  "bg-[#dbe9e9] text-[#2c6262]",
];
export const toneFor = (key = "") => TONES[[...String(key)].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

// Yuvarlak kişi/grup simgesi; online: yeşil nokta. text: harf boyutu (avatar boyutuna göre)
export function Avatar({ name, icon, online, size = "size-12", tone, text = "text-[0.9375rem]" }) {
  return (
    <span className={`relative grid ${size} shrink-0 place-items-center rounded-full ${tone || toneFor(name)} ${text} font-semibold tracking-tight`}>
      {icon ? <Icon name={icon} className="size-[45%]" /> : initialsOf(name)}
      {online && <span className="absolute bottom-0 right-0 size-[28%] min-h-2.5 min-w-2.5 rounded-full bg-[#34a853] ring-2 ring-bg" />}
    </span>
  );
}

// Gönderildi / okundu işareti (benim mesajım): tek tik gönderildi, çift mavi tik herkes okudu
export function Ticks({ read, pending, readTone = "text-sky-300" }) {
  if (pending) return <Icon name="clock" className="size-3 opacity-70" />;
  return <Icon name={read ? "checks" : "check"} className={`size-3.5 [stroke-width:2.5] ${read ? readTone : "opacity-70"}`} />;
}
