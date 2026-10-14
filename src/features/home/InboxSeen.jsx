"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { inboxSeeOne } from "@/lib/inbox";

// Zildeki bildirimin işi başka yoldan açılınca (sohbeti Mesajlar'dan okumak, kaydı listeden açmak, gittiği sayfaya gitmek)
// o bildirim de görüldü olur, zil ve simge sayısı düşer. Önce eldeki listeye bakılır: eşleşen okunmamış yoksa yazma yapılmaz.
// Olay: window "sa-inbox-seen" { tag?, id? } (ChatView sohbet okununca, AddSheet kayıt açılınca); sayfa değişince yol + sorgu.
export function seeInbox(match) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sa-inbox-seen", { detail: match }));
}

export function InboxSeen() {
  const { profile } = useAuth();
  const path = usePathname();
  const live = useRef(null);
  const pending = useRef([]); // profil gelmeden gelen istekler

  useEffect(() => {
    const mark = (match) => {
      const p = live.current;
      if (!p?.uid) return void pending.current.push(match);
      if (inboxSeeOne(p.inbox, match, p.inboxSeen || "") === p.inbox) return;
      const ref = doc(db, "users", p.uid);
      runTransaction(db, async (t) => {
        const u = (await t.get(ref)).data() || {};
        const inbox = inboxSeeOne(u.inbox, match, u.inboxSeen || "");
        if (inbox !== u.inbox) t.update(ref, { inbox });
      }).catch(() => {});
    };
    const on = (e) => e.detail && mark(e.detail);
    window.addEventListener("sa-inbox-seen", on);
    return () => window.removeEventListener("sa-inbox-seen", on);
  }, []);

  // Profil değişince son hâli saklanır; bekleyen istekler yeniden denenir
  useEffect(() => {
    live.current = profile;
    if (!profile?.uid || !pending.current.length) return;
    const list = pending.current;
    pending.current = [];
    list.forEach(seeInbox);
  }, [profile]);

  // Sayfa değişince: bildirimin gittiği sayfa açıldıysa görüldü
  useEffect(() => {
    seeInbox({ here: window.location.pathname + window.location.search });
  }, [path]);
  return null;
}
