import { NextResponse } from "next/server";
import { adminDb, adminReady } from "@/lib/server/admin";
import { ackOk } from "@/lib/server/pushSend";
import { TEST_COL } from "@/lib/server/pushTestSend";

export const runtime = "nodejs";

// Bildirim telefona ulaştı ("iletildi"): service worker, bildirimdeki imzalı bilgiyle çağırır (oturum gerekmez).
// Yalnızca o kaydın o kişi için iletilme zamanını ilk kez yazar.
export async function POST(request) {
  let a;
  try {
    a = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!adminReady() || !ackOk(a)) return NextResponse.json({ ok: false }, { status: 403 });
  // Bildirim testi (lib/pushTest): telefona ulaştığı an kişinin deneme kaydına yazılır
  if (a.c === TEST_COL && a.o === a.u) {
    const ref = adminDb().collection("users").doc(String(a.u));
    const t = (await ref.get()).data()?.pushTests?.[a.i];
    if (t && !t.got) await ref.update({ [`pushTests.${a.i}.got`]: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  }
  if (!["plans", "tasks", "notes"].includes(a.c)) return NextResponse.json({ ok: false }, { status: 403 });
  const ref = adminDb().collection("orgs").doc(String(a.o)).collection(a.c).doc(String(a.i));
  const r = (await ref.get()).data();
  if (!r || r.ack?.[a.u]?.d) return NextResponse.json({ ok: true });
  await ref.update({ [`ack.${a.u}.d`]: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
