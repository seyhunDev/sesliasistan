import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady } from "@/lib/server/admin";
import { isAthleteSide } from "@/lib/kinds";

export const runtime = "nodejs";

// Sporcunun kayıtlı olduğu yarışlar (Seyhun 2026-11-25 "sporcuda yarışlar gözükmesin, kaydedildiyse o gösterilebilir"):
// sporcu kulübün yarış listesini (orgs/{org}/races) okuyamaz; sunucu sporcunun kulüp kimliğini yoklama kopyasından
// (athleteAtt/{uid}.athleteId; veli için bağlı sporcular) bulur ve yalnız onun yazılı olduğu yarışların adını, tarihini, yerini döndürür.
// Yarışın sporcu listesi, bütçe, belgeler gibi diğer bilgiler dönmez. Dönüş: { races: [{ id, name, startDate, endDate, place, who }] }
export async function GET(request) {
  const au = await requireUser(request, { free: true }); // yapay zeka değil, kullanım sınırına sayılmaz
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ races: [] });
  const db = adminDb();
  const u = (await db.collection("users").doc(au.uid).get()).data() || {};
  if (u.role !== "staff" || !u.orgId || !isAthleteSide(u.kind)) return NextResponse.json({ races: [] });
  const att = db.collection("orgs").doc(u.orgId).collection("athleteAtt");
  const recs =
    u.kind === "parent"
      ? (await att.where("parents", "array-contains", au.uid).limit(10).get()).docs.map((d) => d.data())
      : [(await att.doc(au.uid).get()).data()].filter(Boolean);
  const names = new Map(recs.filter((r) => r.athleteId).map((r) => [String(r.athleteId), String(r.name || "")]));
  if (!names.size) return NextResponse.json({ races: [] });
  const snap = await db.collection("orgs").doc(u.orgId).collection("races").where("athleteIds", "array-contains-any", [...names.keys()].slice(0, 10)).get();
  const races = snap.docs
    .map((d) => {
      const r = d.data();
      const who = (r.athleteIds || []).filter((id) => names.has(id)).map((id) => names.get(id)).filter(Boolean);
      return { id: d.id, name: String(r.name || "Yarış").slice(0, 120), startDate: r.startDate || "", endDate: r.endDate || r.startDate || "", place: [r.district, r.city].filter(Boolean).join(", ").slice(0, 80), who: u.kind === "parent" ? who : [] };
    })
    .filter((r) => r.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return NextResponse.json({ races }, { headers: { "cache-control": "no-store" } });
}
