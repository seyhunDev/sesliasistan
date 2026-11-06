"use client";

import { useEffect, useState } from "react";
import { YtNeed, ytConnect, ytNewStream, ytStreamInfo } from "@/lib/youtube";

// Kaynağın kalıcı YouTube anahtarı (Seyhun 2026-11-06 çoklu kaynak): bir kez açılır, cihaza (DJI Fly, PRISM, kamera) girilir, hiç değişmez.
// Günün yayınını Yayın sayfası kendisi açar (BroadcastPage ytPrepare). Adres ve anahtar açılınca hazır okunur ki kopyalama dokunuşta olsun
// (iPhone beklemeden sonra panoya yazmaya izin vermez).
export function SrcKey({ src, onStream, toast }) {
  const [info, setInfo] = useState(null);
  const [st, setSt] = useState(""); // busy | need | note
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!src.ytStream) return undefined;
    let on = true;
    ytStreamInfo(src.ytStream).then(
      (d) => on && setInfo(d),
      (e) => on && (e instanceof YtNeed ? setSt("need") : setNote(e?.message || "Anahtar okunamadı"))
    );
    return () => {
      on = false;
    };
  }, [src.ytStream]);

  const open = async () => {
    setSt("busy");
    setNote("");
    try {
      onStream(await ytNewStream(src.name));
      setSt("");
    } catch (e) {
      if (e instanceof YtNeed) setSt("need");
      else (setSt(""), setNote(e?.message || "Anahtar açılamadı"));
    }
  };
  const copy = (t, what) => navigator.clipboard?.writeText(t).then(() => toast(`${what} kopyalandı`), () => toast("Kopyalanamadı"));

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {st === "need" ? (
        <button type="button" onClick={() => ytConnect().catch((e) => setNote(e?.message || "Bağlanılamadı"))} className="masa-b">
          YouTube&apos;a bağlan
        </button>
      ) : !src.ytStream ? (
        <button type="button" onClick={open} disabled={st === "busy"} className="masa-b disabled:opacity-50">
          {st === "busy" ? "Açılıyor…" : "YouTube anahtarı aç"}
        </button>
      ) : (
        <>
          <button type="button" disabled={!info?.url} onClick={() => copy(info.url, "Adres")} className="masa-b disabled:opacity-50">
            Adresi kopyala
          </button>
          <button type="button" disabled={!info?.key} onClick={() => copy(info.key, "Anahtar")} className="masa-b disabled:opacity-50">
            Anahtarı kopyala
          </button>
          {info?.health === "active" ? <span className="text-[0.8125rem] font-semibold text-acc">Görüntü geliyor</span> : null}
        </>
      )}
      {note ? <span className="text-[0.8125rem] text-mut">{note}</span> : null}
    </div>
  );
}
