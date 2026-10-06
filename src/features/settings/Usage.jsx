"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { monthName, sttUsage, usageRows, usd } from "@/lib/aiUsage";
import { Row } from "./ui";

// Ayarlar › Kullanım (ana hesap): bu ay yapay zekaya kaç istek gitti (işe göre), geçen ay, Instagram görselleri ve yaklaşık maliyet.
// Google kalan kotayı API ile vermediği için sayaç uygulamanındır. Firebase kullanımı için konsol bağlantısı.
export function UsageRow() {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || d) return;
    try {
      const res = await authFetch("/api/usage?ai=1");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Okunamadı");
      setD(j);
    } catch (e) {
      setErr(e.message || "Okunamadı");
    }
  };
  const cur = usageRows(d?.ai?.month);
  const prev = usageRows(d?.ai?.prev);
  const img = d?.img;
  const stt = sttUsage(d?.ai?.month);
  const textCost = (n) => n * (d?.textPrice || 0.001);
  return (
    <Row icon="chart" tone="sky" title="Kullanım" sub="Yapay zeka istekleri ve yaklaşık maliyet" onClick={toggle} chevron>
      {open && (
        <div className="px-4 pb-3 text-[0.875rem]">
          {err ? (
            <p className="text-rec">{err}</p>
          ) : !d ? (
            <p className="text-mut">Yükleniyor…</p>
          ) : (
            <>
              <p className="font-semibold">
                {monthName(d.ai?.month?.month)}: {cur.total} istek
                {img?.month ? ` · ${img.month} görsel` : ""} · ≈ {usd(textCost(cur.total) + (img?.cost || 0) + stt.cost)}
              </p>
              {cur.rows.length > 0 && (
                <ul className="mt-1.5 divide-y divide-line rounded-xl bg-bg px-3">
                  {cur.rows.map(([k, n]) => (
                    <li key={k} className="flex justify-between py-1.5">
                      <span>{k}</span>
                      <b className="tabular-nums">{n}</b>
                    </li>
                  ))}
                </ul>
              )}
              {stt.min > 0 && (
                <p className="mt-2 text-mut">
                  Gemini ses tanıma: bu ay {stt.min.toLocaleString("tr-TR")} dk (≈ {usd(stt.cost)})
                </p>
              )}
              {img && <p className="mt-2 text-mut">Instagram görseli: bugün {img.today}/{img.limit}, bu ay {img.month} (≈ {usd(img.cost)})</p>}
              {prev.total > 0 && <p className="mt-1 text-mut">{monthName(d.ai?.prev?.month)}: {prev.total} istek (≈ {usd(textCost(prev.total))})</p>}
              <p className="mt-2 text-[0.75rem] leading-snug text-mut">
                Sayaç bu sürümden itibaren sayar. Metin isteği başına ≈ ${String(d.textPrice || 0.001).replace(".", ",")} varsayıldı (Gemini Flash); gerçek tutar için{" "}
                <a href="https://aistudio.google.com/usage" target="_blank" rel="noreferrer" className="font-semibold text-acc">AI Studio</a>, Firebase okuma/yazma için{" "}
                <a href="https://console.firebase.google.com/project/sesliasistan-3e95a/firestore/usage" target="_blank" rel="noreferrer" className="font-semibold text-acc">Firebase › Kullanım</a>.
              </p>
            </>
          )}
        </div>
      )}
    </Row>
  );
}
