import { NextResponse } from "next/server";
import { BUILD } from "@/lib/buildInfo";

export const dynamic = "force-dynamic";

// Yayındaki en yeni sürüm: sunucu her zaman son yayının kodunu çalıştırır. Telefondaki uygulama kendi sürümüyle
// karşılaştırır, farklıysa "Yeni sürüm var · Güncelle" düğmesi çıkar (newVersion.js). Oturum gerekmez, gizli bilgi yok.
export function GET() {
  return NextResponse.json({ sha: BUILD.sha, at: BUILD.at, msg: BUILD.msg }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
