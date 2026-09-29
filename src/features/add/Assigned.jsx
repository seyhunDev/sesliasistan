"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { repliesOf } from "@/lib/people";
import { rel, when } from "@/lib/utils/format";
import { stamp } from "./EditCard";

const KIND = { plan: "Plan", task: "Görev", note: "Not" };

// Kayda eklenen notlar (atanan kişilerin ve ana hesabın) + yeni not yazma
export function Replies({ rec, myUid, nameOf, onSend, placeholder = "Not ekle…" }) {
  const [text, setText] = useState("");
  const list = repliesOf(rec);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return (
    <div className="mt-3 rounded-2xl bg-card px-4 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <h3 className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mut">
        <Icon name="note" className="size-4" /> Notlar{list.length ? ` · ${list.length}` : ""}
      </h3>
      {list.map((r, i) => (
        <div key={`${r.uid}-${r.at}-${i}`} className="border-b border-line py-2 last:border-0">
          <p className="text-[12px] text-mut">
            <b className="font-semibold text-fg">{r.uid === myUid ? "Sen" : nameOf(r.uid) || "Kişi"}</b> · {stamp(r.at)}
          </p>
          <p className="whitespace-pre-wrap text-[15px] leading-snug">{r.text}</p>
        </div>
      ))}
      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          placeholder={placeholder}
          aria-label="Not"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl bg-bg px-3 py-2.5 text-[15px] outline-none focus:bg-card focus:ring-1 focus:ring-acc"
        />
        <button onClick={send} disabled={!text.trim()} aria-label="Notu gönder" className="grid size-10 shrink-0 place-items-center rounded-full bg-acc text-white disabled:opacity-40 active:scale-90">
          <Icon name="up" className="size-5" />
        </button>
      </div>
    </div>
  );
}

// Başkasının verdiği kayıt (çalışan görünümü): değiştiremez; yalnızca kendisi için tamamladım der ve not ekler
export function AssignedView({ kind, rec, planTitle, myUid, nameOf, onDone, onReply }) {
  const mine = rec.doneBy?.[myUid];
  const by = nameOf(rec.createdByUid) || "Ana hesap";
  const rows = [
    kind === "plan" && rec.date && ["cal", "Zaman", when(rec)],
    kind === "task" && rec.due && ["cal", "Son gün", rel(rec.due)],
    kind === "plan" && rec.place && ["pin", "Yer", rec.place],
    rec.cat && rec.cat !== "Genel" && ["tag", "Kategori", rec.cat],
    planTitle && ["cal", "Bağlı plan", planTitle],
  ].filter(Boolean);

  return (
    <div>
      <div className="rounded-2xl bg-card px-4 py-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-acc">{KIND[kind]}</p>
        <h3 className="mt-1 text-[20px] font-semibold leading-snug">{rec.title}</h3>
        {kind === "note" && rec.body && rec.body !== rec.title && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{rec.body}</p>}
        {rows.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {rows.map(([ic, label, value]) => (
              <li key={label} className="flex items-center gap-3 py-2.5 text-[15px]">
                <Icon name={ic} className="size-5 shrink-0 text-mut" />
                <span>{label}</span>
                <span className="ml-auto min-w-0 truncate text-right font-medium">{value}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-mut">
          <Icon name="user" className="size-4" /> {by} verdi{rec.createdAt ? ` · ${stamp(rec.createdAt)}` : ""} · değiştiremezsin
        </p>
      </div>

      {/* Yalnızca kendisi için */}
      <button
        onClick={() => onDone(!mine)}
        className={`mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold transition active:scale-[.98] ${mine ? "bg-ok/10 text-ok ring-1 ring-ok/30" : "bg-acc text-white"}`}
      >
        <Icon name="check" className="size-5 [stroke-width:2.5]" />
        {mine ? `Tamamladın · ${stamp(mine)}` : "Tamamladım"}
      </button>
      {mine && <p className="mt-1 text-center text-[12px] text-mut">Geri almak için tekrar dokun</p>}

      <Replies rec={rec} myUid={myUid} nameOf={nameOf} onSend={onReply} placeholder="Ana hesaba not yaz…" />
    </div>
  );
}
