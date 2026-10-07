"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { cleanRooms, roomLine } from "./budget";

const day = (s) => new Date(`${s}T12:00:00`);
const short = (s) => day(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
const tel = (p) => `tel:${String(p).replace(/[^\d+]/g, "")}`;

// Talimat yükleme kartı: dosya (PDF, fotoğraf; uzantısız olsa da) ya da kopyalanan metin
export function NoticeUpload({ busy, onFile, onText, title = "Yarış talimatını yükle", sub = "PDF, fotoğraf ya da metin. Ad, tarih, yer, program, son tarihler, ücret ve oteller kendiliğinden dolar." }) {
  const input = useRef(null);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const btn = "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[0.875rem] font-semibold disabled:opacity-50";
  return (
    <div className={`${card} px-4 py-3.5`}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
          <Icon name={busy ? "load" : "paperclip"} className={`size-5 ${busy ? "animate-spin" : ""}`} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-semibold">{busy ? "Talimat okunuyor…" : title}</b>
          <span className="block text-[0.8125rem] leading-snug text-mut">{busy ? "Biraz sürebilir, sayfadan çıkma." : sub}</span>
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={`${btn} bg-acc text-white`}>
          <Icon name="paperclip" className="size-[1.125rem]" />
          Dosya seç
        </button>
        <button type="button" disabled={busy} onClick={() => setPaste(true)} className={`${btn} bg-bg text-acc`}>
          <Icon name="note" className="size-[1.125rem]" />
          Metin yapıştır
        </button>
      </div>
      {/* accept yok: iPhone uzantısız dosyaları (WhatsApp'tan gelen talimat) soluk gösterip seçtirmiyor; tür içerikten anlaşılır */}
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <Sheet open={paste} onClose={() => setPaste(false)} title="Talimat metni">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Talimatın tamamını ya da önemli bölümlerini (tarihler, kayıt, ücret, program, konaklama) buraya yapıştır"
          rows={12}
          className="block w-full resize-none rounded-2xl bg-bg px-4 py-3 text-[0.9375rem] leading-relaxed outline-none placeholder:text-mut/70"
        />
        <button
          type="button"
          disabled={text.trim().length < 40}
          onClick={() => {
            setPaste(false);
            onText(text);
            setText("");
          }}
          className="sticky bottom-0 mt-3 h-12 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50"
        >
          Talimatı oku
        </button>
      </Sheet>
    </div>
  );
}

const List = ({ children }) => <ul className={`${card} divide-y divide-line overflow-hidden`}>{children}</ul>;


// Talimattan okunanlar: özet, program, ücretler, konaklama, iletişim, önemli notlar.
// Talimat dosyası (aç, değiştir, kaldır) yarış sayfasının en üstünde (RaceEditor).
export function NoticeDetails({ n, onRooms, roomsBusy }) {
  if (!n) return null;
  const days = [];
  for (const s of n.schedule || []) {
    const last = days.at(-1);
    if (last?.date === s.date) last.items.push(s);
    else days.push({ date: s.date, items: [s] });
  }
  return (
    <>
      <Label>TALİMAT BİLGİLERİ</Label>
      {(n.summary || n.organizer || n.venue || n.classes?.length > 0) && (
        <>
          <div className={`${card} space-y-1.5 px-4 py-3 text-[0.875rem]`}>
            {n.summary && <p className="leading-relaxed">{n.summary}</p>}
            {[["Düzenleyen", n.organizer], ["Yer", n.venue], ["Sınıflar", n.classes?.join(", ")]].map(
              ([k, v]) =>
                v && (
                  <p key={k} className="flex gap-2">
                    <span className="w-24 shrink-0 text-mut">{k}</span>
                    <span className="min-w-0 flex-1">{v}</span>
                  </p>
                ),
            )}
          </div>
        </>
      )}

      {days.length > 0 && (
        <>
          <Label>PROGRAM</Label>
          <List>
            {days.map((d) => (
              <li key={d.date} className="px-4 py-3">
                <b className="block text-[0.75rem] font-bold tracking-wide text-mut">{short(d.date).toLocaleUpperCase("tr-TR")}</b>
                <ul className="mt-1 space-y-1">
                  {d.items.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[0.875rem]">
                      <span className="w-11 shrink-0 tabular-nums text-mut">{s.time || "—"}</span>
                      <span className="min-w-0 flex-1">{s.title}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </List>
        </>
      )}

      {n.fees?.length > 0 && (
        <>
          <Label>ÜCRETLER</Label>
          <List>
            {n.fees.map((f, i) => (
              <li key={i} className="px-4 py-2.5">
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 text-[0.9375rem]">{f.title}</span>
                  <b className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{f.amount}</b>
                </span>
                {f.note && <span className="block select-text break-words text-[0.8125rem] text-mut">{f.note}</span>}
              </li>
            ))}
          </List>
        </>
      )}

      {n.hotels?.length > 0 && (
        <>
          <Label>KONAKLAMA</Label>
          <List>
            {n.hotels.map((h, i) => (
              <li key={i} className="px-4 py-2.5">
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <b className="block text-[0.9375rem] font-semibold">{h.name}</b>
                    {h.note && <span className="block select-text break-words text-[0.8125rem] text-mut">{h.note}</span>}
                  </span>
                  {h.phone && (
                    <a href={tel(h.phone)} aria-label={`${h.name} ara`} className="grid size-9 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
                      <Icon name="phone" className="size-[1.125rem]" />
                    </a>
                  )}
                </span>
                {cleanRooms(h.rooms).length > 0 && (
                  <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-bg">
                    {cleanRooms(h.rooms).map((x, j) => (
                      <li key={j} className="flex items-baseline gap-3 px-3 py-2">
                        <span className="min-w-0 flex-1 text-[0.875rem]">
                          {x.label || (x.cap === 1 ? "Tek kişilik" : `${x.cap} kişilik`)}
                          {x.board && <span className="block text-[0.75rem] text-mut">{x.board}</span>}
                        </span>
                        <span className="shrink-0 text-right">
                          <b className="block text-[0.875rem] font-semibold tabular-nums">{x.price || roomLine(x)}</b>
                          {x.amount > 0 && x.cap > 1 && <span className="block text-[0.75rem] tabular-nums text-mut">{roomLine(x).split(" · ").slice(1, 3).join(" · ")}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </List>
          {onRooms && !n.hotels.some((h) => cleanRooms(h.rooms).length) && (
            <button type="button" disabled={roomsBusy} onClick={onRooms} className="mt-2 w-full rounded-xl px-4 py-2.5 text-left text-[0.8125rem] font-semibold text-acc ring-1 ring-line disabled:opacity-50">
              {roomsBusy ? "Talimat yeniden okunuyor…" : "Oda fiyatlarını talimattan yeniden oku"}
            </button>
          )}
        </>
      )}

      {n.contacts?.length > 0 && (
        <>
          <Label>İLETİŞİM</Label>
          <List>
            {n.contacts.map((c, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold">{c.name}</b>
                  <span className="block truncate text-[0.8125rem] text-mut">{[c.role, c.email].filter(Boolean).join(" · ")}</span>
                </span>
                {c.email && (
                  <a href={`mailto:${c.email}`} aria-label="E-posta" className="grid size-9 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
                    <Icon name="mail" className="size-[1.125rem]" />
                  </a>
                )}
                {c.phone && (
                  <a href={tel(c.phone)} aria-label={`${c.name} ara`} className="grid size-9 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
                    <Icon name="phone" className="size-[1.125rem]" />
                  </a>
                )}
              </li>
            ))}
          </List>
        </>
      )}

      {n.notes && (
        <>
          <Label>ÖNEMLİ</Label>
          <div className={`${card} whitespace-pre-line px-4 py-3 text-[0.875rem] leading-relaxed`}>{n.notes}</div>
        </>
      )}

    </>
  );
}
