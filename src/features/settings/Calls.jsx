"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { monthName } from "@/lib/aiUsage";
import { durationText, mbText, netNote, talkMs } from "@/lib/call";
import { useChat } from "@/features/chat/ChatProvider";
import { Row } from "./ui";

// Ayarlar › Aramalar (ana hesap): bu ayki aramalar, süre, veri, TURN kotası (Cloudflare ücretsiz kısım) ve son 60 arama
// (kim kimi aradı, ne kadar sürdü, kaç MB, TURN'den mi geçti). Veri sunucuda: lib/server/callUsage.js. Açılınca bir kez okunur.
const STATUS_TEXT = { missed: "Cevapsız", declined: "Reddedildi", failed: "Bağlanamadı", ringing: "Çalıyor", active: "Sürüyor" };

export function CallsRow() {
  const { personName } = useChat() || {};
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || d) return;
    try {
      const res = await authFetch("/api/call-stats");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Okunamadı");
      setD(j);
    } catch (e) {
      setErr(e.message || "Okunamadı");
    }
  };
  const m = d?.month || {};
  const pct = d?.limit ? Math.min(100, ((m.relayBytes || 0) / d.limit) * 100) : 0;
  const name = (u) => personName?.(u) || "Kişi";
  return (
    <Row icon="phone" tone="ok" title="Aramalar" sub="Sesli aramalar, veri kullanımı ve kota" onClick={toggle} chevron>
      {open && (
        <div className="px-4 pb-3 text-[0.875rem]">
          {err ? (
            <p className="text-rec">{err}</p>
          ) : !d ? (
            <p className="text-mut">Yükleniyor…</p>
          ) : (
            <>
              <p className="font-semibold">
                {monthName(m.month)}: {m.calls || 0} konuşma · {durationText((m.sec || 0) * 1000)} · {mbText(m.bytes)}
              </p>
              <div className="mt-2 rounded-xl bg-bg px-3 py-2">
                <div className="flex justify-between text-[0.8125rem]">
                  <span>TURN (Cloudflare) kotası</span>
                  <b className="tabular-nums">
                    {mbText(m.relayBytes)} / {mbText(d.limit)}
                  </b>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                  <div className={`h-full rounded-full ${pct >= 80 ? "bg-rec" : "bg-ok"}`} style={{ width: `${Math.max(pct, m.relayBytes ? 1 : 0)}%` }} />
                </div>
                <p className="mt-1.5 text-[0.75rem] leading-snug text-mut">{"%80'de ve dolunca bildirim gelir. Dolunca ay sonuna kadar TURN kapanır (ücret çıkmaz), Wi-Fi'de aramalar sürer."}</p>
              </div>
              {d.prev?.calls > 0 && (
                <p className="mt-2 text-mut">
                  {monthName(d.prev.month)}: {d.prev.calls} konuşma · {mbText(d.prev.bytes)} · TURN {mbText(d.prev.relayBytes)}
                </p>
              )}
              {d.calls?.length > 0 ? (
                <ul className="mt-2 divide-y divide-line rounded-xl bg-bg px-3">
                  {d.calls.map((c) => {
                    const st = Object.values(c.stats || {});
                    const bytes = st.reduce((n, s) => n + (s.sent || 0) + (s.recv || 0), 0);
                    const relay = st.some((s) => s.relay);
                    const ms = talkMs(c);
                    const at = c.at ? new Date(c.at) : null;
                    // Açıldı ama ses bağlanmadı: iki telefon da "bağlanmadı" bildirdi (süre yalnız açma-kapama arası)
                    const noSound = st.length > 0 && st.every((s) => s.ok === false);
                    // Bağlanamayan aramada her telefonun ağ durumu (TURN alındı mı)
                    const notes = ms && !noSound ? [] : Object.entries(c.stats || {}).map(([u, s]) => netNote(s) && `${name(u)}: ${netNote(s)}`).filter(Boolean);
                    return (
                      <li key={c.id} className="py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate">
                            {name(c.from)} → {name(c.to)}
                          </span>
                          <b className={`shrink-0 tabular-nums ${noSound ? "text-rec" : ""}`}>{noSound ? "Ses bağlanamadı" : ms ? durationText(ms) : STATUS_TEXT[c.status] || "—"}</b>
                        </div>
                        <div className="flex justify-between gap-2 text-[0.75rem] text-mut">
                          <span>{at ? at.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                          <span className="tabular-nums">
                            {bytes ? mbText(bytes) : ms && !noSound ? "veri yok" : ""}
                            {relay ? " · TURN" : ""}
                          </span>
                        </div>
                        {notes.length > 0 && <p className="text-[0.75rem] text-rec">{notes.join(" · ")}</p>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-mut">Henüz arama yok.</p>
              )}
              <p className="mt-2 text-[0.75rem] leading-snug text-mut">
                MB, iki telefonun ölçtüğü toplamdır (bu sürümden itibaren). TURN: ses Cloudflare üzerinden aktarıldı (genelde mobil internette); yalnız bunlar kotadan düşer. Gerçek tutar için{" "}
                <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="font-semibold text-acc">Cloudflare</a>.
              </p>
            </>
          )}
        </div>
      )}
    </Row>
  );
}
