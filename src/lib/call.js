// Uygulama içi sesli arama (1. adım): iki kişi, uygulama açıkken. Ses telefonlar arasında doğrudan (WebRTC) gider,
// aramanın kurulması Firestore'dan: orgs/{işletme}/calls/{id} { from, to, kind: "audio", status, at, offer, answer,
//   answeredAt, endedAt, endedBy } ve calls/{id}/cands/{auto} { by, c } (ağ adresleri). Kurallar firestore.rules › calls.
import { canTalk, isAthleteSide } from "@/lib/kinds";

export const RING_MS = 30e3; // bu sürede açılmazsa cevapsız
export const STALE_MS = 40e3; // bundan eski "çalıyor" kaydı yok sayılır (kapanmış uygulamadan kalan)
export const RETRY_MS = 3e3; // bağlantı kopunca bu kadar bekleyip yeniden kurmayı dene
export const LOST_MS = 25e3; // kopan bağlantı bu sürede düzelmezse arama biter
export const STATUS = { ringing: "ringing", active: "active", declined: "declined", missed: "missed", ended: "ended", failed: "failed" };
// STUN: iki telefonun birbirini bulması (ücretsiz, Google). TURN: doğrudan bağlanamayınca (çoğu zaman mobil internet)
// sesi aktaran sunucu; Cloudflare'den /api/turn ile kısa süreli alınır (turnServers).
export const ICE_SERVERS = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

const isStun = (u) => u.startsWith("stun");
// Cloudflare yanıtını RTCPeerConnection'ın beklediği listeye çevirir; Google STUN her zaman başta.
// Yanıt biçimleri: { iceServers: [{ urls, username, credential }, …] } ya da { iceServers: { urls, username, credential } }.
// 53 numaralı porttaki adresler (bazı ağlarda engelli, iPhone'da yavaşlatır) atılır; şifresiz TURN alınmaz.
export function turnServers(res) {
  const raw = res?.iceServers;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((s) => ({ ...s, urls: [].concat(s?.urls || []).filter((u) => typeof u === "string" && !/:53(\?|$)/.test(u) && !isStun(u)) }))
    .filter((s) => s.urls.length && s.username && s.credential);
  return [...ICE_SERVERS, ...list];
}
export const hasTurn = (servers) => (servers || []).some((s) => [].concat(s.urls || []).some((u) => /^turns?:/.test(u)));

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
export function callLabel({ status, role, conn, ms, retrying }) {
  if (status === STATUS.ringing) return role === "caller" ? "Aranıyor…" : "Seni arıyor";
  if (status === STATUS.active) return conn === "connected" ? durationText(ms) : retrying ? "Yeniden bağlanıyor…" : "Bağlanıyor…";
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

// Arama bitince sohbete yazılan satır (arayan yazar). notify: karşı tarafa bildirim gitsin mi (yalnız cevapsız)
export function callLog(status, ms) {
  if (status === STATUS.missed || status === STATUS.declined) return { text: "📞 Cevapsız sesli arama", notify: status === STATUS.missed };
  if (status === STATUS.ended && ms > 0) return { text: `📞 Sesli arama · ${durationText(ms)}`, notify: false };
  return null;
}

// ---- Kullanım takibi (Ayarlar › Aramalar) ----
// Bir aramanın veri kullanımı RTCPeerConnection.getStats() listesinden: seçili bağlantı çiftinin gönderilen/alınan
// baytı ve bu çiftte TURN (relay) kullanıldı mı. Çift bulunamazsa ses paketlerinin toplamı.
export function pickStats(list) {
  const all = Array.from(list || []);
  const by = new Map(all.map((s) => [s.id, s]));
  const tr = all.find((s) => s.type === "transport" && s.selectedCandidatePairId);
  const pairs = all.filter((s) => s.type === "candidate-pair" && s.state === "succeeded");
  const pair = (tr && by.get(tr.selectedCandidatePairId)) || pairs.filter((p) => p.nominated).sort((a, b) => (b.bytesSent || 0) + (b.bytesReceived || 0) - (a.bytesSent || 0) - (a.bytesReceived || 0))[0];
  let sent = pair?.bytesSent || 0;
  let recv = pair?.bytesReceived || 0;
  if (!sent && !recv) {
    for (const s of all) {
      if (s.type === "outbound-rtp") sent += s.bytesSent || 0;
      if (s.type === "inbound-rtp") recv += s.bytesReceived || 0;
    }
  }
  const relay = !!pair && [by.get(pair.localCandidateId), by.get(pair.remoteCandidateId)].some((c) => c?.candidateType === "relay");
  return { sent, recv, relay };
}

// 1.234.567 bayt → "1,2 MB"; 1 GB ve üstü GB
export function mbText(bytes) {
  const b = Math.max(0, bytes || 0);
  if (b >= 1e9) return `${(b / 1e9).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} GB`;
  return `${(b / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: b < 1e7 ? 1 : 0 })} MB`;
}

// TURN kotası (ücretsiz kısım, varsayılan 1.000 GB): bu ekleme %80'i ya da sınırı geçirdi mi (bildirim için)
export const TURN_LIMIT_GB = 1000;
export function quotaStep(before, after, limitBytes) {
  if (!(limitBytes > 0)) return null;
  if (before < limitBytes && after >= limitBytes) return 100;
  if (before < limitBytes * 0.8 && after >= limitBytes * 0.8) return 80;
  return null;
}

// Aramanın konuşma süresi (açıldığı andan bittiği ana), ms
export const talkMs = (c) => {
  const a = c?.answeredAt ? Date.parse(c.answeredAt) : 0;
  const e = c?.endedAt ? Date.parse(c.endedAt) : 0;
  return a && e > a ? e - a : 0;
};

// Bir telefonun ağ durumu (bağlanamayan aramada nedeni görmek için, Ayarlar › Aramalar):
// TURN bilgisi alınamadıysa ya da alındı ama TURN adresi bulunamadıysa kısa açıklama, sorun yoksa "".
export function netNote(st) {
  if (!st || st.turn === undefined) return "";
  const types = st.types || [];
  if (!st.turn) return "TURN alınamadı";
  if (!types.includes("relay")) return "TURN adresi bulunamadı";
  if (st.ok === false && st.rx === 0) return "karşı telefonun adresleri gelmedi";
  if (st.ok === false) return "TURN vardı, yine bağlanamadı";
  return "";
}

// Android ses çıkışları listesinden ahize (speaker=false) ya da hoparlör (speaker=true) çıkışının kimliği
export function pickSink(list, speaker) {
  const re = speaker ? /speaker|hoparl/i : /earpiece|receiver|handset|ahize/i;
  const d = (list || []).find((x) => re.test(x.label || ""));
  return d?.deviceId || null;
}
