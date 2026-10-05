// Faturalar (saf fonksiyonlar; sayfa, asistan, sunucu ve zamanlanmış görev ortak kullanır, test edilir).
// Kayıt: orgs/{org}/invoices/{id} = { seller, taxId, no, date, due, amount, currency, iban, desc, note,
//   status "open"|"paid", paidAt (YYYY-MM-DD), paidVia "bank"|"hand"|"task", paidMov { date, desc, amount },
//   taskId, file { id, name, type, size, parts, at }, createdAt, createdBy }
// Dosya (PDF/fotoğraf) parçalı: orgs/{org}/invoiceFiles/{id}/parts/{000..} (envanter belgeleri gibi).
// Sunucu için açık faturaların kısa listesi tek belgede: orgs/{org}/invoiceIndex/open = { list [openRow], at }
// (banka maili gelince tek okuma; sorgu yok). Sayfa her değişiklikte yeniden yazar.
// Görev: fatura eklenince "Fatura öde: <firma>" görevi açılır (tasks, alan invoice { id, seller, amount, no, iban, due }).
// Görevli atanınca bildirimde tutar da yazar. Görev tamamlanınca fatura ödendi olur; fatura ödenince görev tamamlanır.
//
// Bankada eşleştirme (İş Bankası günlük hesap özeti; giden para, eksi tutar):
//   tutar birebir aynı (±0,01) + hareket tarihi fatura tarihinden en çok 3 gün önce ile 180 gün sonrası arasında
//   + açıklamada fatura numarası, vergi numarası ya da firma adından ayırt edici bir kelime → emin (kendiliğinden ödendi).
//   Yalnız tutar ve tarih tutuyorsa öneri (Faturalar sayfasında onay).
import { words } from "./dues.js";
import { parseTrDate } from "./mailBoard.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export const TL = (n) => `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0).replace(/,00$/, "")} TL`;
export const amountText = (inv) => (inv?.currency && inv.currency !== "TL" ? `${TL(inv.amount).replace(/ TL$/, "")} ${inv.currency}` : TL(inv?.amount));
export const shortDay = (d) => (DATE.test(d || "") ? `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}` : "");
const dayMs = (d) => (DATE.test(d || "") ? Date.parse(`${d}T12:00:00Z`) : NaN);

// Firma adındaki genel kelimeler eşleştirmede sayılmaz
const STOP = new Set(
  "AS ANONIM SIRKETI SIRKET STI LTD LIMITED TIC TICARET SAN SANAYI VE HIZMET HIZMETLERI HIZ AS. INC CO GRUP GRUBU TURKIYE TURK PAZARLAMA DAGITIM PERAKENDE SATIS ITHALAT IHRACAT INSAAT GIDA TURIZM BILGI TEKNOLOJI TEKNOLOJILERI ELEKTRONIK MUHENDISLIK DANISMANLIK ORGANIZASYON MERKEZI SUBESI SUBE KOOPERATIFI DERNEGI SPOR KULUBU FATURA FATURASI EFT HAVALE FAST GIDEN GELEN ODEME ODEMESI TL TRY"
    .split(" "),
);
export const sellerWords = (s) => words(s).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
const compact = (s) => words(s).join("");

// Durum: paid | late (son günü geçti) | open
export function stateOf(inv, today) {
  if (inv?.status === "paid") return "paid";
  return inv?.due && today && inv.due < today ? "late" : "open";
}
export const STATE = { paid: "Ödendi", late: "Gecikti", open: "Ödenmedi" };

// Açık faturaların sunucuya giden kısa satırı
export const openRow = (inv) => Object.fromEntries(Object.entries({ id: inv.id, seller: inv.seller, taxId: inv.taxId, no: inv.no, date: inv.date, amount: inv.amount, currency: inv.currency, taskId: inv.taskId }).filter(([, v]) => v !== undefined && v !== ""));
export const openIndex = (list) => list.filter((x) => x.status !== "paid" && x.amount > 0).map(openRow);

