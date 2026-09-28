import { requireUser, unauthorized } from "@/lib/server/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.STT_MODEL || "gpt-4o-mini-transcribe";
const HINT = "Spor kulübü, yelken, antrenman, Optimist, Laser, ıskota, fiş, fatura, KDV, plan, görev, not.";

function send(file, model) {
  const fd = new FormData();
  fd.append("file", file, file.name || "kayit.webm");
  fd.append("model", model);
  fd.append("language", "tr");
  fd.append("prompt", HINT);
  return fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: fd,
  });
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized();
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Bu modda ses çevirisi için sunucuda OPENAI_API_KEY gerekli. Safari'de (ana ekran dışında) canlı ses çalışır." },
      { status: 501 },
    );
  }
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const file = form.get("audio");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Ses dosyası yok" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Kayıt çok uzun" }, { status: 413 });

  try {
    let res = await send(file, MODEL);
    // Model adı hesapta yoksa eski, yaygın modele düş
    if (!res.ok && MODEL !== "whisper-1" && [400, 404].includes(res.status)) res = await send(file, "whisper-1");
    if (!res.ok) {
      console.error("[transcribe]", res.status, (await res.text()).slice(0, 300));
      return NextResponse.json({ error: "Ses çevrilemedi" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ text: String(data.text || "").trim() });
  } catch (e) {
    console.error("[transcribe]", e.message);
    return NextResponse.json({ error: "Ses çevirisi başarısız" }, { status: 502 });
  }
}
