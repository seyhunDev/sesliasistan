// Maile ekli Excel/CSV dosyalarını hesap özetine çevirir. Hem tarayıcı (Mailler sayfası) hem zamanlanmış bildirim görevi kullanır.
// raw: [{ name, data (base64) }] — Gmail betiği ekleri böyle kaydeder. XLSX: SheetJS modülü (çağıran yükler).
import { parseStatement } from "./bankSheet.js";

const b64 = (s) => (typeof Buffer !== "undefined" ? Buffer.from(s, "base64") : Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

// Firestore dizi içinde dizi saklamaz: her satır { v: [...] } olarak döner
export function sheetsFromRaw(raw, XLSX, maxRows = 500) {
  const out = [];
  for (const f of raw || []) {
    if (!/\.(xlsx?|csv)$/i.test(f?.name || "") || !f.data) continue;
    try {
      const wb = XLSX.read(b64(f.data), { type: typeof Buffer !== "undefined" ? "buffer" : "array", cellDates: true });
      for (const n of wb.SheetNames.slice(0, 3)) {
        const s = parseStatement(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }), maxRows);
        if (s.columns.length || Object.keys(s.meta).length) out.push({ name: n, file: f.name, ...s, rows: s.rows.map((v) => ({ v })) });
      }
    } catch (e) {
      console.warn("[mail] ek okunamadı:", f.name, e?.message);
    }
  }
  return out;
}
// SheetJS modülünü her ortamda aynı biçimde verir (ESM/CJS farkı)
export const xlsxOf = (m) => (m?.read ? m : m?.default);
