"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";

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

const sizeText = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const dayText = (s) => (s ? day(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "");

// Talimat dosyası (PDF): aç, paylaş. Her cihazdan açılır (noticeFile.js)
export function NoticeFile({ file, opening, onOpen, onShare }) {
  return (
    <div className={`${card} flex items-center gap-1 pl-4 pr-1.5`}>
      <button type="button" onClick={onOpen} disabled={opening} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left disabled:opacity-60">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rec/10 text-[0.625rem] font-bold text-rec">{opening ? <Icon name="load" className="size-4 animate-spin" /> : "PDF"}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">Talimatı aç</b>
          <span className="block truncate text-[0.8125rem] text-mut">{[file.name, sizeText(file.size), dayText(file.at)].filter(Boolean).join(" · ")}</span>
        </span>
      </button>
      <button type="button" onClick={onShare} disabled={opening} aria-label="Talimatı paylaş" className="grid size-10 shrink-0 place-items-center text-acc disabled:opacity-60">
        <Icon name="up" className="size-5" />
      </button>
    </div>
  );
}

// Talimatın geri kalanı: program, ücretler, konaklama, iletişim, önemli notlar.
// file: saklanan talimat dosyası; yoksa (eski yarışlarda bilgiler okunmuş ama dosya saklanmamış) yükleme uyarısı çıkar
export function NoticeDetails({ n, busy, onFile, onText, file, opening, onOpen, onShare }) {
  if (!n) return null;
  const days = [];
  for (const s of n.schedule || []) {
    const last = days.at(-1);
    if (last?.date === s.date) last.items.push(s);
    else days.push({ date: s.date, items: [s] });
  }
  return (
    <>
      <Label>TALİMAT</Label>
      {file ? (
        <NoticeFile file={file} opening={opening} onOpen={onOpen} onShare={onShare} />
      ) : (
        <NoticeUpload
          busy={busy}
          onFile={onFile}
          onText={onText}
          title="Talimat dosyası kayıtlı değil"
          sub="Bilgiler daha önce okundu ama dosyanın kendisi saklanmamıştı. Aynı talimatı yükle; saklarım, okunanla karşılaştırırım, fark varsa söylerim."
        />
      )}
      {(n.summary || n.organizer || n.venue || n.classes?.length > 0) && (
        <>
          <div className={`${card} mt-2.5 space-y-1.5 px-4 py-3 text-[0.875rem]`}>
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
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold">{h.name}</b>
                  {h.note && <span className="block text-[0.8125rem] text-mut">{h.note}</span>}
                </span>
                {h.phone && (
                  <a href={tel(h.phone)} aria-label={`${h.name} ara`} className="grid size-9 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
                    <Icon name="phone" className="size-[1.125rem]" />
                  </a>
                )}
              </li>
            ))}
          </List>
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

      {file && <div className="mt-4">
        <NoticeUpload busy={busy} onFile={onFile} onText={onText} title="Talimatı yeniden yükle" sub="Güncel talimat gelince yükle; program ve son tarihler yenilenir, girdiğin bilgiler korunur. Fark varsa önce gösteririm." />
      </div>}
    </>
  );
}
