// Sporcu bilgi ekranı (Seyhun 2026-11-15): tek ekran, dokunulmaz; saat, pusula, start sayacı, parkur, gelen mesaj (sesli okunur) ve
// bas-konuş ses. Veri orgs/{org}/bilgi/ekran (sayaç, parkur, mesaj) ve orgs/{org}/bilgi/ses (son ses kaydı, base64). Saf işler burada.

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Parkurlar: 300×260 çizimde şamandıralar (x, y), numaraları (no, x, y), çizgi sırası, start hattı. Rüzgâr yukarıdan (1 numara rüzgârüstü)
export const COURSES = {
  trapez: { name: "Trapez", marks: [[150, 52], [96, 60], [136, 196], [164, 196]], labels: [["1", 150, 36], ["2", 80, 64], ["3", 150, 182]], path: [[150, 196], [150, 52], [96, 60], [136, 196]] },
  ucgen: { name: "Üçgen", marks: [[150, 52], [76, 130], [150, 200]], labels: [["1", 150, 36], ["2", 60, 134], ["3", 166, 204]], path: [[150, 200], [150, 52], [76, 130], [150, 200]] },
  ust: { name: "İniş çıkış", marks: [[150, 52], [136, 200], [164, 200]], labels: [["1", 150, 36], ["4", 150, 186]], path: [[150, 200], [150, 52]] },
};
export const courseOf = (k) => COURSES[k] || COURSES.trapez;

export const MSG_MAX = 200;
export const SES_MAX_SEC = 20;
// Mesaj ve ses yalnız tazeyse gösterilir/çalınır (ekran sonradan açılınca eski mesaj okunmaz)
export const FRESH_MS = 60e3;

// Start sonrası ekranda ne görünsün (Seyhun 2026-11-15, örnek 5): Yönet'ten aç kapa. Varsayılan pusula + süre + saat
export const SHOW = [["pusula", "Pusula"], ["sure", "Süre"], ["parkur", "Parkur"], ["ruzgar", "Rüzgâr"], ["saat", "Saat"]];
export const SHOW_DEF = { pusula: true, sure: true, parkur: false, ruzgar: false, saat: true };
export function cleanShow(v) {
  const o = v && typeof v === "object" ? v : {};
  return Object.fromEntries(SHOW.map(([k]) => [k, typeof o[k] === "boolean" ? o[k] : SHOW_DEF[k]]));
}

export function cleanBilgi(d = {}) {
  const t = d.timer && typeof d.timer === "object" ? d.timer : null;
  const m = d.msg && typeof d.msg === "object" ? d.msg : null;
  return {
    on: d.on !== false,
    label: S(d.label, 40),
    course: COURSES[d.course] ? d.course : "trapez",
    show: cleanShow(d.show),
    link: /^[a-z0-9]{12,40}$/.test(d.link || "") ? d.link : "",
    state: S(d.state, 80),
    timer: t ? { dur: Number(t.dur) || 300, end: Number.isFinite(+t.end) && t.end != null ? +t.end : null, left: Number.isFinite(+t.left) && t.left != null ? +t.left : null, mode: S(t.mode, 20) } : null,
    msg: m && m.id ? { id: S(m.id, 40), text: S(m.text, MSG_MAX), at: Number(m.at) || 0, to: S(m.to, 30) } : null,
    kanal: d.kanal && typeof d.kanal === "object" && d.kanal.id ? { id: S(d.kanal.id, 40), name: S(d.kanal.name, 30) || "Kanal", open: d.kanal.open === true } : null,
  };
}

// Kanal (Seyhun 2026-11-15): Yönet bir kanal açar (Antrenman, Yarış…); bilgi ekranı yalnız açık kanala katılarak başlar.
// Kanaldakiler: bilgiTekne belgeleri (ch = kanal id), son 60 sn'de ses verenler açık sayılır.
export const LIVE_MS = 60e3;
export const membersOf = (boats, ch, now) => (boats || []).filter((b) => ch && b.ch === ch && now - (b.t || 0) < LIVE_MS);

