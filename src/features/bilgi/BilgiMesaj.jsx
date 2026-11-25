"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { delLog, hideMsg, offScreen, pinMsg, unpinMsg } from "./bilgiStore";

// Mesajlar (Seyhun 2026-11-23 örnek onaylandı "gönderdiğim mesajları liste olarak görmeli, silmeli, gizlemeli, sabitlemeli"): Yönet'ten
// giden yazılı mesajlar en yenisi üstte (bilgiLog kind "msg"). Satırda saat, mesaj, kime ve kimin gördüğü; durum etiketi Sabit / Ekranda / Gizli.
// ⋯ menüsünde Sabitle (sporcu ekranında Yönet kaldırana kadar durur, aynı anda bir tane), Gizle (ekrandan hemen kalkar), Sil ("Geri al" ile).
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (t) => `${pad(new Date(t).getHours())}:${pad(new Date(t).getMinutes())}`;
const SHOW_MS = 60e3; // sabit olmayan mesaj sporcu ekranında 1 dk durur (FRESH_MS)

export function MsgList({ org, b, log, now, onChange }) {
  const toast = useToast();
  const [menu, setMenu] = useState("");
  const [gone, setGone] = useState([]);
  const [busy, setBusy] = useState(false);
  const rows = (log || []).filter((r) => r.kind === "msg" && r.logId && !gone.includes(r.logId));
  if (!log) return <p className="text-mut">Yükleniyor…</p>;
  if (!rows.length) return <p className="text-mut">Mesaj yok</p>;
  const run = async (fn) => {
    setMenu("");
    setBusy(true);
    await fn().catch(() => toast("Kaydedilemedi"));
    setBusy(false);
    onChange?.();
  };
  const del = (r) => {
    let undone = false;
    const wasPin = b?.pin?.id === r.id;
    setMenu("");
    setGone((g) => [...g, r.logId]);
    offScreen(org, b, r.id).catch(() => {});
    toast("Mesaj silindi", {
      action: {
        label: "Geri al",
        onClick: () => {
          undone = true;
          setGone((g) => g.filter((x) => x !== r.logId));
          if (wasPin) pinMsg(org, r).catch(() => {});
        },
      },
      duration: 6000,
    });
    setTimeout(async () => {
      if (undone) return;
      await delLog(org, r.logId).catch(() => toast("Silinemedi"));
      onChange?.();
    }, 6500);
  };
  return (
    <div className="bzy-list">
      {rows.map((r) => {
        const pinned = b?.pin?.id === r.id;
        const onScr = !pinned && !r.hid && b?.msg?.id === r.id && now - (b.msg.at || 0) < SHOW_MS;
        const tag = pinned ? ["pin", "Sabit"] : r.hid ? ["off", "Gizli"] : onScr ? ["on", "Ekranda"] : null;
        const seen = r.st === "seen" ? `✓✓${r.of > 1 ? ` ${r.seen}/${r.of}` : ""}` : r.st === "part" ? `${r.seen}/${r.of} gördü` : r.st === "sent" ? "✓" : r.st ? "Ulaşmadı" : "";
        // Eski kayıtlarda tek sporcuya gidenin cihazı yazılmamış: o mesaj sabitlenemez (herkese gider)
        const canPin = !r.to || !!r.dev;
        return (
          <div key={r.logId} className="bzy-kli">
            <div className={`bzy-li bzy-mli${r.hid && !pinned ? " old" : ""}`}>
              <time className="num">{hhmm(r.at)}</time>
              <div className="min-w-0 flex-1">
                <b>
                  {r.text}
                  {tag && (
                    <em className="bzy-tag" data-k={tag[0]}>
                      {tag[1]}
                    </em>
                  )}
                </b>
                <span>{[r.to || "Hepsi", seen].filter(Boolean).join(" · ")}</span>
              </div>
              <button type="button" className="bzy-ic" onClick={() => setMenu((x) => (x === r.logId ? "" : r.logId))} aria-label="Diğer" aria-expanded={menu === r.logId} data-press>
                <svg viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                </svg>
              </button>
            </div>
            {menu === r.logId && (
              <div className="bzy-kmenu">
                {pinned ? (
                  <button type="button" disabled={busy} onClick={() => run(() => unpinMsg(org))} data-press>
                    Sabitlemeyi kaldır
                  </button>
                ) : canPin ? (
                  <button type="button" disabled={busy} onClick={() => run(() => Promise.all([pinMsg(org, r), r.hid ? hideMsg(org, b, r, false) : null]))} data-press>
                    Sabitle
                  </button>
                ) : null}
                {!r.hid && (
                  <button type="button" disabled={busy} onClick={() => run(() => hideMsg(org, b, r, true))} data-press>
                    Gizle
                  </button>
                )}
                <button type="button" className="del" onClick={() => del(r)} data-press>
                  Sil
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