// Bir hareket bu faturayı ödüyor mu → { ok, sure, why } (ok: tutar ve tarih tutuyor)
export function matchInvoice(m, inv) {
  const no = { ok: false, sure: false, why: "" };
  if (!(m?.amount < 0) || !(inv?.amount > 0)) return no;
  const cur = inv.currency || "TL";
  if ((m.currency || "TL") !== cur) return no;
  if (Math.abs(Math.abs(m.amount) - inv.amount) > 0.01) return no;
  const t = Number.isFinite(m.ts) ? m.ts : parseTrDate(m.date);
  const d = dayMs(inv.date);
  if (Number.isFinite(t) && Number.isFinite(d) && (t < d - 3 * 864e5 || t > d + 180 * 864e5)) return no;
  const desc = words(m.desc);
  const flat = desc.join("");
  const invNo = compact(inv.no);
  if (invNo.length >= 5 && flat.includes(invNo)) return { ok: true, sure: true, why: "tutar ve fatura numarası" };
  const tax = String(inv.taxId || "").replace(/\D/g, "");
  if (tax.length >= 10 && flat.includes(tax)) return { ok: true, sure: true, why: "tutar ve vergi numarası" };
  const sw = sellerWords(inv.seller);
  const hit = sw.find((w) => desc.includes(w));
  if (hit) return { ok: true, sure: true, why: `tutar ve firma adı (${hit})` };
  return { ok: true, sure: false, why: "yalnız tutar tutuyor" };
}

// Hareketleri açık faturalarla eşleştirir; her hareket ve fatura en çok bir kez → [{ inv, m, sure, why }]
export function bankMatches(movements, invoices) {
  const open = invoices.filter((x) => x.status !== "paid");
  const cand = [];
  for (const inv of open)
    for (const m of movements) {
      const r = matchInvoice(m, inv);
      if (r.ok) cand.push({ inv, m, ...r });
    }
  // Emin olanlar önce, sonra fatura tarihine en yakın hareket
  const gap = (c) => Math.abs((Number.isFinite(c.m.ts) ? c.m.ts : parseTrDate(c.m.date) || 0) - (dayMs(c.inv.date) || 0));
  cand.sort((a, b) => Number(b.sure) - Number(a.sure) || gap(a) - gap(b));
  const usedInv = new Set();
  const usedMov = new Set();
  const out = [];
  for (const c of cand) {
    const mk = `${c.m.account || ""}|${c.m.date}|${c.m.amount}|${c.m.desc}`;
    if (usedInv.has(c.inv.id) || usedMov.has(mk)) continue;
    usedInv.add(c.inv.id);
    usedMov.add(mk);
    out.push(c);
  }
  return out;
}

// Hareketten faturaya yazılacak ödeme bilgisi
export const paidMovOf = (m) => ({ date: String(m.date || ""), desc: String(m.desc || "").slice(0, 160), amount: m.amount });
export const isoDay = (m, now = Date.now()) => new Date((Number.isFinite(m?.ts) ? m.ts : parseTrDate(m?.date) ?? now) + 3 * 3600e3).toISOString().slice(0, 10);

// Görev: başlık ve kayıttaki fatura özeti
export const taskTitle = (inv) => `Fatura öde: ${String(inv.seller || "Fatura").trim()}`.slice(0, 80);
export const taskInvoice = (inv) =>
  Object.fromEntries(Object.entries({ id: inv.id, seller: inv.seller, amount: inv.amount, currency: inv.currency, no: inv.no, iban: inv.iban, due: inv.due }).filter(([, v]) => v !== undefined && v !== ""));
// Bildirimde kısa ödeme bilgisi: "1.250 TL"
export const payLine = (ti) => (ti?.amount ? amountText(ti) : "");
// Görevlinin göreceği/kopyalayacağı ödeme bilgisi
export function payText(inv) {
  return [
    `${inv.seller || "Fatura"} · ${amountText(inv)}`,
    inv.no && `Fatura no: ${inv.no}`,
    inv.due && `Son ödeme: ${shortDay(inv.due)}`,
    inv.iban && `IBAN: ${inv.iban}`,
  ]
    .filter(Boolean)
    .join("\n");
}
// Görev tamamlandı mı (ana hesap ya da görevli)
export const taskDone = (t) => !!t && (t.done === true || Object.values(t.doneBy || {}).some(Boolean));

// IBAN biçimi: "TR12 0006 4000 …" (boşluklu), geçersizse boş
export function cleanIban(s) {
  const x = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^TR\d{24}$/.test(x)) return "";
  return x.replace(/(.{4})/g, "$1 ").trim();
}

// Liste özeti: { open, late, sum (ödenmemiş toplam TL) }
export function summaryOf(list, today) {
  const open = list.filter((x) => stateOf(x, today) !== "paid");
  return { open: open.length, late: open.filter((x) => stateOf(x, today) === "late").length, sum: open.filter((x) => (x.currency || "TL") === "TL").reduce((s, x) => s + (Number(x.amount) || 0), 0) };
}

