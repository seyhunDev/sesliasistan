"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { money } from "@/lib/bankSheet";
import { db } from "@/lib/firebase/clientApp";
import { previewOf } from "@/lib/mailBoard";
import { todayIn } from "@/lib/notifyText";

const localDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(iso));
const hm = (iso) => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const SHOW = 3;

// Ana sayfada bugün gelen mailler (yalnızca ana hesap, yalnızca bugün; bugün mail yoksa kart görünmez).
// Satır: gönderen, saat, hesap özetiyse bakiye (değilse konu). Dokununca Mailler sayfası.
export function TodayMails() {
  const { profile } = useAuth();
  const owner = profile?.role === "owner";
  const [mails, setMails] = useState([]);

  useEffect(() => {
    if (!owner) return;
    return onSnapshot(
      query(collection(db, "orgs", profile.uid, "mails"), orderBy("at", "desc"), limit(20)),
      (s) => setMails(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMails([]),
    );
  }, [owner, profile?.uid]);

  const today = todayIn();
  const list = mails.filter((m) => m.at && localDate(m.at) === today);
  if (!owner || !list.length) return null;

  return (
    <section className="fade-in overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]" aria-label="Bugün gelen mailler">
      <Link href="/mail" className="flex h-12 items-center gap-2.5 pl-4 pr-3 active:bg-bg">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-acc/10 text-acc">
          <Icon name="mail" className="size-[1.125rem]" />
        </span>
        <b className="min-w-0 flex-1 truncate text-[1rem] font-semibold tracking-tight">Bugün gelen mailler</b>
        <span className="shrink-0 rounded-full bg-acc/10 px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums text-acc">{list.length}</span>
        <Icon name="chev" className="size-4 shrink-0 text-mut" />
      </Link>
      <ul className="divide-y divide-line border-t border-line">
        {list.slice(0, SHOW).map((m) => (
          <li key={m.id}>
            <Link href="/mail" className="flex h-14 items-center gap-3 px-4 active:bg-bg">
              <time className="w-[2.75rem] shrink-0 text-[0.875rem] font-semibold tabular-nums text-acc">{hm(m.at)}</time>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-medium">{m.rule || m.fromName || m.from}</b>
                <small className="block truncate text-[0.75rem] text-mut">{m.sheets?.length ? previewOf(m, money) : m.subject || previewOf(m, money) || "Mail"}</small>
              </span>
              {m.sheets?.length > 0 && <Icon name="wallet" className="size-[1.125rem] shrink-0 text-mut" />}
            </Link>
          </li>
        ))}
      </ul>
      {list.length > SHOW && (
        <Link href="/mail" className="flex h-10 items-center border-t border-line px-4 text-[0.8125rem] font-semibold text-acc active:bg-bg">
          +{list.length - SHOW} mail daha
        </Link>
      )}
    </section>
  );
}
