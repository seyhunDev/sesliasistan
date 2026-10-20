// Telefondaki veriden cevaplanan sorular (istek haritası 5. bölüm, 20 Ekim 2026): faturalar, harcamalar, okunmamış
// mesajlar. Yapay zekaya gidip beklenmesin. Saf işlevler, test edilir.
//   infoAsk(söz, bugün)                                         { kind, … } ya da null
//   infoAnswer(soru, { invoices, receipts, chats })             cevap yazısı ("" ise yapay zekaya bırakılır)
import { fold } from "@/lib/brain/seedMatch";
import { totalOf } from "@/lib/receipts";

const W = (s) => new RegExp(`(?<![\\p{L}])(${s})(?![\\p{L}])`, "u");
const ASK = W("kac|ne kadar|ne|neler|nedir|var mi|hangi|hangileri|kimler|kime|toplam|ne zaman");
// Kayıt, mesaj ya da sayfa isteği: soru değil
const NOT = W("ekle|kaydet|olustur|sil|gonder|soyle|haber ver|ac|goster|diye|hatirlat|gorev|oku|temizle|yaz|at");

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (today, n) => {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};
// Harcama aralığı: bu ay (varsayılan), geçen ay, bu hafta, bugün, dün
function span(t, today) {
  if (/(^| )gecen ay/.test(t)) {
    const d = new Date(`${today.slice(0, 8)}01T12:00:00`);
    d.setDate(0);
    const last = iso(d);
    return { from: `${last.slice(0, 8)}01`, to: last, label: "Geçen ay" };
  }
  if (/(^| )bu hafta/.test(t)) return { from: plus(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7)), to: today, label: "Bu hafta" };
  if (/(^| )bugun/.test(t)) return { from: today, to: today, label: "Bugün" };
  if (/(^| )dun( |$)/.test(t)) return { from: plus(today, -1), to: plus(today, -1), label: "Dün" };
  return { from: `${today.slice(0, 8)}01`, to: today, label: "Bu ay" };
}

export function infoAsk(s, today = "") {
  const t = fold(s).replace(/[.!?;,]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || NOT.test(t)) return null;
  if (/(okunma(mis|yan)|yeni mesaj|mesaj(im|imiz|lar)? (var mi|gelmis|geldi mi)|(kim|kimler) (yazmis|yazdi|mesaj (atmis|gondermis)))/.test(t)) return { kind: "unread", text: t };
  if (!ASK.test(t)) return null;
  if (/fatura/.test(t)) return { kind: "invoices", text: t };
  if (/(harca|masraf|gider|fis(ler|lere)? )|(^| )fis( |$)/.test(t) && /(ne kadar|kac|toplam|neler|nereye)/.test(t)) {
    return { kind: "spend", text: t, personal: /(kisisel|harcadim|kendi|benim)/.test(t), ...span(t, today) };
  }
  return null;
}

const TL = (n) => `${Math.round(Number(n) || 0).toLocaleString("tr-TR")} TL`;
const join = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}`);

export function infoAnswer(q, { invoices = null, receipts = [], chats = [] } = {}) {
  if (q.kind === "unread") {
    const rows = chats.filter((c) => c && c.unread > 0 && !c.archivedByMe).sort((a, b) => b.unread - a.unread);
    if (!rows.length) return "Okunmamış mesajın yok.";
    const parts = rows.slice(0, 4).map((c) => `${c.title || "Sohbet"} (${c.unread})`);
    const more = rows.length > 4 ? ` ve ${rows.length - 4} sohbet daha` : "";
    const last = rows.length === 1 && rows[0].last?.text && !rows[0].last.deleted ? ` Son mesaj: “${String(rows[0].last.text).slice(0, 80)}”` : "";
    return `${rows.length === 1 ? "Okunmamış mesaj" : `${rows.length} sohbette okunmamış mesaj var`}: ${join(parts)}${more}.${last}`;
  }
  if (q.kind === "invoices") {
    if (!Array.isArray(invoices)) return ""; // fatura listesi henüz yüklenmedi: yapay zekaya
    if (!invoices.length) return "Ödenmemiş fatura yok.";
    const tl = invoices.filter((x) => !x.currency || x.currency === "TL" || x.currency === "TRY");
    const sum = tl.reduce((a, x) => a + (Number(x.amount) || 0), 0);
    const list = [...invoices].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    const top = list.slice(0, 3).map((x) => `${x.seller || "Satıcı yok"} ${x.currency && !["TL", "TRY"].includes(x.currency) ? `${Math.round(Number(x.amount) || 0).toLocaleString("tr-TR")} ${x.currency}` : TL(x.amount)}`);
    const more = list.length > 3 ? `, ${list.length - 3} tane daha` : "";
    return `${invoices.length} ödenmemiş fatura var${tl.length ? `, toplam ${TL(sum)}` : ""}: ${join(top)}${more}.`;
  }
  if (q.kind === "spend") {
    const rs = receipts.filter((r) => r && (q.personal ? r.scope === "personal" : r.scope !== "personal") && String(r.date || "") >= q.from && String(r.date || "").slice(0, 10) <= q.to);
    const who = q.personal ? "kişisel" : "kulüp";
    if (!rs.length) return `${q.label} ${who} fişi yok.`;
    const by = {};
    rs.forEach((r) => (by[r.cat || "Diğer"] = (by[r.cat || "Diğer"] || 0) + totalOf(r) / 100));
    const sum = Object.values(by).reduce((a, b) => a + b, 0);
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => `${c} ${TL(v)}`);
    return `${q.label} ${rs.length} ${who} fişi, toplam ${TL(sum)}. En çok: ${join(top)}.`;
  }
  return "";
}