// ---- Asistan ----
const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?;:"“”()]/g, " ").replace(/['’]/g, " ").replace(/\s+/g, " ").trim();
const FAT = /(^|\s)fatura\S*/;
const PAID = /(^|\s)(ödendi|ödedim|ödedik|ödenmiş|ödeme yapıldı|ödendi olarak|ödendi işaretle|ödeyin? ?dim|yatırıldı|yatırdım|yatırdık)(?=\s|$)/;
const UNPAID = /(^|\s)(ödenmedi|ödenmemiş|ödenmedi olarak|açık(a)? al|geri al)(?=\s|$)/;
// "Turkcell faturası ödendi", "faturayı ödendi işaretle", "elektrik faturasını ödedim", "fatura ödenmedi olarak işaretle"
export function invoiceCommand(text) {
  const t = lower(text);
  if (!FAT.test(t) || t.split(" ").length > 14 || /\?|(^|\s)(mı|mi|mu|mü)(\s|$)/.test(t)) return null;
  if (UNPAID.test(t)) return { op: "unpaid", t };
  if (PAID.test(t)) return { op: "paid", t };
  return null;
}
// Cümledeki firma adına göre fatura seçer (yoksa tek açık fatura) → { pick, list }
export function pickInvoice(t, invoices, op = "paid") {
  const pool = invoices.filter((x) => (op === "paid" ? x.status !== "paid" : x.status === "paid"));
  const said = new Set(words(t));
  const scored = pool
    .map((x) => ({ x, n: sellerWords(x.seller).filter((w) => said.has(w) || [...said].some((s) => s.length >= 4 && w.startsWith(s))).length }))
    .filter((y) => y.n > 0)
    .sort((a, b) => b.n - a.n);
  if (scored.length && (scored.length === 1 || scored[0].n > scored[1].n)) return { pick: scored[0].x, list: [] };
  if (scored.length) return { pick: null, list: scored.map((y) => y.x) };
  return pool.length === 1 ? { pick: pool[0], list: [] } : { pick: null, list: pool };
}

// ---- Sunucu: banka maili gelince ----
// io: { get(path), set(path, alanlar) }. Yalnız emin eşleşmeler yazılır. → { paid [{ seller, amount, currency }], guess } | null
export async function runAutoInvoices(io, uid, movements) {
  const outs = movements.filter((m) => m.amount < 0);
  if (!outs.length) return null;
  const idx = await io.get(`orgs/${uid}/invoiceIndex/open`);
  const list = (idx?.list || []).filter((x) => x?.id && x.amount > 0);
  if (!list.length) return null;
  const found = bankMatches(outs, list);
  const res = { paid: [], guess: found.filter((c) => !c.sure).length };
  const now = new Date().toISOString();
  for (const c of found.filter((x) => x.sure)) {
    await io.set(`orgs/${uid}/invoices/${c.inv.id}`, { status: "paid", paidAt: isoDay(c.m), paidVia: "bank", paidMov: paidMovOf(c.m), updatedAt: now });
    // Görev silinmişse yeniden oluşmasın
    if (c.inv.taskId && (await io.get(`orgs/${uid}/tasks/${c.inv.taskId}`).catch(() => null))) await io.set(`orgs/${uid}/tasks/${c.inv.taskId}`, { done: true, doneAt: now }).catch(() => {});
    res.paid.push({ seller: c.inv.seller, amount: c.inv.amount, currency: c.inv.currency });
  }
  if (res.paid.length) {
    const ids = new Set(found.filter((x) => x.sure).map((x) => x.inv.id));
    await io.set(`orgs/${uid}/invoiceIndex/open`, { list: list.filter((x) => !ids.has(x.id)), at: now });
  }
  return res.paid.length || res.guess ? res : null;
}

// Bildirim: { title, body } ya da null
export function invoiceText(res) {
  if (!res?.paid?.length) return null;
  const p = res.paid;
  const title = p.length === 1 ? `Fatura ödendi: ${p[0].seller || "Fatura"}` : `${p.length} fatura ödendi`;
  const body = [p.length === 1 ? amountText(p[0]) : p.slice(0, 2).map((x) => x.seller).join(", "), "bankadan görüldü"].filter(Boolean).join(" · ");
  return { title: title.length > 44 ? `${title.slice(0, 43)}…` : title, body };
}
