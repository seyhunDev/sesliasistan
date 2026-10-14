"use client";

// Banka maillerinin Excel ekleri saklanmaz. Gmail betiği ekleri ham (base64, `raw`) yazar; sunucu içindeki tabloyu (`sheets`)
// maile yazıp eki siler (/api/mail/push). Bakiye, aidat, fatura ve banka defteri yalnız tabloyu kullanır, orijinal dosya Gmail'de durur.
// Eskiden kalan ekler (mailde `raw` ya da Storage'a taşınmış `rawFiles`) Ayarlar › Mail eklerini sil ile sunucuda silinir
// (cleanMailFiles → /api/mail/clean); telefon büyük mailleri indirmez.
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { MAIL_ROWS, sheetsFromRaw, xlsxOf } from "@/lib/mailParse";

const bytesOf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

let XLSX = null;
const busy = new Set();

// Hesaplar sayfasında elde duran mailin eki: tablo okunur (yoksa), ek silinir. true: silindi
export async function moveMailFiles(uid, m) {
  if (!m?.raw?.length || busy.has(m.id)) return !m?.raw?.length;
  busy.add(m.id);
  try {
    let patch = {};
    if (!m.sheets?.length) {
      XLSX ||= xlsxOf(await import("xlsx"));
      patch = { sheets: sheetsFromRaw(m.raw, XLSX, MAIL_ROWS) };
    }
    await updateDoc(doc(db, "orgs", uid, "mails", m.id), { ...patch, raw: deleteField() });
    return true;
  } catch (e) {
    console.warn("[mailFiles] silinemedi", m.id, e?.code || e);
    return false;
  } finally {
    busy.delete(m.id);
  }
}

// Bütün eski ekleri sunucuda siler: önce Storage'dakiler, sonra maillerin içindekiler.
// onProg(adım "files" | "raw", silinen sayısı). Dönüş { files, raw } ya da hata fırlatır (mesajı Türkçe).
export async function cleanMailFiles(onProg) {
  const out = { files: 0, raw: 0 };
  for (const mode of ["files", "raw"]) {
    onProg?.(mode, out[mode]);
    for (let round = 0; round < 300; round++) {
      const res = await authFetch("/api/mail/clean", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }), timeout: 25000 });
      const data = await res.json().catch(() => ({}));
      out[mode] += Number(data.done) || 0;
      onProg?.(mode, out[mode]);
      if (!res.ok || data.error) throw new Error(data.error || `Sunucu yanıt vermedi (${res.status})`);
      if (!data.left) break;
    }
  }
  return out;
}

// Ek dosyasının baytları: Storage'dan ya da (taşınmamış mailde) mailin içinden
export async function mailFileBytes(f) {
  if (f.data) return bytesOf(f.data);
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(String(res.status));
  return new Uint8Array(await res.arrayBuffer());
}