// Gönderim durumu (İletildi / Görüldü / Ulaşmadı): sent = { id, at, to, ok } (ok: sunucu onayı true/false, beklerken null).
// Hedef: to verilirse o cihaz, yoksa gönderim anında kanalda açık olanlar. 15 sn'de görmeyen "ulaşmadı" sayılır.
export const SEEN_WAIT = 15e3;
export function deliveryOf(sent, boats, ch, now) {
  if (!sent) return null;
  if (sent.ok === false) return { state: "fail", seen: 0, of: 0, missing: [] };
  if (sent.ok == null) return { state: "wait", seen: 0, of: 0, missing: [] };
  const pool = (boats || []).filter((b) => b.ch === ch);
  const targets = sent.to ? pool.filter((b) => b.id === sent.to) : pool.filter((b) => (b.t || 0) > sent.at - LIVE_MS);
  const seen = targets.filter((b) => b.seen === sent.id);
  const missing = targets.filter((b) => b.seen !== sent.id).map((b) => b.sail || b.name || "?");
  const late = now - sent.at > SEEN_WAIT;
  if (targets.length && seen.length === targets.length) return { state: "seen", seen: seen.length, of: targets.length, missing: [] };
  if (!late) return { state: "sent", seen: seen.length, of: targets.length, missing };
  return { state: seen.length ? "part" : "fail", seen: seen.length, of: targets.length, missing };
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Start sayacı: geri sayım (down), startan beri (up), durdurulmuş (pause), yok (none). left: kalan saniye
export function startView(t, now = Date.now()) {
  if (!t) return { phase: "none", txt: "--:--", left: null };
  if (t.end != null) {
    const ms = t.end - now;
    if (ms > 0) {
      const left = Math.ceil(ms / 1000);
      return { phase: "down", txt: mmss(left), left };
    }
    const up = Math.floor(-ms / 1000);
    return up < 6 * 3600 ? { phase: "up", txt: `+${mmss(up)}`, left: 0 } : { phase: "none", txt: "--:--", left: null };
  }
  if (t.left != null) return { phase: "pause", txt: mmss(Math.ceil(t.left / 1000)), left: Math.ceil(t.left / 1000) };
  return { phase: "none", txt: "--:--", left: null };
}

// 5 dakikalık start dizisi: 5 (sınıf bayrağı), 4 (P), 1 (P iner), 0. Her adım: done (geçti), on (şu anki dakika)
export function seqMarks(left) {
  const at = [5, 4, 1, 0];
  return at.map((m, i) => {
    const n = at[i + 1] ?? -1;
    const on = left != null && left > 0 && left <= m * 60 && left > n * 60;
    const done = left != null && (left <= n * 60 || left === 0);
    return { m, done, on };
  });
}
// Ekran kipi: son 1 dakikada yalnız büyük süre ("last"), start olunca ortada büyük pusula + altta küçük süre ("race"), öncesi "pre"
export const screenMode = (sv) => (sv.phase === "down" && sv.left <= 60 ? "last" : sv.phase === "up" ? "race" : "pre");

// Son dakika bipleri (Seyhun 2026-11-15): 30. ve 10. saniyede bip, son 5 saniyede her saniye çift bip, startta uzun bip.
// prev → left geçişinde çalınacak bip: "one" | "two" | "long" | null
export function beepOf(prev, left) {
  if (prev == null || left == null || left === prev || left > prev || prev - left > 2) return null;
  if (left === 0) return "long";
  if (left <= 5) return "two";
  if (left === 30 || left === 10) return "one";
  return null;
}

// P bayrağı 4. dakikadan 1. dakikaya kadar
export const pFlag = (left, dur) => dur === 300 && left != null && left > 60 && left <= 240;

// Pusula: telefonun baktığı yön (derece) ve 8 yön adı
const DIRS = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
export const dirName = (deg) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
export const normDeg = (d) => Math.round(((d % 360) + 360) % 360);

// Asistan: "bilgi ekranına yaz: …" ("sporculara söyle" Mesajlar'daki gruba gider), "bilgi ekranını aç", "bilgi ekranını yönet"
export function bilgiCommand(s) {
  const t = String(s || "").trim();
  const m = /^bilgi ekranına\s+(?:yaz|söyle|mesaj gönder|mesaj yaz|duyur|gönder)\s*[:,]?\s*(.+)$/i.exec(t);
  if (m) return { op: "msg", text: S(m[1].replace(/[.!]+$/, ""), MSG_MAX) };
  // "bilgi ekranında Mustafa'ya yaz: …": yalnız o kişiye (kanaldaki adı ya da yelken no)
  const p = /^bilgi ekranında\s+(.+?)['’]?(?:y?a|y?e)\s+(?:yaz|söyle|gönder)\s*[:,]?\s*(.+)$/i.exec(t);
  if (p) return { op: "msg", to: S(p[1], 30), text: S(p[2].replace(/[.!]+$/, ""), MSG_MAX) };
  // "bilgi kanalı aç: Antrenman" / "bilgi kanalını kapat"
  const k = /^bilgi kanalı(?:nı)?\s+aç\s*[:,]?\s*(.*)$/i.exec(t);
  if (k) return { op: "kanal", name: S(k[1].replace(/[.!]+$/, ""), 30) || "Antrenman" };
  if (/^bilgi kanalını?\s+kapat$/i.test(t)) return { op: "kanalKapat" };
  if (/^bilgi ekranını?\s+(?:aç|göster)$/i.test(t)) return { op: "open" };
  if (/^bilgi ekranı(?:nın)?\s+link(?:i|ini)?(?:\s+(?:ver|kopyala|paylaş|gönder|aç|oluştur))?$/i.test(t)) return { op: "link" };
  // "bilgi ekranında rüzgârı göster" / "bilgi ekranında saati gizle": start sonrası ekranda aç kapa
  const g = /^bilgi ekranında\s+(pusula|süre|parkur|rüzg[aâ]r|saat)\S*\s+(göster|gizle|aç|kapat)$/i.exec(t);
  if (g) {
    const w = g[1].toLocaleLowerCase("tr");
    const key = w === "süre" ? "sure" : w.startsWith("rüzg") ? "ruzgar" : w;
    return { op: "show", key, on: /göster|aç/i.test(g[2]) };
  }
  if (/^bilgi ekranını?\s+yönet(?:imini aç)?$|^bilgi ekranı yönetimini aç$/i.test(t)) return { op: "admin" };
  return null;
}

// Eğim düzeltmeli pusula (Seyhun 2026-11-15: telefon teknede dik durur; "öne arkaya yatırınca değişmemeli, yalnız sağa sola"):
// yön = telefonun arka yüzünün (kameranın baktığı yönün) yatay izdüşümü. Dik telefon öne/arkaya yatınca ya da yana yatınca (tekne
// yatışı) arka yüzün yatay yönü değişmez, yalnız telefon sağa sola dönünce değişir. Telefon düze yaklaştıkça (arka yüz yere bakar)
// ekranın "yukarı" ekseni devreye girer. Cihaz yön olayı W3C (ZXY: alpha Z, beta X, gamma Y) dönme matrisinden hesaplanır.
// screenAngle: ekranın dönüşü (yatayda 90 / 270). Dönen: derece (0 kuzey, saat yönünde) ya da null (sensör yok)
export function tiltHeading(alpha, beta, gamma, screenAngle = 0) {
  if (![alpha, beta, gamma].every(Number.isFinite)) return null;
  const r = Math.PI / 180;
  const cZ = Math.cos(alpha * r), sZ = Math.sin(alpha * r);
  const cX = Math.cos(beta * r), sX = Math.sin(beta * r);
  const cY = Math.cos(gamma * r), sY = Math.sin(gamma * r);
  // Dönme matrisinin sütunları (doğu, kuzey): cihaz X, Y ve arka yüz (-Z)
  const xE = cZ * cY - sZ * sX * sY, xN = cY * sZ + cZ * sX * sY;
  const yE = -cX * sZ, yN = cZ * cX;
  const bE = -(cY * sZ * sX + cZ * sY), bN = -(sZ * sY - cZ * cY * sX);
  const a = (screenAngle || 0) * r;
  const uE = Math.sin(a) * xE + Math.cos(a) * yE, uN = Math.sin(a) * xN + Math.cos(a) * yN;
  const m = Math.hypot(bE, bN); // arka yüz ne kadar yatay (dik telefonda 1, düz telefonda 0)
  const w = Math.max(0, Math.min(1, (0.5 - m) / 0.5)); // düzden 30°'ye kadar ekranın yukarısı karışır
  const E = bE + w * uE, N = bN + w * uN;
  if (Math.hypot(E, N) < 1e-6) return null;
  return ((Math.atan2(E, N) / r) % 360 + 360) % 360;
}
