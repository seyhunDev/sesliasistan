import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";

export const runtime = "nodejs";

// Fişe kulüp genelinde sıralı, tekrarsız numara verir (F-0001…). Sayaç orgs/{org}/counters/receipts {n}.
// Numara bir kez verilir; fiş silinse de sayaç geri gitmez. { ids: [fiş kimlikleri] } → { nos: { id: n } }
// Ana hesap her fişe, diğerleri yalnız kendi eklediği fişe numara alabilir. Kurallar değişmez (yönetici SDK).
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu hazır değil" }, { status: 503 });
  let body;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : [body?.id]).map((x) => String(x || "")).filter((x) => /^[\w-]{1,64}$/.test(x)))].slice(0, 200);
  if (!ids.length) return NextResponse.json({ error: "Fiş belirtilmedi" }, { status: 400 });
  const me = await profileOf(au.uid);
  if (!me?.orgId) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  const owner = me.role === "owner";
  const org = adminDb().collection("orgs").doc(me.orgId);
  const counter = org.collection("counters").doc("receipts");
  const refs = ids.map((id) => org.collection("receipts").doc(id));

  const nos = await adminDb().runTransaction(async (t) => {
    const [c, ...docs] = await t.getAll(counter, ...refs);
    let n = c.exists ? Number(c.get("n")) || 0 : 0;
    const out = {};
    // Numarasızlar eklenme sırasına göre (eski fişler toplu numaralanınca sıra tarihle uyuşsun)
    const todo = docs
      .filter((d) => d.exists && (owner || d.get("createdByUid") === au.uid))
      .filter((d) => {
        const no = Number(d.get("no"));
        if (no > 0) out[d.id] = no;
        return !(no > 0);
      })
      .sort((a, b) => `${a.get("date") || ""}${a.get("createdAt") || ""}`.localeCompare(`${b.get("date") || ""}${b.get("createdAt") || ""}`));
    for (const d of todo) {
      n += 1;
      out[d.id] = n;
      t.update(d.ref, { no: n });
    }
    if (todo.length) t.set(counter, { n }, { merge: true });
    return out;
  });
  return NextResponse.json({ ok: true, nos });
}
