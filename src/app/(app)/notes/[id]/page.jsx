"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Sheet } from "@/components/ui/Sheet";
import { Empty } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { stamp } from "@/features/add/EditCard";
import { NOTE_COLORS, noteDonePatch, noteReopenPatch, noteText } from "@/lib/noteState";
import { cap } from "@/lib/utils/format";
import { lockedFor } from "@/lib/people";

// Yazdıkça uzayan yazı alanı
function Grow({ value, onChange, className, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={onChange} className={`block w-full resize-none overflow-hidden bg-transparent outline-none ${className}`} {...rest} />;
}

const btn = "h-11 min-w-0 flex-1 truncate rounded-xl border px-2 text-[0.9375rem] font-semibold transition active:scale-[.97]";
const plain = `${btn} border-line bg-card text-fg shadow-[0_2px_0_rgba(38,40,44,.08)]`;

// Not sayfası (Seyhun 2026-10-23): not tam sayfa açılır, başlığa ya da yazıya dokunup hemen yazılır; Kaydet yok,
// alandan çıkınca, sayfadan ayrılınca ya da uygulama arka plana geçince kendiliğinden kaydedilir. /notes/new boş not açar,
// ilk yazıyla kayıt oluşur. Altta sabit: Yapıldı, Sabitle, Paylaş, ⋯ (Not ayarları: renk, sorumlu, kopyala, arşiv, sil).
export default function NotePage() {
  const { id: param } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();
  const { notes, members, isStaff, myUid, nameOf, updateRecord, saveDrafts, removeWithUndo } = useData();
  const by = { name: profile?.name ?? "Kullanıcı" };
  const [id, setId] = useState(param === "new" ? "" : param);
  const rec = id ? notes.find((n) => n.id === id) : null;
  const [title, setTitle] = useState(rec?.title || "");
  const [body, setBody] = useState(rec?.body && rec.body !== rec.title ? rec.body : "");
  const [menu, setMenu] = useState(false);
  const [who, setWho] = useState(false);
  const saved = useRef({ title: rec?.title || "", body: rec?.body && rec.body !== rec.title ? rec.body : "" });
  const creating = useRef(false);
  const bodyRef = useRef(null);

  // Kayıt sonradan gelirse (sayfa doğrudan açıldı) ya da başka yerden değişirse, elle değişiklik yoksa ekrana yazılır
  const recTitle = rec?.title || "";
  const recBody = rec?.body && rec.body !== rec.title ? rec.body : "";
  useEffect(() => {
    if (!rec) return;
    const s = saved.current;
    if (title === s.title && body === s.body && (recTitle !== s.title || recBody !== s.body)) {
      saved.current = { title: recTitle, body: recBody };
      setTitle(recTitle);
      setBody(recBody);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recTitle, recBody]);

  const state = useRef({});
  useLayoutEffect(() => {
    state.current = { id, title, body };
  });
  const save = useCallback(async () => {
    const { id: cur, title: t0, body: b0 } = state.current;
    const t = t0.trim();
    const b = b0.trim();
    if (t === saved.current.title.trim() && b === saved.current.body.trim()) return cur;
    if (!t && !b) return cur;
    saved.current = { title: t0, body: b0 };
    if (cur) {
      updateRecord("note", cur, { title: t || b.split("\n")[0].slice(0, 80), body: b || t }, by);
      return cur;
    }
    if (creating.current) return "";
    creating.current = true;
    const r = await saveDrafts([{ type: "note", title: t || b.split("\n")[0].slice(0, 80), body: b || t, cat: "Genel", assignees: [] }], { source: "manual", by });
    const nid = r?.ids?.[0]?.[1];
    if (nid) {
      setId(nid);
      window.history.replaceState(window.history.state, "", `/notes/${nid}`);
      return nid;
    }
    creating.current = false;
    return "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateRecord, saveDrafts]);

  // Uygulama arka plana geçince ve sayfadan çıkınca da kaydedilir
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && save();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      save();
    };
  }, [save]);

  if (id && !rec && notes.length) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <BackButton href="/notes" />
        <Empty icon="note" title="Not bulunamadı" />
      </main>
    );
  }

  const off = rec?.done || rec?.archived;
  const ro = lockedFor(rec, myUid, isStaff); // çalışana başkasının verdiği not: yalnız okunur, paylaşılır
  const meta = rec
    ? [rec.createdByUid ? (nameOf(rec.createdByUid) === "Sen" ? "Sen yazdın" : `${nameOf(rec.createdByUid) || "Başkası"} yazdı`) : "", stamp(rec.updatedAt || rec.createdAt), off ? (rec.done ? "Yapıldı" : "Arşivde") : ""]
      .filter(Boolean)
      .join(" · ")
    : "";
  const text = noteText({ title, body });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Not kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };
  const share = async () => {
    if (!text) return;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* vazgeçildi */
      }
    } else copy();
  };
  const done = async () => {
    const nid = await save();
    if (!nid) return router.push("/notes");
    updateRecord("note", nid, noteDonePatch(), by);
    navigator.vibrate?.(10);
    toast("Yapıldı, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("note", nid, noteReopenPatch(), by) } });
    router.push("/notes");
  };
  const set = (patch) => rec && updateRecord("note", rec.id, patch, by);
  const del = () => {
    setMenu(false);
    if (rec) removeWithUndo("note", rec.id);
    saved.current = { title, body }; // silinen not çıkarken yeniden yazılmasın
    router.push("/notes");
  };
  const assigned = rec?.assignees || [];
  const canAssign = !isStaff && members.length > 0 && !!rec;
  const whoNames = assigned.map((u) => nameOf(u)).filter(Boolean).join(", ");

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[30rem] flex-col px-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <header className="flex items-center">
        <BackButton href="/notes" />
      </header>

      <div className="flex-1 cursor-text pb-4 pt-4" onClick={(e) => e.target === e.currentTarget && bodyRef.current?.focus()}>
        <Grow
          value={title}
          onChange={(e) => setTitle(cap(e.target.value))}
          onBlur={save}
          readOnly={ro}
          placeholder="Başlık"
          autoCapitalize="sentences"
          enterKeyHint="next"
          autoFocus={!id}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), bodyRef.current?.focus())}
          className="text-[1.625rem] font-bold leading-tight tracking-[-.02em] text-fg placeholder:text-mut/60"
        />
        {meta && <p className="mt-1.5 truncate text-[0.8125rem] text-mut">{meta}</p>}
        <BodyArea value={body} onChange={setBody} onBlur={save} inputRef={bodyRef} readOnly={ro} />
      </div>

      <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5">
        <div className="mx-auto flex max-w-[30rem] gap-2">
          {ro ? null : off ? (
            <button type="button" onClick={() => set(noteReopenPatch())} data-press className={`${btn} flex-[1.4] border-acc bg-acc text-white`}>
              Notlara al
            </button>
          ) : (
            <>
              <button type="button" onClick={done} data-press className={`${btn} border-acc bg-acc text-white shadow-[0_2px_0_#075c70]`}>
                Yapıldı
              </button>
              <button type="button" onClick={() => rec && set({ pinned: !rec.pinned })} disabled={!rec} aria-pressed={!!rec?.pinned} data-press className={`${plain} ${rec?.pinned ? "!text-acc" : ""} disabled:opacity-40`}>
                {rec?.pinned ? "Sabitli" : "Sabitle"}
              </button>
            </>
          )}
          <button type="button" onClick={share} data-press className={plain}>
            Paylaş
          </button>
          {!ro && <button type="button" onClick={() => setMenu(true)} aria-label="Not ayarları" data-press className={`${plain} !flex-none w-[3.25rem]`}>
            ⋯
          </button>}
        </div>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Not ayarları">
        <div className="pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5 [&>*+*]:border-t [&>*+*]:border-line">
            {rec && (
              <div className="flex min-h-[3.5rem] items-center justify-between gap-3">
                <span className="text-[0.9375rem]">Renk</span>
                <span className="flex gap-2.5">
                  {NOTE_COLORS.map(([k, l, c]) => (
                    <button
                      key={k || "none"}
                      type="button"
                      aria-label={l}
                      aria-pressed={(rec.color || "") === k}
                      onClick={() => set({ color: k })}
                      className={`size-7 rounded-full border border-line ${(rec.color || "") === k ? "ring-2 ring-acc ring-offset-2 ring-offset-card" : ""}`}
                      style={{ background: c }}
                    />
                  ))}
                </span>
              </div>
            )}
            {canAssign && (
              <div>
                <button type="button" onClick={() => setWho(!who)} data-press="row" className="flex min-h-[3.5rem] w-full items-center justify-between gap-3 text-left">
                  <span className="text-[0.9375rem]">Sorumlu</span>
                  <span className="min-w-0 truncate text-[0.9375rem] font-semibold text-mut">{whoNames || "Genel"}</span>
                </button>
                {who && (
                  <div className="flex flex-wrap gap-1.5 pb-3">
                    {members.map((m) => {
                      const on = assigned.includes(m.uid);
                      return (
                        <button
                          key={m.uid}
                          type="button"
                          aria-pressed={on}
                          onClick={() => set({ assignees: on ? assigned.filter((u) => u !== m.uid) : [...assigned, m.uid] })}
                          className={`rounded-full border px-3 py-1.5 text-[0.875rem] font-semibold ${on ? "border-acc bg-acc text-white" : "border-line bg-card"}`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <button type="button" onClick={() => (copy(), setMenu(false))} data-press="row" className="flex min-h-[3.5rem] w-full items-center text-left text-[0.9375rem]">
              Kopyala
            </button>
            <Link href="/archive?t=note" className="flex min-h-[3.5rem] w-full items-center text-[0.9375rem]">
              Arşiv
            </Link>
          </div>
          {rec && (
            <button type="button" onClick={del} data-press className="mx-auto mt-4 block px-4 py-2 text-[0.9375rem] font-semibold text-rec">
              Notu sil
            </button>
          )}
        </div>
      </Sheet>
    </main>
  );
}

// Notun yazısı: geniş alan, boşsa "Yaz" yer tutucusu
function BodyArea({ value, onChange, onBlur, inputRef, readOnly }) {
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 240)}px`;
  }, [value, inputRef]);
  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      readOnly={readOnly}
      placeholder="Yaz"
      autoCapitalize="sentences"
      className="mt-4 block w-full resize-none overflow-hidden bg-transparent text-[1.0625rem] leading-relaxed text-fg/90 outline-none placeholder:text-mut/60"
    />
  );
}
