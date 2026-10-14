import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { fromFields, toValue } from "@/lib/server/firestoreRest";
import { MAIL_ROWS, sheetsFromRaw, xlsxOf } from "@/lib/mailParse";

export const runtime = "nodejs";

// Banka maillerinin Excel eklerini sunucuda siler (Ayarlar › Mail eklerini sil). Telefon büyük mailleri indirmez.
// Kişinin kendi oturum anahtarıyla Firestore ve Storage REST kullanılır (kurallar geçerli; yönetici anahtarı gerekmez).
// { mode: "files" }: Storage'a taşınmış ekler (mailde rawFiles) Storage'dan ve mailden silinir.
// { mode: "raw" }: mailin içindeki ham ek (raw) silinir; tablosu (sheets) yoksa önce okunup yazılır.
// Her çağrı ~7 sn çalışır, { done, left } döner; telefon left false olana kadar yeniden çağırır.
// Bakiye, aidat, fatura ve banka defteri yalnız tabloyu kullanır; orijinal dosya Gmail'de durur.
const BUDGET = 7000;

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return NextResponse.json({ error: "Yalnız ana hesap" }, { status: 403 });
  const token = (request.headers.get("authorization") || "").slice(7).trim();
  const { mode } = await request.json().catch(() => ({}));
  if (mode !== "files" && mode !== "raw") return NextResponse.json({ error: "Eksik istek" }, { status: 400 });

  const pid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const fsBase = `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`;
  const auth = { Authorization: `Bearer ${token}` };
  const mailPath = (id) => `orgs/${au.uid}/mails/${id}`;
  const start = Date.now();
  const timeLeft = () => BUDGET - (Date.now() - start);

  // Alanı dolu mailler, yalnız istenen alanlar okunur (ham ek indirilmez)
  async function find(field, select, n) {
    const res = await fetch(`${fsBase}/orgs/${au.uid}:runQuery`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "mails" }],
          select: { fields: select.map((f) => ({ fieldPath: f })) },
          where: { unaryFilter: { field: { fieldPath: field }, op: "IS_NOT_NULL" } },
          limit: n,
        },
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) throw new Error(`sorgu ${res.status} ${JSON.stringify(data?.[0]?.error || data?.error || "").slice(0, 120)}`);
    return data.filter((x) => x.document).map((x) => ({ id: x.document.name.split("/").pop(), ...fromFields(x.document.fields) }));
  }
  // drop alanlarını siler; fields (Firestore değerleri) varsa yazar
  async function patch(id, fields, drop) {
    const mask = [...Object.keys(fields), ...drop].map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
    const res = await fetch(`${fsBase}/${mailPath(id)}?${mask}&currentDocument.exists=true`, {
      method: "PATCH",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ fields }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`yazma ${res.status}`);
  }
  const dropObject = (path) =>
    fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}`, { method: "DELETE", headers: { Authorization: `Firebase ${token}` } }).then(
      (r) => r.ok || r.status === 404,
      () => false,
    );

  let done = 0;
  try {
    if (mode === "files") {
      while (timeLeft() > 1500) {
        const list = await find("rawFiles", ["rawFiles"], 20);
        if (!list.length) return NextResponse.json({ done, left: false });
        for (const m of list) {
          if (timeLeft() < 800) break;
          for (const f of Array.isArray(m.rawFiles) ? m.rawFiles : []) if (f?.path && String(f.path).startsWith(`orgs/${au.uid}/mailFiles/`)) await dropObject(f.path);
          await patch(m.id, {}, ["rawFiles"]);
          done += 1;
        }
      }
      return NextResponse.json({ done, left: true });
    }
    let XLSX = null;
    while (timeLeft() > 1500) {
      const list = await find("raw", ["sheets"], 10);
      if (!list.length) return NextResponse.json({ done, left: false });
      for (const m of list) {
        if (timeLeft() < 800) break;
        if (!m.sheets?.length) {
          // Tablosu yazılmamış eski mail: ek bir kez okunup tablo yazılır, sonra silinir
          const r = await fetch(`${fsBase}/${mailPath(m.id)}?mask.fieldPaths=raw`, { headers: auth, cache: "no-store" });
          const raw = r.ok ? fromFields((await r.json()).fields).raw : null;
          let sheets = [];
          if (Array.isArray(raw) && raw.length) {
            try {
              XLSX ||= xlsxOf(await import("xlsx"));
              sheets = sheetsFromRaw(raw, XLSX, MAIL_ROWS);
            } catch {}
          }
          if (sheets.length) {
            await patch(m.id, { sheets: toValue(sheets) }, ["raw"]);
          } else await patch(m.id, {}, ["raw"]);
        } else await patch(m.id, {}, ["raw"]);
        done += 1;
      }
    }
    return NextResponse.json({ done, left: true });
  } catch (e) {
    console.error("[mail-clean]", e.message);
    return NextResponse.json({ done, left: true, error: String(e.message || e).slice(0, 160) }, { status: done ? 200 : 502 });
  }
}
