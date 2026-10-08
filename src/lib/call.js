// Uygulama içi sesli arama (1. adım): iki kişi, uygulama açıkken. Ses telefonlar arasında doğrudan (WebRTC) gider,
// aramanın kurulması Firestore'dan: orgs/{işletme}/calls/{id} { from, to, kind: "audio", status, at, offer, answer,
//   answeredAt, endedAt, endedBy } ve calls/{id}/cands/{auto} { by, c } (ağ adresleri). Kurallar firestore.rules › calls.
import { canTalk, isAthleteSide } from "@/lib/kinds";

export const RING_MS = 30e3; // bu sürede açılmazsa cevapsız
export const STALE_MS = 40e3; // bundan eski "çalıyor" kaydı yok sayılır (kapanmış uygulamadan kalan)
export const STATUS = { ringing: "ringing", active: "active", declined: "declined", missed: "missed", ended: "ended", failed: "failed" };
// Şimdilik yalnız STUN (2. adımda TURN eklenecek; mobil hatta bazen bağlanamaz)
export const ICE_SERVERS = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

// Kimler arasında arama olur: yazışabilenler, sporcu/öğrenci/veli hariç (ilk sürüm: ana hesap, çalışan, aile)
export const canCall = (a, b) => !!a && !!b && canTalk(a, b) && !isAthleteSide(a) && !isAthleteSide(b);

export const isOver = (s) => s === STATUS.declined || s === STATUS.missed || s === STATUS.ended || s === STATUS.failed;

// Gelen "çalıyor" kaydı hâlâ geçerli mi (uygulama geç açıldıysa eski arama çalmasın)
export const ringingFresh = (c, now = Date.now()) => c?.status === STATUS.ringing && (!c.atMs || now - c.atMs < STALE_MS);

// Süre: 0:07, 3:25, 1:02:09
export function durationText(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// Arama ekranındaki durum yazısı
export function callLabel({ status, role, conn, ms }) {
  if (status === STATUS.ringing) return role === "caller" ? "Aranıyor…" : "Seni arıyor";
  if (status === STATUS.active) return conn === "connected" ? durationText(ms) : conn === "failed" ? "Bağlanamadı" : "Bağlanıyor…";
  if (status === STATUS.declined) return role === "caller" ? "Meşgul" : "Reddedildi";
  if (status === STATUS.missed) return role === "caller" ? "Cevap yok" : "Cevapsız arama";
  if (status === STATUS.failed) return "Bağlanamadı";
  return "Arama bitti";
}

// Mikrofon hatasının açıklaması
export function micError(e) {
  const n = e?.name || "";
  if (n === "NotAllowedError" || n === "SecurityError") return "Mikrofon izni yok. Ayarlar'dan bu uygulamaya mikrofon izni ver.";
  if (n === "NotFoundError") return "Mikrofon bulunamadı.";
  if (n === "NotReadableError") return "Mikrofon başka bir uygulamada kullanılıyor.";
  return "Mikrofon açılamadı.";
}
