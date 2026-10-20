import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady } from "@/lib/server/admin";
import { ackSig } from "@/lib/server/pushSend";
import { TEST_COL } from "@/lib/server/pushTestSend";
import { newTest, oldTests, pendingAt } from "@/lib/pushTest";

export const runtime = "nodejs";

// Bildirim testi (Ayarlar › Testler › Bildirim testi). POST { kind }: deneme kaydı açar. 30 sn denemelerini
// push-test-background bekleyip gönderir; o çalışmazsa ya da hatırlatma denemesinde 5 dakikalık zamanlayıcı gönderir.
// DELETE: deneme kayıtlarını siler. Kayıtlar yalnız kişinin kendi belgesinde (users/{uid}.pushTests).
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu anahtarı tanımlı değil" }, { status: 503 });
  let kind = "";
  let tz;
  try {
    const b = await request.json();
    kind = String(b?.kind || "");
    tz = typeof b?.tz === "string" && /^[\w/+-]{1,40}$/.test(b.tz) ? b.tz : undefined;
  } catch {}
  const id = `t${Date.now().toString(36)}`;
  const t = newTest(kind, { id, tz });
  if (!t) return NextResponse.json({ error: "Bilinmeyen deneme" }, { status: 400 });
  const ref = adminDb().collection("users").doc(au.uid);
  const tests = (await ref.get()).data()?.pushTests || {};
  const old = oldTests(tests);
  const keep = Object.fromEntries(Object.entries(tests).filter(([k]) => !old.includes(k)));
  await ref.update({
    ...Object.fromEntries(old.map((k) => [`pushTests.${k}`, FieldValue.delete()])),
    [`pushTests.${id}`]: t,
    pushTestAt: pendingAt({ ...keep, [id]: t }),
  });
  // Hatırlatma denemesi gerçek zamanlayıcıyla gider; diğerleri 30 sn bekleyen işlevle (yalnız Netlify'da)
  if (kind !== "remind" && process.env.NETLIFY) {
    const origin = process.env.URL || new URL(request.url).origin;
    await Promise.race([
      fetch(`${origin}/.netlify/functions/push-test-background`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ u: au.uid, i: id, s: ackSig(au.uid, `${TEST_COL}-run`, id, au.uid) }),
      }).catch(() => {}),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  }
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu anahtarı tanımlı değil" }, { status: 503 });
  await adminDb().collection("users").doc(au.uid).update({ pushTests: FieldValue.delete(), pushTestAt: FieldValue.delete() });
  return NextResponse.json({ ok: true });
}
