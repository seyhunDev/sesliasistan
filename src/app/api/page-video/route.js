import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { absUrl, findPageVideo, publicPage } from "@/lib/fitness/pageVideo";

export const runtime = "nodejs";

// Hareket sayfasının bağlantısı verilir (başka bir site), sayfa burada indirilir ve içindeki video bulunur.
// Telefon sayfayı kendisi okuyamaz (siteler izin vermez). Yalnız giriş yapanlar; yalnız açık internetteki sayfalar.
const MAX = 3 * 1024 * 1024;

async function readText(res) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const parts = [];
  let size = 0;
  while (size < MAX) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(parts.map((p) => Buffer.from(p))));
}

// Ad yerel ağa çıkıyorsa indirilmez
const PRIVATE = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|f[cd]|fe80|::ffff:(10|127|192\.168|169\.254)\.)/i;
async function openHost(page) {
  try {
    const list = await lookup(new URL(page).hostname, { all: true });
    return list.length > 0 && list.every((a) => !PRIVATE.test(a.address));
  } catch {
    return false;
  }
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const { url } = await request.json().catch(() => ({}));
  const page = publicPage(url);
  if (!page) return NextResponse.json({ error: "Bağlantı bir web sayfası olmalı (https://…)" }, { status: 400 });
  if (!(await openHost(page))) return NextResponse.json({ error: "Sayfaya ulaşılamadı" }, { status: 502 });
  // Yönlendirmeler tek tek izlenir: her adrese gitmeden önce iç ağ mı diye bakılır (sistem taraması 2026-11-26, madde 6)
  let res;
  let at = page;
  try {
    for (let hop = 0; ; hop++) {
      res = await fetch(at, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "tr,en;q=0.8",
        },
      });
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : "";
      if (!loc) break;
      const next = publicPage(new URL(loc, at).href);
      if (hop >= 5 || !next || !(await openHost(next))) return NextResponse.json({ error: "Sayfaya ulaşılamadı" }, { status: 502 });
      at = next;
    }
  } catch {
    return NextResponse.json({ error: "Sayfaya ulaşılamadı" }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ error: `Sayfa açılmadı (${res.status})` }, { status: 502 });
  const type = res.headers.get("content-type") || "";
  if (/^video\//i.test(type)) return NextResponse.json({ video: absUrl(at) });
  if (type && !/html|xml|text/i.test(type)) return NextResponse.json({ error: "Bu bağlantı bir sayfa değil" }, { status: 400 });
  const html = await readText(res).catch(() => "");
  const found = findPageVideo(html, at);
  if (!found) return NextResponse.json({ error: "Bu sayfada video bulamadım" }, { status: 404 });
  return NextResponse.json(found);
}
