"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { listTime } from "@/features/chat/bits";
import { isUnread } from "@/lib/inbox";

const SHOW = 4;

// Etiketten simge: sohbet, plan/özet, görev, not, para (fiş, fatura, aidat, banka maili), diğerleri zil
function iconOf(tag = "") {
  if (/chat/.test(tag)) return "chat";
  if (/plan|summary|evening|weekly|wind/.test(tag)) return "cal";
  if (/task/.test(tag)) return "task";
  if (/note/.test(tag)) return "note";
  if (/pay|paid|inv|dues|mail/.test(tag)) return "receipt";
  return "bell";
}

// "Bildirimler": telefona gönderilen bildirimlerden okunmamışlar (users/{uid}.inbox, lib/inbox). Simgedeki sayı bu listenin
// sayısıdır. Ana sayfa görülünce hepsi okundu sayılır (inboxSeen), sayı sıfırlanır; liste bu ziyaret boyunca ekranda kalır.
// Okunmamış yoksa kart görünmez. "Tümü" son 30 bildirimi gösterir.
export function Notifications() {
  const { profile } = useAuth();
  const router = useRouter();
  const uid = profile?.uid;
  const inbox = Array.isArray(profile?.inbox) ? profile.inbox : [];
  const seen = profile?.inboxSeen || "";
  // Bu ziyarette "yeni" sayılanlar: sayfa açıldığında okunmamış olanlar (okundu yazılınca kaybolmasın)
  const [since, setSince] = useState(null);
  const [all, setAll] = useState(false);
  if (profile && since === null) setSince(seen); // ilk çizimde bir kez (React: çizim sırasında durum düzeltme)
  // Uygulama arka plana geçince: döndüğünde yalnız bu arada gelenler yeni görünsün
  const seenRef = useRef(seen);
  useEffect(() => {
    seenRef.current = seen;
  }, [seen]);
  useEffect(() => {
    const on = () => document.visibilityState === "hidden" && setSince(seenRef.current);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // Görüldü: okunmamış varsa ve sayfa ekrandaysa kısa süre sonra okundu yazılır (simgedeki sayı sıfırlanır)
  const newest = inbox[0]?.at || "";
  const unread = !!newest && isUnread(inbox[0], seen);
  useEffect(() => {
    if (!uid || !unread) return;
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") updateDoc(doc(db, "users", uid), { inboxSeen: newest }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [uid, unread, newest]);

  if (since === null) return null;
  const fresh = inbox.filter((x) => isUnread(x, since));
  if (!fresh.length) return null;
  const list = all ? inbox : fresh.slice(0, SHOW);
  const more = all ? 0 : inbox.length - list.length;

  return (
    <section aria-label="Bildirimler">
      <div className="mb-2.5 flex items-baseline justify-between px-1">
        <span className="text-[0.75rem] font-bold tracking-[.08em] text-mut">BİLDİRİMLER · {fresh.length}</span>
        <span className="flex gap-4">
          {(more > 0 || all) && (
            <button type="button" onClick={() => setAll((v) => !v)} className="text-[0.8125rem] font-semibold text-acc">
              {all ? "Daha az" : `Tümü · ${inbox.length}`}
            </button>
          )}
          <button type="button" onClick={() => (setSince(newest), setAll(false))} className="text-[0.8125rem] font-semibold text-mut">
            Kapat
          </button>
        </span>
      </div>
      <ul className="overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
        {list.map((x, i) => {
          const isNew = isUnread(x, since);
          return (
            <li key={x.id || `${x.tag}-${x.at}`}>
              <button
                type="button"
                onClick={() => x.url && x.url !== "/" && router.push(x.url)}
                className="flex w-full items-center gap-3 bg-card pl-3.5 pr-3 text-left transition active:bg-bg"
              >
                <span className={`my-2.5 grid size-10 shrink-0 place-items-center rounded-full ${isNew ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
                  <Icon name={iconOf(x.tag)} className="size-5" />
                </span>
                <span className={`min-w-0 flex-1 self-stretch py-2.5 ${i ? "border-t border-line/80" : ""}`}>
                  <span className="flex items-baseline gap-2">
                    <b className={`min-w-0 flex-1 truncate text-[0.9375rem] leading-snug ${isNew ? "font-semibold" : "font-normal text-mut"}`}>{x.title || x.body}</b>
                    <time className="shrink-0 text-[0.75rem] tabular-nums text-mut">{listTime(x.at)}</time>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] leading-snug text-mut">{x.title ? x.body : ""}</span>
                    {isNew && <span className="size-2.5 shrink-0 rounded-full bg-acc" aria-label="yeni" />}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
