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
import { NOTE_COLORS, NOTE_GONE, noteColor, noteDonePatch, noteReopenPatch, noteText } from "@/lib/noteState";
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
// ilk yazıyla kayıt oluşur. Yeni tasarım (Seyhun 2026-10-23 "Yap"): başlık lacivert üstte, sağ üstte renk ve ⋯ (Not ayarları:
// renk, sorumlu, kopyala, arşiv, sil); yazı altta. Altta sabit: Sabitle, Paylaş, Tamamla. Tamamla: halka yeşil dolar, tik çizilir,
// başlığın üstü çizilir; sonra liste açılır, not satırı kayarak çıkar (NOTE_GONE), "Geri al".
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
  const [finishing, setFinishing] = useState(false); // Tamamla animasyonu
  const saved = useRef({ title: rec?.title || "", body: rec?.body && rec.body !== rec.title ? rec.body : "" });
  const creating = useRef(null); // yeni notun yazılma sözü (Promise)
  const alive = useRef(true);
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
    if (!cur && creating.current) return creating.current; // yeni not yazılıyor: aynı yazmayı bekle
    const t = t0.trim();
    const b = b0.trim();
    if (t === saved.current.title.trim() && b === saved.current.body.trim()) return cur;
    if (!t && !b) return cur;
    saved.current = { title: t0, body: b0 };
    if (cur) {
      updateRecord("note", cur, { title: t || b.split("\n")[0].slice(0, 80), body: b || t }, by);
      return cur;
    }
    // Yeni not bir kez yazılır: alandan çıkış (blur) ile Yapıldı aynı anda kaydederse ikincisi aynı yazmayı bekler
    creating.current = saveDrafts([{ type: "note", title: t || b.split("\n")[0].slice(0, 80), body: b || t, cat: "Genel", assignees: [] }], { source: "manual", by }).then((r) => {
      const nid = r?.ids?.[0]?.[1] || "";
      if (!nid) {
        creating.current = null;
        return "";
      }
      state.current.id = nid;
      if (alive.current) {
        setId(nid);
        window.history.replaceState(window.history.state, "", `/notes/${nid}`);
      }
      const { title: t1, body: b1 } = state.current; // yazılırken eklenen harfler
      if (t1 !== t0 || b1 !== b0) {
        saved.current = { title: t1, body: b1 };
        updateRecord("note", nid, { title: t1.trim() || b1.trim().split("\n")[0].slice(0, 80), body: b1.trim() || t1.trim() }, by);
      }
      return nid;
    });
    return creating.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateRecord, saveDrafts]);

  // Uygulama arka plana geçince ve sayfadan çıkınca da kaydedilir
  useEffect(() => {
    alive.current = true;
    const onHide = () => document.visibilityState === "hidden" && save();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      alive.current = false;
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
    if (finishing) return;
    document.activeElement?.blur?.();
    setFinishing(true);
    navigator.vibrate?.(10);
    const [nid] = await Promise.all([save(), new Promise((r) => setTimeout(r, 850))]);
    // replace: geri gelince biten not yeniden açılmasın
    if (!nid) return router.replace("/notes");
    updateRecord("note", nid, noteDonePatch(), by);
    try {
      sessionStorage.setItem(NOTE_GONE, nid); // listede bu satır kayarak çıkar
    } catch {
      /* saklanamadı: satır hemen kaybolur */
    }
    toast("Yapıldı, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("note", nid, noteReopenPatch(), by) } });
    router.replace("/notes");
  };
  const set = (patch) => rec && updateRecord("note", rec.id, patch, by);
  const del = () => {
    setMenu(false);
    if (rec) removeWithUndo("note", rec.id);
    saved.current = { title, body }; // silinen not çıkarken yeniden yazılmasın
    router.replace("/notes");
  };
  const assigned = rec?.assignees || [];
  const canAssign = !isStaff && members.length > 0 && !!rec;
  const whoNames = assigned.map((u) => nameOf(u)).filter(Boolean).join(", ");

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[30rem] flex-col px-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-10 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Not">
        <header className="flex items-center gap-2.5">
          <BackButton href="/notes" />
          <span className="flex-1" />
          {rec && !ro && (
            <>
              <button type="button" onClick={() => setMenu(true)} aria-label="Renk" data-press className="btn btn-round">
                <span className="size-3.5 rounded-full" style={{ background: rec.color ? noteColor(rec) : "rgba(255,255,255,.35)" }} />
              </button>
              <button type="button" onClick={() => setMenu(true)} aria-label="Not ayarları" data-press className="btn btn-round text-[1.125rem] font-bold leading-none">
                ⋯
              </button>
            </>
          )}
        </header>
        <Grow
          value={title}
          onChange={(e) => setTitle(cap(e.target.value))}
          onBlur={save}
          readOnly={ro || finishing}
          placeholder="Başlık"
          autoCapitalize="sentences"
          enterKeyHint="next"
          autoFocus={!id}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), bodyRef.current?.focus())}
          className={`mt-4 !text-[1.625rem] font-bold leading-tight tracking-[-.02em] text-white placeholder:text-white/40 ${finishing ? "note-strike" : ""}`}
        />
        {meta && <p className="mt-1.5 truncate text-[0.8125rem] font-semibold text-white/60">{meta}</p>}
      </section>

      <div className="relative -mx-5 -mt-6 flex-1 cursor-text rounded-t-[1.75rem] bg-bg px-5 pt-5" onClick={(e) => e.target === e.currentTarget && bodyRef.current?.focus()}>
        <div className={finishing ? "opacity-35 transition-opacity duration-300" : ""}>
          <BodyArea value={body} onChange={setBody} onBlur={save} inputRef={bodyRef} readOnly={ro || finishing} />
        </div>
        {finishing && (
          <div className="pointer-events-none absolute inset-x-0 top-24 flex flex-col items-center gap-2.5" aria-live="polite">
            <span className="note-burst grid size-24 place-items-center rounded-full bg-ok">
              <svg viewBox="0 0 24 24" className="size-12" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" className="note-check" />
              </svg>
            </span>
            <b className="text-[1.125rem] font-bold text-ok">Yapıldı</b>
          </div>
        )}
      </div>

      <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5">
        <div className={`mx-auto flex max-w-[30rem] gap-2 ${finishing ? "pointer-events-none" : ""}`}>
          {!ro && !off && (
            <button type="button" onClick={() => rec && set({ pinned: !rec.pinned })} disabled={!rec || finishing} aria-pressed={!!rec?.pinned} data-press className={`${plain} ${rec?.pinned ? "!text-acc" : ""} disabled:opacity-40`}>
              {rec?.pinned ? "Sabitli" : "Sabitle"}
            </button>
          )}
          <button type="button" onClick={share} disabled={finishing} data-press className={`${plain} disabled:opacity-40`}>
            Paylaş
          </button>
          {ro ? null : off ? (
            <button type="button" onClick={() => set(noteReopenPatch())} data-press className={`${btn} flex-[1.6] border-acc bg-acc text-white shadow-[0_2px_0_#075c70]`}>
              Notlara al
            </button>
          ) : (
            <button
              type="button"
              onClick={done}
              data-press
              className={`${btn} flex flex-[1.6] items-center justify-center gap-2 text-white transition-colors duration-300 ${finishing ? "border-ok bg-ok shadow-[0_2px_0_#356b4b]" : "border-acc bg-acc shadow-[0_2px_0_#075c70]"}`}
            >
              {finishing ? (
                <span className="note-burst grid size-[1.375rem] place-items-center rounded-full bg-white text-ok">
                  <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" className="note-check" />
                  </svg>
                </span>
              ) : (
                <span className="size-[1.375rem] rounded-full border-2 border-white/90" aria-hidden="true" />
              )}
              {finishing ? "Yapıldı" : "Tamamla"}
            </button>
          )}
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
      className="block w-full resize-none overflow-hidden bg-transparent !text-[1.0625rem] leading-relaxed text-fg/90 outline-none placeholder:text-mut/60"
    />
  );
}
