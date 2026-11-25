"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHesap } from "@/features/auth/useHesap";
import { ChatList } from "@/features/chat/ChatList";
import { ChatView } from "@/features/chat/ChatView";
import { ChatBlank } from "@/features/chat/ChatBlank";

// Mesajlar: /messages → sohbet listesi, /messages?c=<sohbet> → sohbet ekranı
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Messages />
    </Suspense>
  );
}

// Mac ve yatay iPad (sol menü, ≥64rem): iki bölme, solda sohbet listesi hep açık, sağda seçili sohbet; seçili değilken
// gruplar ve kişiler (ChatBlank). Sohbetin Bilgi'si sağda panel (ChatInfoPanel) (globals.css MESAJLAR).
// Telefonda ve dik iPad'de eskisi gibi ya liste ya sohbet (sohbet açıkken liste .chat-hide ile gizli).
// Sporcu tarafında (sporcu, öğrenci, veli; "Sporcu gibi gör" dahil) Mesajlar yok (Seyhun 2026-11-25): eski bildirim ya da
// bağlantıyla gelen ana sayfaya döner.
function Messages() {
  const c = useSearchParams().get("c") || "";
  const open = /^[\w-]{1,120}$/.test(c);
  const { side } = useHesap();
  const router = useRouter();
  useEffect(() => {
    if (side) router.replace("/");
  }, [side, router]);
  if (side) return null;
  return (
    <>
      <div className={`chat-pane ${open ? "chat-hide" : ""}`}>
        <ChatList />
      </div>
      {open ? (
        <ChatView key={c} cid={c} />
      ) : (
        <div className="chat-blank">
          <ChatBlank />
        </div>
      )}
    </>
  );
}
